# Install & Permissions

Postmaster runs locally on your Mac (no API keys, nothing leaves the machine). There are two ways to install it:

- **Claude Desktop (recommended for most people)** — install the `.mcpb` Desktop Extension. **No Node.js install, no build.** Full Disk Access is granted once to **Claude** itself. → [Path A](#path-a--claude-desktop-mcpb-recommended)
- **Claude Code / CLI (developers)** — run from source. Needs **Node.js 22.5+**. → [Path B](#path-b--claude-code-cli-from-source)

Either way you grant the same two macOS permissions (below), and there is no native module to compile — the `.mcpb` is the same for Intel and Apple Silicon.

## macOS permissions (both paths)

Both are required; macOS otherwise blocks access silently or with errors.

- **Full Disk Access** — to *read* the Mail database. System Settings → Privacy & Security → **Full Disk Access** → add and enable the app that runs the server: **Claude** (Path A) or your **terminal** (Path B). Restart that app afterward.
- **Automation → Mail / Calendar** — to *make changes*. The first time the server marks/moves/drafts/deletes mail or writes a calendar event, macOS prompts to allow controlling **Mail** / **Calendar** — click **OK**. Review later under System Settings → Privacy & Security → **Automation**.

At any time, verify by **asking Claude to run `doctor`** (it reports the three checks + remediation, and works even if the other tools couldn't start), or from a source checkout run `npm run diagnose`.

---

## Path A — Claude Desktop (.mcpb, recommended)

1. **Download `postmaster.mcpb`** from the project's **GitHub Releases** page (grab the latest version). You do *not* need Node.js or a build for this path — the extension runs on Claude Desktop's built-in Node.js (22.5+).
2. In Claude Desktop: **Settings → Extensions**, scroll down to **Advanced settings**, find the **Extension Developer** section, and click **Install Extension…**, then choose the downloaded `.mcpb`.
   - This is the supported way to install a local/self-built extension. The top "Apps & extensions" page only lists curated directory apps (Microsoft 365, Chrome, …) — it does **not** have a file-install button; the local installer lives under **Advanced settings**, behind a "Developer Tools Warning" (that's expected).
3. Grant **Full Disk Access** to **Claude** (System Settings → Privacy & Security → Full Disk Access) and **restart Claude**.
4. Approve the macOS **Automation → Mail/Calendar** prompt the first time you ask Claude to change something.
5. Verify: ask Claude **"run postmaster's doctor"** — you want three ✓ (Mail library / Envelope Index / Accounts) plus the Defaults line.

> Install the `.mcpb` from this project's Releases, not an older copy — pre-0.3 bundles used a native module (`better-sqlite3`) and will show "Server disconnected" under Claude's built-in Node. v0.3+ is pure `node:sqlite` and just works.

## Path B — Claude Code / CLI (from source)

Needs **Node.js 22.5+** (for the built-in `node:sqlite`).

```bash
npm install
npm run build
claude mcp add postmaster -- node /absolute/path/to/postmaster/dist/index.js
```

Grant **Full Disk Access to your terminal** (the app that launches `node`), then restart it. In a Claude Code session the 22 tools are available — verify with a read-only call like `list_accounts`, or ask Claude to run `doctor`.

To rebuild the `.mcpb` yourself: `npm run pack` → produces `postmaster.mcpb`.

## Troubleshooting

- **"Server disconnected" right after install** → you likely installed an old pre-0.3 bundle with a native module. Remove it and install the current `.mcpb` (v0.3+, no native binary).
- **Connected but only the `doctor` tool is listed** → detection failed (usually missing Full Disk Access). Run `doctor` for the exact remediation, fix it, and restart the host app.
- **`doctor` shows ✗ for the Mail database** → grant **Full Disk Access** to the running app (Claude for Path A, your terminal for Path B) and restart it.
- **A write fails with "Not authorized to send Apple events"** → approve the **Automation → Mail/Calendar** prompt, or enable it under Privacy & Security → Automation.
- **"No Mail version dir with an Envelope Index"** → open Mail.app once so it builds its local index.
- **Defaults** (default sending account / calendar) live in `~/Library/Application Support/postmaster/config.json` (override with `POSTMASTER_CONFIG`). They auto-seed from macOS on first use; delete the file to re-seed, or use the `set_defaults` tool to change them.
