# Install & Permissions

Postmaster runs locally on your Mac. It needs **Node.js 22.5+** and two macOS permission grants (no API keys). There is no native module to compile, so the same build runs on Intel and Apple Silicon.

The easiest path for most people is the **`.mcpb` Desktop Extension** (§3b): Full Disk Access is then granted once to **Claude.app** itself, and there's no Node version to manage.

## 1. Build

```bash
npm install   # Node 22.5+
npm run build
```

## 2. Grant macOS permissions

Both are required; macOS will otherwise block access silently or with errors.

### Full Disk Access (to READ your Mail database)
1. System Settings → Privacy & Security → **Full Disk Access**.
2. Add the app that will run the server: your **terminal** (for Claude Code) or **Claude** (for Desktop). Toggle it on.
3. Restart that app.

### Automation → Mail and Calendar (to make CHANGES)
The first time the server marks/moves/drafts/deletes or writes a calendar event, macOS prompts to allow controlling **Mail** / **Calendar**. Click **OK**. You can review these later under System Settings → Privacy & Security → **Automation**.

Run `npm run diagnose` to confirm all three checks pass (Full Disk Access, Mail database readable, accounts enumerated). Once the server is installed you can also just **ask Claude to run `doctor`** for the same report inside the chat — it works even if the other tools couldn't start.

## 3a. Claude Code

Register the server (stdio):
```bash
claude mcp add postmaster -- node /absolute/path/to/postmaster/dist/index.js
```
Then in a Claude Code session the 20 tools are available. Verify with a read-only call like `list_accounts`, or ask Claude to run `doctor`.

## 3b. Claude Desktop / Cowork (.mcpb)

1. Build the bundle: `npm run pack` → produces `postmaster.mcpb`.
2. In Claude Desktop: **Settings → Extensions → Install Extension** and choose the `.mcpb` file.
3. Grant **Full Disk Access** to **Claude** (System Settings → Privacy & Security → Full Disk Access) and restart it.
4. Approve the macOS Automation prompts on first write.

> The `.mcpb` has **no native binary** (SQLite reads use the built-in `node:sqlite`), so it's **portable across Intel and Apple Silicon** — build it anywhere, install it anywhere. It only requires the host's Node to be **22.5+**.

## Troubleshooting

- `npm run diagnose` (or the in-chat `doctor` tool) shows a ✗ for Mail database → grant **Full Disk Access** to the running app and restart it.
- The server shows as connected but only the `doctor` tool is listed → detection failed (usually missing Full Disk Access). Run `doctor` for the exact remediation, fix it, and restart the host app.
- A write fails with "Not authorized to send Apple events" → approve the **Automation → Mail/Calendar** prompt, or enable it under Privacy & Security → Automation.
- "No Mail version dir with an Envelope Index" → open Mail.app once so it builds its local index.
