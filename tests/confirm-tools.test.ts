import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Lock in the per-tool matches/execute closures of the destructive tools, which the generic
// confirmGate tests can't see. JXA side effects are mocked; nothing reaches osascript.
const sent: unknown[] = [];
const deleted: string[] = [];
vi.mock("../src/mail/write.js", () => ({
  setStatus: vi.fn(), moveMessage: vi.fn(), createDraft: vi.fn(),
  deleteMessage: vi.fn(async (id: string) => { deleted.push(id); return { id, deleted: true }; }),
  sendMessage: vi.fn(async (input: { account: string; to: string }) => { sent.push(input); return { sent: true, to: input.to, account: input.account }; }),
}));
vi.mock("../src/mail/resolve-id.js", () => ({
  resolveLiveId: (_ctx: unknown, id: string) => id,
  describeMessage: () => ({ subject: "Hi", from: "a@b.c", date: "2026-01-01T00:00:00.000Z" }),
}));
vi.mock("../src/calendar/calendar.js", () => ({
  listCalendars: vi.fn(async () => []), listEvents: vi.fn(), createEvents: vi.fn(), updateEvent: vi.fn(),
  describeEvent: vi.fn(async (uid: string) => uid === "U1" ? { found: true, uid, title: "Standup", calendar: "Work" } : { found: false, uid }),
  deleteEvent: vi.fn(async (uid: string) => { deleted.push(uid); return { uid, deleted: true }; }),
}));

const { registerWriteTools } = await import("../src/tools/register-write.js");
const { registerCalendarTools } = await import("../src/tools/register-calendar.js");
const { ConfirmStore } = await import("../src/mail/confirm.js");

type Handler = (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }>;
const parse = (r: { content: Array<{ text: string }> }) => JSON.parse(r.content[0].text);

let tools: Record<string, Handler>;
let dir: string;

beforeEach(() => {
  sent.length = 0;
  deleted.length = 0;
  dir = mkdtempSync(join(tmpdir(), "pm-cfg-"));
  process.env.POSTMASTER_CONFIG = join(dir, "config.json");
  writeFileSync(process.env.POSTMASTER_CONFIG, JSON.stringify({ defaultAccount: "work" }));
  tools = {};
  const server = { registerTool: (name: string, _def: unknown, h: Handler) => { tools[name] = h; } } as any;
  const ctx = { accounts: [
    { name: "work", emailAddresses: ["w@x.com"] },
    { name: "home", emailAddresses: ["h@x.com"] },
  ] } as any;
  const confirms = new ConfirmStore();
  registerWriteTools(server, ctx, confirms);
  registerCalendarTools(server, confirms);
});
afterEach(() => {
  delete process.env.POSTMASTER_CONFIG;
  rmSync(dir, { recursive: true, force: true });
});

const msg = { to: "t@x.com", subject: "S", body: "B" };

describe("send_message confirmation", () => {
  it("sends from the staged default account once the identical request is confirmed", async () => {
    const st = parse(await tools.send_message(msg));
    expect(st.review).toEqual({ account: "work", to: "t@x.com", cc: null, subject: "S", body: "B" });
    await tools.send_message({ ...msg, confirm_token: st.confirm_token });
    expect(sent).toEqual([{ account: "work", to: "t@x.com", subject: "S", body: "B", cc: undefined }]);
  });

  it("executes with the staged account even if the default changes before confirm", async () => {
    const st = parse(await tools.send_message(msg));
    writeFileSync(process.env.POSTMASTER_CONFIG!, JSON.stringify({ defaultAccount: "home" }));
    await tools.send_message({ ...msg, confirm_token: st.confirm_token });
    expect((sent[0] as { account: string }).account).toBe("work");
  });

  it.each([
    ["to", { to: "other@x.com" }],
    ["subject", { subject: "S2" }],
    ["body", { body: "B2" }],
    ["cc", { cc: "c@x.com" }],
    ["account", { account: "home" }],
  ])("rejects a confirm whose %s differs from what was reviewed", async (_f, change) => {
    const st = parse(await tools.send_message(msg));
    await expect(tools.send_message({ ...msg, ...change, confirm_token: st.confirm_token }))
      .rejects.toThrow("confirm_token does not match this send request");
    expect(sent).toEqual([]);
  });

  it("treats omitted cc and empty-staged cc as the same (null-normalized)", async () => {
    const st = parse(await tools.send_message({ ...msg, account: "work" }));
    await tools.send_message({ ...msg, account: "work", confirm_token: st.confirm_token });
    expect(sent).toHaveLength(1);
  });
});

describe("delete confirmations", () => {
  it("delete_message rejects a token staged for a different message id", async () => {
    const st = parse(await tools.delete_message({ id: "work::INBOX::1" }));
    await expect(tools.delete_message({ id: "work::INBOX::2", confirm_token: st.confirm_token }))
      .rejects.toThrow("confirm_token does not match this delete request");
    expect(deleted).toEqual([]);
  });

  it("delete_calendar_event rejects a token staged for a different uid", async () => {
    const st = parse(await tools.delete_calendar_event({ uid: "U1" }));
    expect(st.summary).toBe('Delete event "Standup" from "Work"');
    await expect(tools.delete_calendar_event({ uid: "U2", confirm_token: st.confirm_token }))
      .rejects.toThrow("confirm_token does not match this delete request");
    expect(deleted).toEqual([]);
  });

  it("delete_calendar_event refuses to stage a missing event", async () => {
    await expect(tools.delete_calendar_event({ uid: "NOPE" })).rejects.toThrow("calendar event not found: NOPE");
  });
});
