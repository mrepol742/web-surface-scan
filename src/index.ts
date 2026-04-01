import "dotenv/config";
import { crawl } from "./core/crawler";
import logger from "./utils/logger";

const target = process.argv[2];

if (!target) {
  console.error("Usage: npm start <url> --headless");
  console.error("Example: npm start https://example.com");
  process.exit(1);
}

(async () => {
  logger.info(`Starting scan for ${target}`);
  const result = await crawl(target);

  logger.info(
    `Detected Technologies: ${result.tech.length > 0 ? result.tech.join(", ") : "None"}`,
  );

  logger.info("Schema.org Types:");
  if (result.schemaTypes.length > 0) {
    result.schemaTypes.forEach((t) =>
      logger.debug(`- ${t.type} (${t.count} occurrences)`),
    );
  } else {
    logger.debug("None");
  }

  logger.info(
    `Meta Integrations: ${result.integrations.length > 0 ? result.integrations.join(", ") : "None"}`,
  );

  logger.info("Forms:");
  if (result.forms.length > 0) {
    result.forms.forEach((f, i) =>
      logger.debug(
        `- Form ${i + 1}: action=${f.action}, type=${f.type}, inputs=[${f.inputs.join(", ")}]`,
      ),
    );
  } else {
    logger.debug("None");
  }

  logger.info(`HTML Length: ${result.htmlLength} characters`);
  logger.info(`Total Links Detected: ${result.links.length}`);

  logger.info("Sample Links:");
  logger.info(result.links.slice(0, 10).join("\n\t"));
})();
