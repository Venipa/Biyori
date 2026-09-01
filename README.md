# Biyori

<p align="left">
  <img src="apps/biyori/build/icon.png" alt="Biyori app icon" width="128" height="128" />
</p>

Desktop anime tracker for AniList lists, local library scanning, playback matching, torrent RSS, Discord presence, and a local now-playing HTTP endpoint.

Docs: [venipa.github.io/Biyori](https://venipa.github.io/Biyori) (or `bun run docs:dev` locally).

## Features

- AniList sync (lists, progress, OAuth)
- Library scan with filename parse and title matching (Hana native core)
- Now playing detection and optional HTTP endpoint
- Torrent RSS feeds
- Discord Rich Presence
- Activity center and sharing helpers

## Requirements

- [Bun](https://bun.sh/) 1.4+
- Node.js 24.x (Electron toolchain)
- Rust (Hana native addon; required for Windows dev/pack)

## Project setup

Monorepo (bun workspaces). Main app: `apps/biyori`.

```bash
bun install
bun run dev
```

## Workspace layout

| Path | Package |
| --- | --- |
| `apps/biyori` | Electron app |
| `apps/docs` | Fumadocs site |
| `packages/hana` | Native worker/core |
| `packages/recognition` | Title matching |
| `packages/worker` | Main-process worker runtime |
| `packages/electron-trpc` | tRPC IPC bridge |
| `packages/logger` | Shared logging |
| `packages/parser` | Torrent/name parsing |

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Dev Electron app (builds Hana debug first) |
| `bun run build` | Typecheck + electron-vite production build |
| `bun run release:compile` | Compile app without packaging |
| `bun run release:pack:win` | Windows NSIS installer |
| `bun run typecheck` | Typecheck app packages |
| `bun run docs:dev` | Docs site on http://localhost:3000 |
| `bun run docs:build:pages` | Static docs for GitHub Pages |

App-only scripts live under `apps/biyori` (`build:win`, `db:generate`, etc.). See [build docs](apps/docs/content/docs/build.mdx).

## Packaging

```bash
bun run release:compile
bun run --cwd apps/biyori release:pack:win
```

CI (`.github/workflows/release.yml`) compiles once, then packs Windows with electron-builder.

## License

Apache-2.0. See `LICENSE` in the repository root.
