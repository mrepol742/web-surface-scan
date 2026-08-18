import axios from "axios";
import logger from "../utils/logger";
import type { DetectedForm } from "../detectors/forms";

type DefensiveCheckResult = {
  name: string;
  status: "pass" | "warn" | "info";
  details: string;
};

const looksLikeRecaptcha = (link: string): boolean => {
  const lower = link.toLowerCase();
  return (
    lower.includes("recaptcha") ||
    lower.includes("google.com/recaptcha") ||
    lower.includes("g-recaptcha") ||
    lower.includes("captcha") ||
    lower.includes("hcaptcha") ||
    lower.includes("turnstile") ||
    lower.includes("arkose") ||
    lower.includes("funcaptcha") ||
    lower.includes("botdetect") ||
    lower.includes("geetest") ||
    lower.includes("captcha-service") ||
    lower.includes("captcha-api") ||
    lower.includes("captcha-widget") ||
    lower.includes("captcha-challenge") ||
    lower.includes("captcha-verify") ||
    lower.includes("captcha-proxy") ||
    lower.includes("captcha-endpoint")
  );
};

const looksLikeRateLimitHint = (link: string): boolean => {
  const lower = link.toLowerCase();
  return (
    lower.includes("rate-limit") ||
    lower.includes("ratelimit") ||
    lower.includes("throttle") ||
    lower.includes("/api/")
  );
};

const runRecaptchaCheck = (links: string[]): DefensiveCheckResult => {
  const matched = links.filter(looksLikeRecaptcha);

  if (matched.length > 0) {
    return {
      name: "reCAPTCHA Presence Check",
      status: "pass",
      details: `Potential reCAPTCHA-related endpoints/resources found (${matched.length}).`,
    };
  }

  return {
    name: "reCAPTCHA Presence Check",
    status: "warn",
    details: "No obvious reCAPTCHA references found in discovered links.",
  };
};

const runRateLimitCheck = (forms: DetectedForm[]): any => {
  let count = 0;
  forms.map((form) => {
    while (true) {
      count++;

      logger.info(`🔍 #${count} Checking form action ${form.action} for potential rate limiting...`);

      const axiosInstance = axios.create({
        timeout: 5000,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WebSurfaceScan/1.0;",
        },
      });

      let axiosPromise;
      if (form.method === "POST") {
        axiosPromise = axiosInstance.post(form.action, {});
      } else {
        axiosPromise = axiosInstance.get(form.action);
      }

      axiosPromise
        .then((response) => {
          if (response.status === 429) {
            return {
              name: "Rate Limiting Check",
              status: "pass",
              details: `Received 429 Too Many Requests for form action ${form.action}, indicating potential rate limiting.`,
            };
          } else {
            return {
              name: "Rate Limiting Check",
              status: "info",
              details: `Form action ${form.action} responded with status ${response.status}. No immediate rate limit indication.`,
            };
          }
        })

        .catch((error) => {
          if (error.response && error.response.status === 429) {
            return {
              name: "Rate Limiting Check",
              status: "pass",
              details: `Received 429 Too Many Requests for form action ${form.action}, indicating potential rate limiting.`,
            };
          } else {
            return {
              name: "Rate Limiting Check",
              status: "info",
              details: `Error accessing form action ${form.action}: ${error.message}. No immediate rate limit indication.`,
            };
          }
        });
    }
  });
};

const iconForStatus = (status: DefensiveCheckResult["status"]): string => {
  if (status === "pass") return "✅";
  if (status === "warn") return "⚠️";
  return "ℹ️";
};

export const runDefensiveChecks = async (
  links: string[],
  forms: DetectedForm[],
): Promise<void> => {
  logger.info("🛡️ Running defensive security checks...");
  logger.info(
    `Analyzing ${links.length.toLocaleString()} discovered link${
      links.length === 1 ? "" : "s"
    } for defensive indicators.`,
  );

  const checks: DefensiveCheckResult[] = [
    runRecaptchaCheck(links),
    runRateLimitCheck(forms),
  ];

  logger.info("=".repeat(64));
  logger.info("🧪 Defensive Checks Report");
  logger.info("=".repeat(64));

  for (const check of checks) {
    logger.info(
      `${iconForStatus(check.status)} ${check.name}\n  • ${check.details}`,
    );
  }

  logger.info("=".repeat(64));
  logger.info("✅ Defensive checks complete");
};
