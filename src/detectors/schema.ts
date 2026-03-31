import { Page } from "playwright";

export async function detectSchemaTypes(page: Page) {
  const typesCount = await page.evaluate(() => {
    const results: Record<string, number> = {};

    // Select all JSON-LD scripts
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>(
        'script[type="application/ld+json"]',
      ),
    );

    scripts.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || "null");

        const nodes = Array.isArray(data["@graph"]) ? data["@graph"] : [data];

        nodes.forEach((node) => {
          if (node["@type"]) {
            const types = Array.isArray(node["@type"])
              ? node["@type"]
              : [node["@type"]];
            types.forEach((t) => {
              results[t] = (results[t] || 0) + 1;
            });
          }
        });
      } catch (e) {}
    });

    return results;
  });

  return Object.entries(typesCount).map(([type, count]) => ({ type, count }));
}
