// Standalone environment diagnostic. Prints a human report; never throws past the top.
import { runHealthChecks, formatHealthReport } from "./health.js";

async function main() {
  const report = await runHealthChecks();
  console.log(formatHealthReport(report));
}
main().catch((e) => console.error("DIAGNOSTIC ERROR:", e));
