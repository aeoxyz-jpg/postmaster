import { loadConfig, saveConfig } from "../config.js";

export interface AccountLike {
  name: string;
  emailAddresses: string[];
}

export interface ResolvedAccount {
  account: string;
  reseeded: boolean; // true when a missing/stale default was filled in and persisted
}

/** Resolve the account to send/draft from: explicit > stored-and-still-present > first sendable (persisted). */
export function resolveDefaultAccount(accounts: AccountLike[], explicit?: string): ResolvedAccount {
  if (explicit) return { account: explicit, reseeded: false };

  const cfg = loadConfig();
  if (cfg.defaultAccount && accounts.some((a) => a.name === cfg.defaultAccount)) {
    return { account: cfg.defaultAccount, reseeded: false };
  }

  const firstSendable = accounts.find((a) => a.emailAddresses.length > 0);
  if (!firstSendable) throw new Error("no sendable account found (no account has an email address)");

  cfg.defaultAccount = firstSendable.name;
  saveConfig(cfg);
  return { account: firstSendable.name, reseeded: true };
}
