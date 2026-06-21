import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildMailContext } from "./mail/context.js";
import { registerReadTools } from "./tools/register-read.js";
import { registerWriteTools } from "./tools/register-write.js";
import { registerCalendarTools } from "./tools/register-calendar.js";
import { ConfirmStore } from "./mail/confirm.js";

async function main() {
  const server = new McpServer({ name: "postmaster", version: "0.1.0" });

  let ctx;
  try {
    ctx = await buildMailContext();
  } catch (err) {
    console.error(`[postmaster] startup detection failed: ${(err as Error).message}`);
    process.exit(1);
  }

  registerReadTools(server, ctx);
  const confirms = new ConfirmStore();
  registerWriteTools(server, ctx, confirms);
  registerCalendarTools(server, confirms);
  await server.connect(new StdioServerTransport());
  console.error(`[postmaster] ready — ${ctx.accounts.length} accounts, ${ctx.versionDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
