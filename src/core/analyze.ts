import { Page } from "playwright";

/**
 * Network detection: listens to all network requests and looks for patterns in URLs that indicate the use of specific technologies (e.g., WordPress, Next.js, Google Analytics).
 *
 * @param page The Playwright Page object to analyze.
 * @returns A Set of detected technologies based on network requests (e.g., "WordPress", "Google Analytics"). Note that this is a Set to avoid duplicates, and it may be empty if no known patterns are detected.
 */
export function setupNetworkDetection(page: Page) {
  const detected = new Set<string>();

  page.on("request", (req) => {
    const url = req.url();

    if (
      url.includes("/wp-content/") ||
      url.match(/^https?:\/\/[^/]+\/wp-content\//)
    ) {
      detected.add("WordPress");
    }

    if (url.includes("/_next/") || url.match(/^https?:\/\/[^/]+\/_next\//)) {
      detected.add("Next.js");
    }
    if (/^https?:\/\/www\.google-analytics\.com\//.test(url))
      detected.add("Google Analytics");
    if (/^https?:\/\/www\.googletagmanager\.com\//.test(url))
      detected.add("Google Tag Manager");
    if (/^https?:\/\/pagead2\.googlesyndication\.com\//.test(url))
      detected.add("Google Adsense");
    if (/^https?:\/\/cdn\.sentry\.io\//.test(url)) detected.add("Sentry");
    if (/^https?:\/\/.*hotjar\.com\//.test(url)) detected.add("Hotjar");
    if (/^https?:\/\/.*intercom\.io\//.test(url)) detected.add("Intercom");
    if (/^https?:\/\/.*mixpanel\.com\//.test(url)) detected.add("Mixpanel");
    if (/^https?:\/\/.*beacon\./.test(url)) detected.add("Cloudflare Beacon");
    if (/^https?:\/\/.*segment\.com\//.test(url)) detected.add("Segment");
    if (/^https?:\/\/.*trustpilot\.com\//.test(url)) detected.add("Trustpilot");
    if (/^https?:\/\/[^/]+\.s3\.amazonaws\.com\//.test(url))
      detected.add("Amazon S3");
    if (/^https?:\/\/.githubassets\.com\//.test(url))
      detected.add("GitHub Assets");
    if (/^https?:\/\/.*\.cloudflare\.com\//.test(url))
      detected.add("Cloudflare");
    if (/^https?:\/\/.*\.supabase\.co\//.test(url)) detected.add("Supabase");
  });

  return detected;
}

/**
 * Runtime detection: checks window globals for frontend frameworks and libraries
 *
 * @param page The Playwright Page object to analyze.
 * @returns An array of detected technologies (e.g., ["React", "jQuery"]) or an empty array if not detected.
 */
export async function analyzePage(page: Page) {
  return await page.evaluate(() => {
    const tech: string[] = [];

    // Frameworks
    if ((window as any).__NEXT_DATA__) tech.push("Next.js");
    if ((window as any).ng) tech.push("Angular");
    if ((window as any).React || document.querySelector("[data-reactroot]"))
      tech.push("React");
    if ((window as any).__VUE__) tech.push("Vue");

    // Libraries
    if ((window as any).jQuery) tech.push("jQuery");
    if ((window as any).bootstrap) tech.push("Bootstrap"); // rare, usually only dev mode

    return tech;
  });
}

/**
 * Detects Tailwind CSS usage by looking for common class name patterns in the DOM.
 *
 * @param page The Playwright Page object to analyze.
 * @returns An array of detected technologies (e.g., ["Tailwind"]) or an empty array if not detected.
 */
export async function detectTailwind(page: Page) {
  const hasTailwind = await page.evaluate(() =>
    Array.from(document.querySelectorAll("*")).some((el) =>
      [...el.classList].some(
        (cls) =>
          cls.startsWith("bg-") ||
          cls.startsWith("text-") ||
          cls.startsWith("p-") ||
          cls.startsWith("m-"),
      ),
    ),
  );

  return hasTailwind ? ["Tailwind"] : [];
}
