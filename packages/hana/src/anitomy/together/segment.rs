// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

//! Per-file path segmentation: strip a real directory prefix so a record
//! describes the file, not the folder.
//!
//! Recognizes both `/` and `\` on every platform; `std::path` is avoided since
//! the input may be a path from a different OS than the host.

use std::collections::HashMap;

use crate::anitomy::element::{Element, ElementKind};
use crate::anitomy::options::Options;

struct ParseMemo {
    options: Options,
    hits: HashMap<String, Vec<Element>>,
}

impl ParseMemo {
    fn new(options: Options) -> Self {
        Self {
            options,
            hits: HashMap::new(),
        }
    }

    fn parse(&mut self, input: &str) -> Vec<Element> {
        if let Some(hit) = self.hits.get(input) {
            return hit.clone();
        }
        let parsed = crate::anitomy::parse(input, self.options);
        self.hits.insert(input.to_string(), parsed.clone());
        parsed
    }
}

/// Re-parse the filename component as authoritative, borrowing a missing title
/// or season from the directory components; inputs with no directory prefix are
/// unchanged.
pub(crate) fn parse_one(input: &str, options: Options) -> Vec<Element> {
    let chars: Vec<char> = input.chars().collect();
    let mut memo = ParseMemo::new(options);

    let Some(dir_end) = directory_boundary(&chars, &mut memo) else {
        return memo.parse(input);
    };
    let Some(tail) = chars.get(dir_end..) else {
        return memo.parse(input);
    };
    let filename: String = tail.iter().collect();

    let mut elements = memo.parse(&filename);
    for element in &mut elements {
        element.position = element.position.saturating_add(dir_end);
    }

    borrow_from_ancestors(&mut elements, &chars, dir_end.saturating_sub(1), &mut memo);

    elements
}

fn borrow_from_ancestors(
    elements: &mut Vec<Element>,
    chars: &[char],
    dir_last: usize,
    memo: &mut ParseMemo,
) {
    let mut want_title = !elements.iter().any(|e| e.kind == ElementKind::Title);
    let mut want_season =
        memo.options.parse_season && !elements.iter().any(|e| e.kind == ElementKind::Season);

    let mut borrowed = false;
    for (start, end) in ancestor_components(chars, dir_last) {
        if !want_title && !want_season {
            break;
        }
        let Some(component) = chars.get(start..end) else {
            continue;
        };
        if !want_title && !is_season_folder(component) {
            continue;
        }
        let component_input: String = component.iter().collect();
        for element in memo.parse(&component_input) {
            match element.kind {
                ElementKind::Title if want_title => want_title = false,
                ElementKind::Season if want_season => want_season = false,
                _ => continue,
            }
            elements.push(Element {
                position: element.position.saturating_add(start),
                ..element
            });
            borrowed = true;
        }
    }

    if borrowed {
        elements.sort_by_key(|e| e.position);
    }
}

fn is_season_folder(component: &[char]) -> bool {
    use crate::anitomy::detail::bracket::{is_close_bracket, is_open_bracket};

    component.iter().any(char::is_ascii_digit)
        && !component
            .iter()
            .any(|&c| is_open_bracket(c) || is_close_bracket(c))
}

fn ancestor_components(chars: &[char], mut end: usize) -> Vec<(usize, usize)> {
    let mut bounds = Vec::new();
    loop {
        let start = chars
            .get(..end)
            .and_then(|s| s.iter().rposition(|&c| is_path_separator(c)))
            .map_or(0, |i| i.saturating_add(1));
        if start < end {
            bounds.push((start, end));
        }
        if start == 0 {
            return bounds;
        }
        end = start.saturating_sub(1);
    }
}

fn directory_boundary(chars: &[char], memo: &mut ParseMemo) -> Option<usize> {
    if has_absolute_windows_prefix(chars) {
        return chars
            .iter()
            .rposition(|&c| is_path_separator(c))
            .map(|i| i.saturating_add(1));
    }

    if !chars.iter().any(|&c| is_path_separator(c)) {
        return None;
    }

    for i in (0..chars.len()).rev() {
        if !chars.get(i).is_some_and(|&c| is_path_separator(c)) {
            continue;
        }
        let prefix = chars.get(..i).unwrap_or_default();
        let tail = chars.get(i.saturating_add(1)..).unwrap_or_default();
        let tail_input: String = tail.iter().collect();
        let tail_elements = memo.parse(&tail_input);

        if looks_like_filename(&tail_elements, prefix, memo)
            && !continues_a_title(&tail_elements, chars, i, prefix, memo)
        {
            return Some(i.saturating_add(1));
        }
    }
    None
}

fn continues_a_title(
    tail_elements: &[Element],
    chars: &[char],
    sep: usize,
    prefix: &[char],
    memo: &mut ParseMemo,
) -> bool {
    let Some(tail_title) = tail_elements.iter().find(|e| e.kind == ElementKind::Title) else {
        return false;
    };
    if tail_title.position != 0 {
        return false;
    }
    let Some(separator) = chars.get(sep) else {
        return false;
    };

    let component_start = prefix
        .iter()
        .rposition(|&c| is_path_separator(c))
        .map_or(0, |i| i.saturating_add(1));
    let component: &[char] = prefix.get(component_start..).unwrap_or_default();

    let whole: String = chars.iter().collect();
    let whole_elements = memo.parse(&whole);
    if !whole_elements
        .iter()
        .any(|e| e.kind == ElementKind::Episode)
    {
        return false;
    }
    let Some(whole_title) = whole_elements.iter().find(|e| e.kind == ElementKind::Title) else {
        return false;
    };

    let Some(expected) = whole_title
        .value
        .strip_suffix(&format!("{separator}{}", tail_title.value))
    else {
        return false;
    };

    if expected == tail_title.value {
        return false;
    }

    let component_input: String = component.iter().collect();
    memo.parse(&component_input)
        .iter()
        .any(|e| e.kind == ElementKind::Title && e.value == expected)
}

fn looks_like_filename(elements: &[Element], prefix: &[char], memo: &mut ParseMemo) -> bool {
    if elements.iter().any(|e| is_release_descriptor(e.kind)) {
        return true;
    }

    let Some(tail_title) = elements.iter().find(|e| e.kind == ElementKind::Title) else {
        return true;
    };

    echoes_an_ancestor(&tail_title.value, prefix, memo)
}

fn echoes_an_ancestor(title: &str, prefix: &[char], memo: &mut ParseMemo) -> bool {
    ancestor_components(prefix, prefix.len())
        .into_iter()
        .filter_map(|(start, end)| prefix.get(start..end))
        .any(|component| {
            let component_input: String = component.iter().collect();
            memo.parse(&component_input)
                .iter()
                .any(|e| e.kind == ElementKind::Title && same_title(&e.value, title))
        })
}

fn same_title(a: &str, b: &str) -> bool {
    let words = |s: &str| -> Vec<String> {
        s.split(|c: char| !c.is_alphanumeric())
            .filter(|w| !w.is_empty())
            .map(str::to_lowercase)
            .collect()
    };
    words(a) == words(b)
}

fn is_release_descriptor(kind: ElementKind) -> bool {
    !matches!(
        kind,
        ElementKind::Title
            | ElementKind::Episode
            | ElementKind::EpisodeTitle
            | ElementKind::FileExtension
    )
}

fn is_path_separator(c: char) -> bool {
    matches!(c, '/' | '\\')
}

fn has_absolute_windows_prefix(chars: &[char]) -> bool {
    let unc = matches!((chars.first(), chars.get(1)), (Some('\\'), Some('\\')));
    let drive = matches!(
        (chars.first(), chars.get(1), chars.get(2)),
        (Some(c), Some(':'), Some(sep)) if c.is_ascii_alphabetic() && is_path_separator(*sep)
    );
    unc || drive
}
