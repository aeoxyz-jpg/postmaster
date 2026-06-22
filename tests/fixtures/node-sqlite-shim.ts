// Test-only shim: vite (used by vitest) doesn't know the new built-in
// `node:sqlite`, so it tries to transform it and fails. We alias `node:sqlite`
// to this file in vitest.config.ts and load the real module at runtime via
// createRequire, which vite leaves untouched. Production code imports
// `node:sqlite` directly and never sees this shim.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const { DatabaseSync } = require("node:sqlite");
