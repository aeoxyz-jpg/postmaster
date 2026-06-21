import { describe, it, expect } from "vitest";
import { runOsa, OsaError } from "../src/osa/runner.js";

describe("runOsa", () => {
  it("runs a JavaScript osascript and returns trimmed stdout", async () => {
    const out = await runOsa({ language: "JavaScript", script: "1 + 2", timeoutMs: 5000 });
    expect(out).toBe("3");
  });

  it("passes argv into run(argv)", async () => {
    const script = `function run(argv){ return argv[0].toUpperCase(); }`;
    const out = await runOsa({ language: "JavaScript", script, args: ["hi"], timeoutMs: 5000 });
    expect(out).toBe("HI");
  });

  it("throws OsaError on script failure", async () => {
    await expect(
      runOsa({ language: "JavaScript", script: "throw new Error('boom')", timeoutMs: 5000 })
    ).rejects.toBeInstanceOf(OsaError);
  });

  it("throws OsaError on timeout", async () => {
    await expect(
      runOsa({ language: "AppleScript", script: "delay 5", timeoutMs: 50 })
    ).rejects.toMatchObject({ message: /timed out/ });
  });

  it("throws OsaError when neither script nor file is given", async () => {
    // @ts-expect-error intentionally omitting script/file to test the guard
    await expect(runOsa({ language: "JavaScript" })).rejects.toBeInstanceOf(OsaError);
  });
});
