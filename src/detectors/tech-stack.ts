import * as cheerio from "cheerio";

export function detectTech(html: string) {
  const $ = cheerio.load(html);

  const scripts = $("script")
    .map((_, el) => $(el).attr("src"))
    .get();

  const tech: string[] = [];

  if (html.includes("__NEXT_DATA__")) tech.push("Next.js");
  if (html.includes("ng-version")) tech.push("Angular");
  if (scripts.some((s) => s?.includes("vue"))) tech.push("Vue");

  if (scripts.some((s) => s?.includes("bootstrap")))
    tech.push("Bootstrap");

  if (scripts.some((s) => s?.includes("tailwind")))
    tech.push("Tailwind");

  if (scripts.some((s) => s?.includes("fontawesome")))
    tech.push("FontAwesome");

  if (scripts.some((s) => s?.includes("googletagmanager")))
    tech.push("Google Tag Manager");

  return tech;
}
