// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

//! Beyond-upstream repairs. The header-faithful parser order lives in
//! `parser.rs`; this module holds the extra passes that no C++ Anitomy has.

use crate::anitomy::detail::token::Token;
use crate::anitomy::element::{Element, ElementKind};
use crate::anitomy::options::Options;

pub(super) fn merge_regional_languages(tokens: &mut [Token], elements: &mut [Element]) {
    use crate::anitomy::detail::keyword::is_language_code;
    use crate::anitomy::detail::token::{is_dash_token, TokenKind};

    for i in 0..tokens.len() {
        let Some(base) = tokens.get(i) else { continue };
        if base.element_kind != Some(ElementKind::Language) || !is_language_code(base.value) {
            continue;
        }
        let position = base.position;

        let Some(dash) = tokens.get(i + 1).filter(|t| is_dash_token(t)) else {
            continue;
        };
        let dash_value = dash.value;
        let Some(region) = tokens.get(i + 2) else {
            continue;
        };
        if region.kind != TokenKind::Text
            || region.element_kind.is_some()
            || region.value.len() != 2
            || !region.value.bytes().all(|b| b.is_ascii_alphabetic())
        {
            continue;
        }
        let region_value = region.value;

        if let Some(e) = elements
            .iter_mut()
            .find(|e| e.kind == ElementKind::Language && e.position == position)
        {
            e.value = format!("{}{dash_value}{region_value}", e.value);
            if let Some(region) = tokens.get_mut(i + 2) {
                region.element_kind = Some(ElementKind::Language);
            }
        }
    }
}

pub(super) fn after_parse(tokens: &[Token], elements: &mut Vec<Element>, options: &Options) {
    let contains =
        |elements: &[Element], kind: ElementKind| elements.iter().any(|e| e.kind == kind);

    if options.parse_episode
        && !contains(elements, ElementKind::Episode)
        && contains(elements, ElementKind::Title)
    {
        let unenclosed_at = |pos: usize| tokens.iter().any(|t| t.position == pos && !t.is_enclosed);
        if let Some(e) = elements.iter_mut().find(|e| {
            e.kind == ElementKind::VideoResolution
                && e.value.chars().all(|c| c.is_ascii_digit())
                && unenclosed_at(e.position)
        }) {
            e.kind = ElementKind::Episode;
        }
    }

    dedupe_zero_padded(elements, ElementKind::Episode);
    dedupe_zero_padded(elements, ElementKind::Season);
    detect_content_bundle(tokens, elements);
    drop_in_title_types(tokens, elements);
}

fn drop_in_title_types(tokens: &[Token], elements: &mut Vec<Element>) {
    use crate::anitomy::detail::element::underscore_is_separator;
    use crate::anitomy::detail::keyword::KeywordKind;

    if !elements.iter().any(|e| e.kind == ElementKind::Type) {
        return;
    }

    let ambiguous_type_at = |position: usize| {
        tokens.iter().position(|t| {
            t.position == position
                && t.keyword
                    .is_some_and(|k| k.ambiguous && k.kind == KeywordKind::EpisodeType)
        })
    };

    let underscore_separator = underscore_is_separator(tokens);
    let last_title = tokens.iter().rposition(|t| {
        t.element_kind == Some(ElementKind::Title)
            && !crate::anitomy::detail::token::is_delimiter_token(t)
    });

    elements.retain(|e| {
        if e.kind != ElementKind::Type {
            return true;
        }
        let Some(i) = ambiguous_type_at(e.position) else {
            return true;
        };
        let interior_to_title = last_title.is_some_and(|last| {
            i < last
                && tokens
                    .get(i)
                    .is_some_and(|t| t.element_kind == Some(ElementKind::Title))
        });
        !interior_to_title && !is_word_glued(tokens, i, underscore_separator)
    });
}

fn is_word_glued(tokens: &[Token], i: usize, underscore_separator: bool) -> bool {
    use crate::anitomy::detail::delimiter::is_space;
    use crate::anitomy::detail::token::{is_delimiter_token, TokenKind};

    let separates = |t: &Token| {
        t.value
            .chars()
            .next()
            .is_some_and(|c| is_space(c) || (c == '_' && underscore_separator))
    };
    let is_prose = |t: &Token| {
        matches!(t.kind, TokenKind::Text | TokenKind::Keyword)
            && matches!(
                t.element_kind,
                None | Some(ElementKind::Title) | Some(ElementKind::EpisodeTitle)
            )
    };

    let glued = |delimiter: Option<&Token>, beyond: Option<&Token>| {
        delimiter.is_some_and(|d| is_delimiter_token(d) && !separates(d))
            && beyond.is_some_and(is_prose)
    };

    glued(tokens.get(i.wrapping_sub(1)), tokens.get(i.wrapping_sub(2)))
        || glued(tokens.get(i + 1), tokens.get(i + 2))
}

fn detect_content_bundle(tokens: &[Token], elements: &mut Vec<Element>) {
    use crate::anitomy::detail::token::{is_delimiter_token, is_open_bracket_token};

    let is_content = |kind: Option<ElementKind>| {
        matches!(
            kind,
            Some(ElementKind::Season) | Some(ElementKind::Episode) | Some(ElementKind::Type)
        )
    };
    let content_side = |range: &mut dyn Iterator<Item = usize>| {
        for j in range {
            match tokens.get(j) {
                Some(t) if is_open_bracket_token(t) || is_delimiter_token(t) => {
                    if is_open_bracket_token(t) {
                        return false;
                    }
                }
                Some(t) => return is_content(t.element_kind),
                None => return false,
            }
        }
        false
    };

    let mut batch_position: Option<usize> = None;
    for (i, plus) in tokens.iter().enumerate() {
        if !(is_delimiter_token(plus) && plus.value == "+" && plus.is_enclosed) {
            continue;
        }
        if content_side(&mut (0..i).rev()) && content_side(&mut (i + 1..tokens.len())) {
            batch_position = Some(plus.position);
            break;
        }
    }

    let Some(position) = batch_position else {
        return;
    };
    let has_batch = elements.iter().any(|e| {
        e.kind == ElementKind::ReleaseInformation && e.value.eq_ignore_ascii_case("Batch")
    });
    if !has_batch {
        elements.push(Element {
            kind: ElementKind::ReleaseInformation,
            value: "Batch".to_string(),
            position,
        });
    }
}

fn canonical_int(value: &str) -> Option<u64> {
    if value.is_empty() || !value.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    value.parse().ok()
}

fn dedupe_zero_padded(elements: &mut Vec<Element>, kind: ElementKind) {
    use std::collections::HashMap;

    let mut best: HashMap<u64, usize> = HashMap::new();
    let mut drop = vec![false; elements.len()];
    let mut any_dropped = false;
    for (i, e) in elements.iter().enumerate() {
        if e.kind != kind {
            continue;
        }
        let Some(n) = canonical_int(&e.value) else {
            continue;
        };
        match best.get(&n).copied() {
            None => {
                best.insert(n, i);
            }
            Some(prev) => {
                let keep_new = elements.get(prev).is_some_and(|prev_e| {
                    (e.value.len(), e.position) < (prev_e.value.len(), prev_e.position)
                });
                let dropped = if keep_new {
                    best.insert(n, i);
                    prev
                } else {
                    i
                };
                if let Some(slot) = drop.get_mut(dropped) {
                    *slot = true;
                    any_dropped = true;
                }
            }
        }
    }
    if !any_dropped {
        return;
    }
    let mut i = 0;
    elements.retain(|_| {
        let keep = !drop.get(i).copied().unwrap_or(false);
        i += 1;
        keep
    });
}
