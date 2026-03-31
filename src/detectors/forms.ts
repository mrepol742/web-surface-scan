import { Page } from "playwright";

export async function detectForms(page: Page) {
  return await page.evaluate(() => {
    const forms = Array.from(
      document.querySelectorAll<HTMLFormElement>("form"),
    );

    const detectedForms = forms.map((form) => {
      const action = form.action || window.location.href;
      const style = window.getComputedStyle(form);

      // Get all input types
      const inputs = Array.from(
        form.querySelectorAll<HTMLInputElement>("input"),
      ).map((i) => i.type || i.name || "text");

      // Heuristic to guess form type
      let type = "unknown";
      const inputNames = inputs.map((i) => i.toLowerCase()).join(" ");
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        form.className.toLowerCase().includes("hidden") ||
        form.id.toLowerCase().includes("hidden") ||
        inputNames.includes("honeypot") ||
        inputNames.includes("_honeypot") ||
        inputNames.includes("_honey")
      )
        type = "honeypot";
      else if (
        inputNames.includes("password") &&
        inputNames.includes("username")
      )
        type = "login";
      else if (inputNames.includes("email") && inputNames.includes("password"))
        type = "signup";
      else if (inputNames.includes("search")) type = "search";
      else if (inputNames.includes("message") || inputNames.includes("comment"))
        type = "contact";

      return {
        action,
        type,
        inputs,
      };
    });

    return detectedForms;
  });
}
