import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildMailContext } from "./mail/context.js";
import { registerReadTools } from "./tools/register-read.js";
import { registerWriteTools } from "./tools/register-write.js";
import { registerCalendarTools } from "./tools/register-calendar.js";
import { registerHealthTools } from "./tools/register-health.js";
import { registerConfigTools } from "./tools/register-config.js";
import { ConfirmStore } from "./mail/confirm.js";

async function main() {
  const server = new McpServer({ name: "postmaster", version: "0.5.1" });

  // The doctor tool is always available so a setup problem is explained
  // in-conversation rather than surfacing as a bare "disconnected".
  registerHealthTools(server);

  // Detection failure (e.g. no Full Disk Access) must NOT crash the server:
  // connect anyway with just `doctor`, and let the user fix the permission.
  let ctx;
  try {
    ctx = await buildMailContext();
  } catch (err) {
    console.error(
      `[postmaster] mail/calendar tools unavailable: ${(err as Error).message}\n` +
        `[postmaster] connected with the 'doctor' tool only — ask Claude to run doctor for guidance.`
    );
  }

  if (ctx) {
    registerReadTools(server, ctx);
    const confirms = new ConfirmStore();
    registerWriteTools(server, ctx, confirms);
    registerCalendarTools(server, confirms);
    registerConfigTools(server, ctx);
  }

  await server.connect(new StdioServerTransport());
  if (ctx) {
    console.error(`[postmaster] ready — ${ctx.accounts.length} accounts, ${ctx.versionDir}`);
  } else {
    console.error(`[postmaster] ready (degraded) — only 'doctor' is registered`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
