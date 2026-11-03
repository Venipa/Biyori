# Agent team

Fixed team for multi-area work. Spawn each member once per session and keep it alive with SendMessage.

## Members

| Member | Owns | Knows |
|---|---|---|
| main | `apps/biyori/src/main/track/*`, `apps/biyori/src/main/router/*`, `apps/biyori/src/main/services/*`, `apps/biyori/src/main/db/*`, `apps/biyori/src/lib/*` (shared schemas, pure helpers + tests), `packages/recognition`, `packages/hana` (read; Rust changes only when asked) | sqlite via drizzle, hana scan/identify, candidate cache (`track/match.ts`), `notifyLibraryIndex`, app settings schema |
| renderer | `apps/biyori/src/renderer/src/**`, `packages/translations/locales/*` | TanStack Router conventions (route file = config, page in `components/app/<feature>/page.tsx`, `tsr generate`), shadcn-on-base-ui kit in `components/ui`, `useAppLiveSync` invalidation, `trpc` client |
| orchestrator | shared contracts, `routeTree.gen.ts`, drizzle migrations, electron config, anything unowned | runs checks, commits |

Reviewers are spawned fresh each round, read-only:
- Triage A (main areas) / Triage B (renderer areas): mark findings DO/SKIP against the code.
- QA A (data/API) / QA B (UI): read `git diff` + untracked files, report CONFIRMED issues only.

## House rules

- Read `.claude/context/*.md` and `.rules.md` first. Ponytail applies: smallest complete change, no extra options.
- Validate IPC inputs with zod in the router; bound SQL only; paths from the renderer must be checked against library roots.
- Reuse `components/ui` and `components/app/shared`; no native controls; no new dependencies.
- Tests only for parsing/matching and non-trivial logic (`*.test.ts` next to source, `bun test`).
- Tabs, biome, JSX attrs single quotes. Commits: one-line conventional subject, signed, no attribution.
- Members never commit; the orchestrator commits per area.

## Checks between rounds

```
bun run typecheck
bun test
bunx biome check .
```
