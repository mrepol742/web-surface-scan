#!/usr/bin/env node
import "dotenv/config";
import { crawl } from "./core/crawler";
import logger from "./utils/logger";

const target = process.argv[2];

if (!target) {
  console.error("Usage: npm start <url> --headless");
  console.error("Example: npm start https://example.com");
  process.exit(1);
}

const formatList = (items: string[], emptyLabel = "None"): string =>
  items.length ? items.join(", ") : emptyLabel;

const formatSection = (title: string, lines: string[]): string => {
  const content = lines.length
    ? lines.map((line) => `  • ${line}`).join("\n")
    : "  • None";
  return `${title}\n${content}`;
};

(async () => {
  logger.info(`🚀 Starting scan for: ${target}`);

  const result = await crawl(target);

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
})();
