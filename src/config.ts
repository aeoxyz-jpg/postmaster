import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Config {
  defaultAccount?: string;
  defaultCalendar?: string;
}

/** Preferences file location. POSTMASTER_CONFIG overrides (tests + non-default homes). */
export function configPath(): string {
  return (
    process.env.POSTMASTER_CONFIG ||
    join(homedir(), "Library", "Application Support", "postmaster", "config.json")
  );
}

/** Never throws: a missing/corrupt/unreadable file reads as empty config. */
export function loadConfig(): Config {
  const p = configPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Config;
  } catch (e) {
    console.error(`[postmaster] ignoring unreadable config at ${p}: ${(e as Error).message}`);
    return {};
  }
}

export function saveConfig(cfg: Config): void {
  const p = configPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n");
}

/** Validate the requested defaults against the live account/calendar names, persist, return. */
export function setDefaults(
  opts: { account?: string; calendar?: string },
  accountNames: string[],
  calendarNames: string[]
): Config {
  if (opts.account == null && opts.calendar == null) {
    throw new Error("set_defaults needs an account or calendar to set");
  }
  if (opts.account != null && !accountNames.includes(opts.account)) {
    throw new Error(`unknown account: ${opts.account}. Known: ${accountNames.join(", ")}`);
  }
  if (opts.calendar != null && !calendarNames.includes(opts.calendar)) {
    throw new Error(`unknown calendar: ${opts.calendar}. Known: ${calendarNames.join(", ")}`);
  }
  const cfg = loadConfig();
  if (opts.account != null) cfg.defaultAccount = opts.account;
  if (opts.calendar != null) cfg.defaultCalendar = opts.calendar;
  saveConfig(cfg);
  return cfg;
}
