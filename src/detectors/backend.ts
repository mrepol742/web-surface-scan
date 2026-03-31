import { Page } from "playwright";

export async function detectBackendFrameworks(page: Page) {
  const detected = new Set<string>();

  const response = await page.goto(page.url(), { waitUntil: "networkidle" });

  if (response) {
    const headers = response.headers();
    const xPoweredBy = (headers["x-powered-by"] || "").toLowerCase();

    if (xPoweredBy.includes("express")) detected.add("Express");
    if (xPoweredBy.includes("php")) detected.add("PHP");
    if (xPoweredBy.includes("asp.net")) detected.add("ASP.NET");
  }

  const htmlDetected = await page.evaluate(() => {
    const frameworks: string[] = [];

    // Laravel
    if (document.querySelector('meta[name="csrf-token"]'))
      frameworks.push("Laravel");

    // Django
    if (document.querySelector('input[name="csrfmiddlewaretoken"]'))
      frameworks.push("Django");

    // Rails
    if (
      document.querySelector('meta[name="csrf-token"][content]') &&
      document.querySelector('meta[name="csrf-param"]')
    )
      frameworks.push("Rails");

    // ASP.NET
    if (document.querySelector('input[name="__RequestVerificationToken"]'))
      frameworks.push("ASP.NET");

    return frameworks;
  });

  htmlDetected.forEach((f) => detected.add(f));

  return Array.from(detected);
}
