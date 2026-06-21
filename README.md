<div align="center">

# 📮 Postmaster

**Your Mac's mail & calendar, handled — locally.**

A privacy-first [MCP](https://modelcontextprotocol.io) server that lets Claude read, organize, draft, send, and schedule from macOS **Mail.app** and **Calendar** — entirely on your machine.

![macOS](https://img.shields.io/badge/macOS-Apple%20Silicon-black?logo=apple&logoColor=white)
![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-server-7C3AED)
![Tests](https://img.shields.io/badge/tests-49%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue)

</div>

---

## Why local-first

Your mail and calendar **never leave your Mac**. Postmaster reads Mail's local database directly and makes changes through macOS automation — it sends **nothing** to any external service, and it needs **no API keys or cloud credentials**.

> **One honest caveat:** the *server* transmits nothing. But when Claude reads an email body to, say, pull a timeline out of it, that text goes to Anthropic for the model to reason over — that's just how the assistant works. Fully on-device extraction would need a local LLM, which is out of scope here. There are no secrets in this server, which is exactly why the installer asks for none.

## What you can ask Claude

> *"What needs a reply in my inbox today?"*
> *"Draft a reply to the landlord saying the inspection time works."*
> *"Star anything from the bank and archive the newsletters."*
> *"This offer-accepted email has a 30-day timeline — put the deadlines on my calendar."*

## The 17 tools

| Group | Tools |
|---|---|
| 📥 **Read** | `list_accounts` · `list_mailboxes` · `search_messages` · `get_message` · `summarize` |
| 🗂️ **Organize** | `mark_read` · `mark_unread` · `flag` · `unflag` · `move_message` · `archive` |
| ✍️ **Draft** | `create_draft` *(saved to Drafts; opens a visible compose window if the silent save can't be confirmed)* |
| 📤 **Send** | `send_message` *(two-step confirmed)* |
| 🗑️ **Delete** | `delete_message` *(two-step confirmed)* |
| 📅 **Calendar** | `list_calendars` · `prepare_calendar_events` · `commit_calendar_events` |

### ✨ Multi-event extraction with a review gate

A single email can hide a whole schedule — a real-estate "offer accepted" note might list inspection, appraisal, loan-contingency, and escrow-close dates across 30 days. Postmaster:

- resolves **relative dates** ("inspection in 7 days") against an anchor date,
- **flags fuzzy or undeterminable dates as uncertain instead of guessing them,**
- attaches default reminders, links each event back to its source email,
- and returns the full list **for your review** — nothing is written until you confirm.

## 🔒 Safety model

Destructive and outward-facing actions are **two-step**. `send_message`, `delete_message`, and `commit_calendar_events` first return a summary (for send, the complete recipients/subject/body) plus a single-use token, and do nothing else. Only a second call with that exact-matching token executes. Sending and deleting can't be undone, so you always see the full action first.

## Capability boundaries (honest)

| Area | Status |
|---|---|
| Cross-account read / search / summarize | ✅ works |
| Mark read/unread · flag · move · archive | ✅ works |
| Draft (silent save, visible-compose fallback) | ✅ works (verified on Gmail) |
| Send (two-step confirmed) | ✅ works (verified on Gmail) |
| Delete (two-step confirmed) | ✅ works |
| Calendar multi-event + review gate + alarms + source notes | ✅ works |
| All-day reminders at 9:00 | ⏳ V1 fires day-of at 00:00 |
| iCloud / Outlook / generic IMAP accounts | ⏳ V1 ships Gmail + a generic fallback (the provider seam is pluggable) |

*Known quirk: a Gmail draft's id can change after the draft is edited; ids from search results (received mail) are stable. The write path scans the account's mailboxes to tolerate this.*

## Requirements

- macOS with Mail.app set up (Gmail account(s) for full fidelity)
- Node.js 20+
- Two macOS permissions, walked through in the installer: **Full Disk Access** (to read the Mail database) and **Automation → Mail / Calendar** (to make changes)

## Install

See **[docs/INSTALL.md](docs/INSTALL.md)** for Claude Code and Claude Desktop/Cowork setup plus the permission walkthrough.

Sanity-check any time:

```bash
npm run diagnose
```

It reports whether Full Disk Access, the Mail database, and Mail automation are all working, and lists your accounts.

## How it works

Reads go through Mail's local SQLite index (fast, read-only); per-message bodies and all writes go through macOS scripting (JXA / AppleScript). Accounts are detected at runtime — nothing about your specific machine is hardcoded.

## License

Copyright © 2026 Nikko & Co LLC.

Dual-licensed under either of **[MIT](LICENSE-MIT)** or **[Apache-2.0](LICENSE-APACHE)**, at your option. Unless you state otherwise, any contribution you submit for inclusion shall be dual-licensed as above, without additional terms.
