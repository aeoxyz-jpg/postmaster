# Install & Permissions

Postmaster runs locally on your Mac. It needs two macOS permission grants (no API keys).

## 1. Build

```bash
npm install
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

Run `npm run diagnose` to confirm all three checks pass (Full Disk Access, Mail database readable, accounts enumerated).

## 3a. Claude Code

Register the server (stdio):
```bash
claude mcp add postmaster -- node /absolute/path/to/postmaster/dist/index.js
```
Then in a Claude Code session the 16 tools are available. Verify with a read-only call like `list_accounts`.

## 3b. Claude Desktop / Cowork (.mcpb)

1. Build the bundle: `npm run pack` → produces `postmaster.mcpb`.
2. In Claude Desktop: **Settings → Extensions → Install Extension** and choose the `.mcpb` file.
3. Approve the macOS Automation prompts on first write.

> The `.mcpb` includes a native `better-sqlite3` binary, so it is built for **your Mac's architecture** (Apple Silicon vs Intel). Build the bundle on the same architecture you'll install it on.

## Troubleshooting

- `npm run diagnose` shows a ✗ for Mail database → grant **Full Disk Access** to the running app and restart it.
- A write fails with "Not authorized to send Apple events" → approve the **Automation → Mail/Calendar** prompt, or enable it under Privacy & Security → Automation.
- "No Mail version dir with an Envelope Index" → open Mail.app once so it builds its local index.
