import { chromium } from "playwright";
import { setupNetworkDetection, analyzePage, detectTailwind } from "./analyze";
import { detectSchemaTypes } from "../detectors/schema";
import { detectMetaIntegrations } from "../detectors/metadata";
import { detectForms } from "../detectors/forms";
import { detectBackendFrameworks } from "../detectors/backend";

export async function crawl(url: string) {
  const browser = await chromium.launch({
    headless: process.env.HEADLESS === "true",
    slowMo: 50,
  });

  const page = await browser.newPage();
  const detectedNetwork = setupNetworkDetection(page);
  await page.goto(url, { waitUntil: "networkidle" });
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

  await browser.close();

  return {
    url,
    tech: Array.from(allTech),
    schemaTypes,
    integrations,
    forms,
    links: Array.from(new Set(links)).slice(0, 50),
    htmlLength: html.length,
  };
}
