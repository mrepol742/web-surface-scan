#!/usr/bin/env node
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { crawl } from "./core/crawler";
import { runDefensiveChecks } from "./defensive-checks";
import logger from "./utils/logger";

const args = process.argv.slice(2);

const target = args[0];
if (!target) {
  console.error("Usage: npx web-surface-scan <url> [--headless]");
  console.error("Example: npx web-surface-scan https://example.com --headless");
  process.exit(1);
}

const headless = args.includes("--headless");

const formatList = (items: string[], emptyLabel = "None"): string =>
  items.length ? items.join(", ") : emptyLabel;

const formatSection = (title: string, lines: string[]): string => {
  const content = lines.length
    ? lines.map((line) => `  • ${line}`).join("\n")
    : "  • None";
  return `${title}\n${content}`;
};

const askYesNo = async (question: string): Promise<boolean> => {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      const answer = (await rl.question(`${question} `)).trim().toLowerCase();
      if (answer === "yes") return true;
      if (answer === "no") return false;

      logger.warn('Please answer with "yes" or "no".');
    }
  } finally {
    rl.close();
  }
};

(async () => {
  logger.info(`🚀 Starting scan for: ${target}`);

  const result = await crawl(target, headless);

  const schemaLines = result.schemaTypes.map(
    (t) => `${t.type} (${t.count} occurrence${t.count === 1 ? "" : "s"})`,
  );

  const formLines = result.forms.map(
    (f) =>
      `${f.type} form with ${f.inputs.length} input${
        f.inputs.length === 1 ? "" : "s"
      }${f.honeypot ? " [honeypot]" : ""}${f.hidden ? " [hidden]" : ""}`,
  );

  const sampleLinks = result.links.slice(0, 10);
  const linkLines = sampleLinks.length
    ? sampleLinks.map((link, i) => `${i + 1}. ${link}`)
    : [];

  logger.info("=".repeat(64));
  logger.info("📊 Scan Report");
  logger.info("=".repeat(64));

  logger.info(
    formatSection("Detected Technologies", [formatList(result.tech)]),
  );

  logger.info(formatSection("Schema.org Types", schemaLines));

  logger.info(
    formatSection("Meta Integrations", [formatList(result.integrations)]),
  );

  logger.info(formatSection("Forms", formLines));

  logger.info(
    formatSection("Page Metrics", [
      `HTML Length: ${result.htmlLength.toLocaleString()} characters`,
      `Total Links Detected: ${result.links.length.toLocaleString()}`,
    ]),
  );

  logger.info(formatSection("Sample Links (up to 10)", linkLines));

  logger.info("=".repeat(64));
  logger.info("✅ Scan complete");
  logger.info(
    "⚠️ Disclaimer: The authors are not liable for damages resulting from misuse.",
  );

  const shouldRunDefensiveChecks = await askYesNo(
    "Would you like to initiate defensive security checks? (yes/no)",
  );

  if (shouldRunDefensiveChecks) {
    await runDefensiveChecks(result.links, result.forms);
  } else {
    logger.info("Skipped defensive security checks.");
  }
})();
