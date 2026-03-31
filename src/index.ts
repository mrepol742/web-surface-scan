import "dotenv/config";
import { crawl } from "./core/crawler";

const target = process.argv[2];

if (!target) {
  console.error("Usage: npm start <url> --headless");
  console.error("Example: npm start https://example.com");
  process.exit(1);
}

(async () => {
  console.log(`Scanning ${target} ...`);
  const result = await crawl(target);
  console.log("Detected Technologies:");
  console.log(result.tech);
  console.log("Schema.org Types:");
  console.log(result.schemaTypes);
  console.log("Meta Integrations:");
  console.log(result.integrations);
  console.log("Forms:");
  console.log(result.forms);
  console.log("Sample Links:", result.links.slice(0, 10));
})();
