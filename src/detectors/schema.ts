import { Page } from "playwright";

/**
 * Schema.org detection: parses JSON-LD scripts to identify the types of structured data used on the page (e.g., "Article", "Product", "Event") and counts their occurrences.
 *
 * @param page The Playwright Page object to analyze.
 * @returns An array of detected schema types with their counts (e.g., [{ type: "Article", count: 3 }, { type: "Product", count: 1 }]) or an empty array if not detected.
 */
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
