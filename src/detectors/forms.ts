import { Page } from "playwright";

type DetectedInput = {
  name: string;
  type: string;
  id: string;
  placeholder: string;
  hidden: boolean;
  honeypot: boolean;
};

type DetectedFormGroup = {
  source: "form" | "orphan-input-group";
  action: string;
  type: string;
  hidden: boolean;
  honeypot: boolean;
  inputs: string[];
  fields: DetectedInput[];
};

export async function detectForms(page: Page): Promise<DetectedFormGroup[]> {
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

    // keep your honeypot logic exactly as before (same checks)
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

    const mapInput = (i: HTMLInputElement): DetectedInput => {
      const name = normalize(i.name);
      const type = normalize(i.type) || "unknown";
      const id = normalize(i.id);
      const placeholder = normalize(i.placeholder);

      const tokens = [name, type, id, placeholder]
        .map((x) => x.toLowerCase())
        .join(" ");
      const hidden = isElementHidden(i);

      // input-level honeypot flag using the SAME keyword checks
      const honeypot =
        hidden ||
        tokens.includes("honeypot") ||
        tokens.includes("_honeypot") ||
        tokens.includes("_honey");

      return { name, type, id, placeholder, hidden, honeypot };
    };

    const forms = Array.from(
      document.querySelectorAll<HTMLFormElement>("form"),
    );

    const detectedForms: DetectedFormGroup[] = forms.map((form) => {
      const action = form.action || window.location.href;
      const style = window.getComputedStyle(form);
      const className = normalize(form.className);
      const id = normalize(form.id);

      const inputEls = Array.from(
        form.querySelectorAll<HTMLInputElement>("input"),
      );
      const fields = inputEls.map(mapInput);

      const inputs = fields.map((f) => f.type || f.name || "unknown");
      const inputNamesJoined = inputs.map((i) => i.toLowerCase()).join(" ");

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
        ...fields.map((f) =>
          `${f.name} ${f.type} ${f.id} ${f.placeholder}`.toLowerCase(),
        ),
      ].join(" ");

      let type = inferType(haystack);
      if (formHoneypot) type = "honeypot";

      return {
        source: "form",
        action,
        type,
        hidden: formHidden,
        honeypot: formHoneypot,
        inputs,
        fields,
      };
    });

    // Orphan inputs (inputs not inside any form)
    const orphanInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>("input"),
    ).filter((i) => !i.closest("form"));

    if (orphanInputs.length > 0) {
      const fields = orphanInputs.map(mapInput);
      const inputs = fields.map((f) => f.type || f.name || "unknown");
      const inputNamesJoined = inputs.map((i) => i.toLowerCase()).join(" ");

      // virtual group style to preserve your existing honeypot logic pattern
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
      const haystack = fields
        .map((f) =>
          `${f.name} ${f.type} ${f.id} ${f.placeholder}`.toLowerCase(),
        )
        .join(" ");
      let type = inferType(haystack);
      if (honeypot) type = "honeypot";

      detectedForms.push({
        source: "orphan-input-group",
        action: window.location.href,
        type,
        hidden: fields.every((f) => f.hidden),
        honeypot,
        inputs,
        fields,
      });
    }

    return detectedForms;
  });
}
