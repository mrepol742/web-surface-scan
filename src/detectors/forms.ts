import { Page } from "playwright";

export type DetectedInput = {
  name: string;
  type: string;
  id: string;
  placeholder: string;
  hidden: boolean;
  honeypot: boolean;
  recaptcha: boolean;
};

export type DetectedForm = {
  source: "form" | "orphan-input-group";
  action: string;
  method: string;
  type: string;
  hidden: boolean;
  honeypot: boolean;
  recaptcha: boolean;
  inputs: DetectedInput[];
};

export type DetectFormsResult = {
  forms: DetectedForm[];
};

export async function detectForms(page: Page): Promise<DetectFormsResult> {
  return await page.evaluate(() => {
    const normalize = (v: string | null | undefined) => (v || "").trim();
    const lower = (v: string | null | undefined) => normalize(v).toLowerCase();

    const isElementHidden = (el: Element): boolean => {
      const style = window.getComputedStyle(el as HTMLElement);
      const htmlEl = el as HTMLElement;
      return (
        (htmlEl as HTMLInputElement).type === "hidden" ||
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        htmlEl.hidden === true ||
        htmlEl.getAttribute("aria-hidden") === "true"
      );
    };

    // Keep your honeypot checks exactly as-is
    const hasHoneypotSignals = (
      className: string,
      id: string,
      inputNamesJoined: string,
      style: CSSStyleDeclaration,
    ) =>
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0" ||
      className.toLowerCase().includes("hidden") ||
      id.toLowerCase().includes("hidden") ||
      inputNamesJoined.includes("honeypot") ||
      inputNamesJoined.includes("_honeypot") ||
      inputNamesJoined.includes("_honey");

    const inferType = (haystack: string): string => {
      if (haystack.includes("password") && haystack.includes("username"))
        return "login";
      if (
        haystack.includes("password") &&
        (haystack.includes("email") ||
          haystack.includes("register") ||
          haystack.includes("signup"))
      )
        return "register";
      if (
        haystack.includes("newsletter") ||
        (haystack.includes("email") &&
          (haystack.includes("subscribe") || haystack.includes("subscription")))
      )
        return "newsletter";
      if (haystack.includes("search")) return "search";
      if (
        haystack.includes("message") ||
        haystack.includes("comment") ||
        haystack.includes("contact")
      )
        return "contact";
      if (
        haystack.includes("checkout") ||
        haystack.includes("card") ||
        haystack.includes("billing")
      )
        return "checkout";
      return "unknown";
    };

    const isRecaptchaInput = (i: HTMLInputElement): boolean => {
      const tokens = [
        normalize(i.name),
        normalize(i.id),
        normalize(i.className),
        normalize(i.getAttribute("data-sitekey")),
        normalize(i.getAttribute("data-callback")),
      ]
        .join(" ")
        .toLowerCase();

      return (
        tokens.includes("recaptcha") ||
        tokens.includes("g-recaptcha") ||
        tokens.includes("h-captcha") ||
        tokens.includes("hcaptcha")
      );
    };

    const hasRecaptchaInContainer = (container: Element): boolean => {
      return Boolean(
        container.querySelector(
          ".g-recaptcha, .h-captcha, iframe[src*='recaptcha'], iframe[src*='hcaptcha'], textarea[name='g-recaptcha-response'], textarea[name='h-captcha-response'], input[name='g-recaptcha-response'], input[name='h-captcha-response']",
        ),
      );
    };

    const mapInput = (i: HTMLInputElement): DetectedInput => {
      const name = normalize(i.name);
      const type = normalize(i.type) || "unknown";
      const id = normalize(i.id);
      const placeholder = normalize(i.placeholder);

      const tokens = [name, type, id, placeholder]
        .map((x) => x.toLowerCase())
        .join(" ");
      const hidden = isElementHidden(i);

      // keep input honeypot check style unchanged
      const honeypot =
        hidden ||
        tokens.includes("honeypot") ||
        tokens.includes("_honeypot") ||
        tokens.includes("_honey");

      const recaptcha = isRecaptchaInput(i);

      return { name, type, id, placeholder, hidden, honeypot, recaptcha };
    };

    const formElements = Array.from(
      document.querySelectorAll<HTMLFormElement>("form"),
    );

    const forms: DetectedForm[] = formElements.map((form) => {
      const action = form.action || window.location.href;
      const method = (form.method || "get").toLowerCase();
      const style = window.getComputedStyle(form);
      const className = normalize(form.className);
      const id = normalize(form.id);

      const inputEls = Array.from(
        form.querySelectorAll<HTMLInputElement>("input"),
      );
      const inputs = inputEls.map(mapInput);

      const inputNamesJoined = inputs
        .map((i) => `${i.type} ${i.name}`.toLowerCase())
        .join(" ");

      const formHidden = isElementHidden(form);
      const formHoneypot = hasHoneypotSignals(
        className,
        id,
        inputNamesJoined,
        style,
      );

      const haystack = [
        lower(form.getAttribute("aria-label")),
        lower(form.getAttribute("name")),
        lower(form.getAttribute("id")),
        lower(form.getAttribute("class")),
        ...inputs.map((i) =>
          `${i.name} ${i.type} ${i.id} ${i.placeholder}`.toLowerCase(),
        ),
      ].join(" ");

      let type = inferType(haystack);
      if (formHoneypot) type = "honeypot";

      const formRecaptcha =
        hasRecaptchaInContainer(form) || inputs.some((i) => i.recaptcha);

      return {
        source: "form",
        action,
        method,
        type,
        hidden: formHidden,
        honeypot: formHoneypot,
        recaptcha: formRecaptcha,
        inputs,
      };
    });

    // Keep orphan input support for pages with no <form>
    const orphanInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>("input"),
    ).filter((i) => !i.closest("form"));

    if (orphanInputs.length > 0) {
      const inputs = orphanInputs.map(mapInput);

      const inputNamesJoined = inputs
        .map((i) => `${i.type} ${i.name}`.toLowerCase())
        .join(" ");

      const virtualStyle = {
        display: "",
        visibility: "",
        opacity: "",
      } as CSSStyleDeclaration;

      const honeypot = hasHoneypotSignals(
        "",
        "",
        inputNamesJoined,
        virtualStyle,
      );

      const haystack = inputs
        .map((i) =>
          `${i.name} ${i.type} ${i.id} ${i.placeholder}`.toLowerCase(),
        )
        .join(" ");

      let type = inferType(haystack);
      if (honeypot) type = "honeypot";

      const recaptcha =
        hasRecaptchaInContainer(document.body) ||
        inputs.some((i) => i.recaptcha);

      forms.push({
        source: "orphan-input-group",
        action: window.location.href,
        method: "get",
        type,
        hidden: inputs.every((i) => i.hidden),
        honeypot,
        recaptcha,
        inputs,
      });
    }

    return { forms };
  });
}
