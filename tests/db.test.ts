import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findMailVersionDir, openEnvelopeDb } from "../src/mail/db.js";
import { buildFixtureDb } from "./fixtures/build-db.js";

let root: string;
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "mailtest-"));
  // Two version dirs; only V10 has an Envelope Index.
  for (const v of ["V9", "V10"]) mkdirSync(join(root, v, "MailData"), { recursive: true });
  buildFixtureDb(join(root, "V10", "MailData", "Envelope Index"));
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("findMailVersionDir", () => {
  it("picks the highest V* dir that has an Envelope Index", () => {
    expect(findMailVersionDir(root)).toBe(join(root, "V10"));
  });
  it("throws a clear error when no version dir has an index", () => {
    const empty = mkdtempSync(join(tmpdir(), "mailempty-"));
    expect(() => findMailVersionDir(empty)).toThrow(/Envelope Index/);
    rmSync(empty, { recursive: true, force: true });
  });
  it("skips a broken symlink in the mail root without crashing", () => {
    const r = mkdtempSync(join(tmpdir(), "mailsym-"));
    mkdirSync(join(r, "V10", "MailData"), { recursive: true });
    buildFixtureDb(join(r, "V10", "MailData", "Envelope Index"));
    symlinkSync(join(r, "does-not-exist"), join(r, "V8")); // broken symlink
    expect(findMailVersionDir(r)).toBe(join(r, "V10"));
    rmSync(r, { recursive: true, force: true });
  });
});

describe("openEnvelopeDb", () => {
  it("opens read-only and refuses writes", () => {
    const db = openEnvelopeDb(join(root, "V10", "MailData", "Envelope Index"));
    const n = db.prepare("SELECT count(*) AS c FROM messages").get() as { c: number };
    expect(n.c).toBe(4);
    expect(() => db.prepare("DELETE FROM messages").run()).toThrow();
    db.close();
  });
});
