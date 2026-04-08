import { Page } from "playwright";

/**
 * Metadata-based integration detection: scans for specific meta tags and link tags that indicate the presence of integrations like Google Search Console, Bing Webmaster Tools, security scanners, or analytics platforms.
 *
 * @param page The Playwright Page object to analyze.
 * @returns An array of detected integrations based on meta and link tags (e.g., ["Google Search Console", "Norton Web Security"]) or an empty array if not detected.
 */
export async function detectMetaIntegrations(page: Page) {
  return await page.evaluate(() => {
    const detected: string[] = [];
    const metas = Array.from(
      document.querySelectorAll<HTMLMetaElement>("meta"),
    );
    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>("link"),
    );

    metas.forEach((meta) => {
      const name = (meta.getAttribute("name") || "").toLowerCase();
      const content = (meta.getAttribute("content") || "").toLowerCase();

      // Search engine verification
      if (name === "google-site-verification")
        detected.push("Google Search Console");
      if (name === "msvalidate.01") detected.push("Bing Webmaster Tools");
      if (name === "y_key") detected.push("Yahoo Site Verification");
      if (name === "naver-site-verification")
        detected.push("Naver Webmaster Tools");
      if (name === "baidu-site-verification")
        detected.push("Baidu Webmaster Tools");

      // Security / scanner tools
      if (name.includes("norton")) detected.push("Norton Web Security");
      if (name.includes("mcafee")) detected.push("McAfee SiteAdvisor");
      if (name.includes("site-verification") && content.includes("cloudflare"))
        detected.push("Cloudflare Security");

      // Analytics
      if (name.includes("octolytics-url")) detected.push("GitHub Analytics");
    });

    links.forEach((link) => {
      const rel = (link.getAttribute("rel") || "").toLowerCase();
      const href = (link.getAttribute("href") || "").toLowerCase();

      if (rel === "search" && href.includes("google.com/webmasters"))
        detected.push("Google Search Console");
      if (href.includes("bing.com/webmaster"))
        detected.push("Bing Webmaster Tools");
    });

    return Array.from(new Set(detected));
  });
}
