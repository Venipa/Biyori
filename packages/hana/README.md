# Hana

Native worker/core for [Biyori](../../apps/biyori). Rust N-API addon for Anitomy filename parsing, library scanning, and now-playing detection.

## Current platforms supported

- [x] Windows
- [ ] macOS (parse/scan; now playing not implemented)
- [ ] Linux (parse/scan; now playing not implemented)

Parse, scan, and find-episode work on all targets. `nowPlaying` is Windows-only today; other platforms compile and return `null`.

## API

| Method | Description |
| --- | --- |
| `parse` | Parse a release name or file path |
| `parseTogether` | Batch parse |
| `scan` | Walk library roots and match AniList candidates |
| `findEpisode` | Resolve an episode file inside a show folder |
| `nowPlaying` | Detect the active media player window |

Types and exports: `dist/index.d.ts`.

## Development

To build and test Hana locally, install:

- [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/)

From the repo root:

```bash
bun install
bun run --cwd packages/hana build
bun run --cwd packages/hana test
```

Release native build:

```bash
bun run --cwd packages/hana build:release
```

`apps/biyori` runs the debug build during `dev` (`build:hana`) and the release build for Windows packaging.
