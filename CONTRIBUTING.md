# Contributing to Postmaster

Thanks for your interest! Postmaster is a local-first macOS Mail + Calendar MCP server. A few project-specific conventions matter more here than in a typical repo — please skim these before opening a PR.

## Development setup

```bash
npm install        # builds the native better-sqlite3 binary (Node 20+ required)
npm run build      # tsc + copies the JXA scripts into dist/
npm test           # vitest, 49 tests
npx tsc --noEmit   # typecheck
npm run diagnose   # checks Full Disk Access, the Mail DB, and Mail automation
```

CI runs build + typecheck + tests on macOS for Node 20 and 22.

## How the codebase is organized

- `src/mail/` — read (SQLite `Envelope Index`), write (JXA), detection, providers, the `ConfirmStore`.
- `src/calendar/` — date resolver (pure logic) + JXA calendar I/O.
- `src/mail/jxa/` and `src/calendar/jxa/` — `osascript -l JavaScript` scripts; the build copies them into `dist/`.
- `src/tools/` — MCP tool registration (read / write / calendar).
- `tests/` — pure-logic units use **injectable fake runners**, so they don't touch real Mail/Calendar.

## Non-negotiables

These are hard rules — PRs that break them won't merge:

1. **Local-first.** The server must never transmit mail or calendar data to any external service. No telemetry, no cloud calls.
2. **No hardcoding.** Accounts, the Mail version directory, calendars, and the timezone are all detected at runtime. Never bake in a specific account, UUID, path, or zone.
3. **Two-step confirmation for destructive/outward actions.** `send_message`, `delete_message`, and `commit_calendar_events` must stage a single-use token and do nothing on the first call. Never add a path that sends/deletes/bulk-writes without a matching token.
4. **Parameterized SQL only**; **`osascript` via `execFile` array form** (no shell). User input reaches JXA as argv, never interpolated into a script string.

## Testing changes that touch real Mail/Calendar

Fake-runner unit tests prove your wiring; they do **not** prove the macOS automation contract (JXA has surprising mailbox-scoping and id-stability quirks). For any change to real read/write/calendar behavior, verify on a real machine with a **safe target**:

- **Reversible** ops (mark read → read back → restore).
- **Self-addressed** sends (to your own address, clearly marked), never a real recipient.
- **Throwaway** targets (a draft you create then delete; a temp calendar you delete).

Never run automated tests against real mail, and never send anything without going through the two-step confirmation.

## Pull requests

- Keep `npm run build`, `npx tsc --noEmit`, and `npm test` green.
- Follow the existing code style; match the surrounding file.
- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, …).
- Fill in the PR template, including how you verified real-machine behavior (if applicable).

## Provider support

Adding iCloud / Outlook / generic IMAP is the most-wanted area. The `AccountProvider` interface (`src/mail/provider.ts`) is the seam — implement it and register the provider; the core stays untouched.

## License

By contributing, you agree that your contributions are dual-licensed under **MIT OR Apache-2.0**, the same as the project, without additional terms.
