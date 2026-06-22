import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// node:sqlite is too new for vite's builtin list, so vite strips the `node:`
// prefix and fails to resolve bare `sqlite`. Alias it (test-only) to a shim
// that loads the real module at runtime via createRequire.
const sqliteShim = fileURLToPath(new URL("./tests/fixtures/node-sqlite-shim.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^node:sqlite$/, replacement: sqliteShim }],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
});
