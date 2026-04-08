import { chromium } from "playwright";
import { setupNetworkDetection, analyzePage, detectTailwind } from "./analyze";
import { detectSchemaTypes } from "../detectors/schema";
import { detectMetaIntegrations } from "../detectors/metadata";
import { DetectedForm, detectForms } from "../detectors/forms";
import { detectBackendFrameworks } from "../detectors/backend";
import { isSameDomainOrSubdomain, normalizeUrl } from "../utils/helpers";

const NAVIGATION_TIMEOUT_MS = 25_000;
const STABILITY_WAIT_MS = 4_000;

/**
 * Crawls the given URL and extracts various pieces of information about the page,
 *
 * @param url The URL to crawl and analyze.
 * @param headless Whether to run the browser in headless mode (default: true). Running in headless mode can be faster and consume fewer resources, but may cause some websites to behave differently. Set to false for debugging or if you encounter issues with headless mode.
 * @returns An object containing the original URL, detected technologies, schema types, meta integrations, forms, links, and HTML length.
 */
export async function crawl(
  url: string,
  headless: boolean,
): Promise<{
  url: string;
  tech: string[];
  schemaTypes: string[];
  integrations: string[];
  forms: DetectedForm[];
  links: string[];
  htmlLength: number;
}> {
  const browser = await chromium.launch({
    headless: headless ?? process.env.HEADLESS === "true",
    slowMo: 50,
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
  page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);

  try {
    const detectedNetwork = setupNetworkDetection(page);

    // Fast, reliable initial load
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    // Best-effort quiet period; do not fail if page is constantly noisy
    await page
      .waitForLoadState("networkidle", { timeout: STABILITY_WAIT_MS })
      .catch(() => undefined);

    const finalUrl = page.url();
    const wasRedirected = normalizeUrl(finalUrl) !== normalizeUrl(url);
    const redirectedOutsideDomain =
      wasRedirected && !isSameDomainOrSubdomain(url, finalUrl);

    if (redirectedOutsideDomain) {
      throw new Error(
        `Scan aborted: redirected outside allowed domain.\nSubmitted: ${url}\nFinal: ${finalUrl}`,
      );
    }

    const html = await page.content();

    const [runtimeTech, tailwindTech, schemaTypes, integrations, forms] =
      await Promise.all([
        analyzePage(page),
        detectTailwind(page),
        detectSchemaTypes(page),
        detectMetaIntegrations(page),
        detectForms(page),
      ]);

    const links = await page.$$eval("a", (anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).href),
    );

    const backend = await detectBackendFrameworks(page);
    const allTech = new Set<string>([
      ...backend,
      ...runtimeTech,
      ...Array.from(detectedNetwork),
      ...tailwindTech,
    ]);

    return {
      url,
      tech: Array.from(allTech),
      schemaTypes,
      integrations,
      forms,
      links: Array.from(new Set(links)).slice(0, 50),
      htmlLength: html.length,
    };
  } finally {
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}
