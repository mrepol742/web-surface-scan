const puppeteer = require("puppeteer");

const CONFIG = {
  url: "",
  emailField: 'input[type="email"]',
  passwordField: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
  maxRequests: 999,
  delayMs: 5000,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateEmail(i) {
  return `hello-hunk-${Date.now()}-${i}@gmail.com`;
}

(async () => {
  
  const results = [];

  for (let i = 0; i < CONFIG.maxRequests; i++) {
    const browser = await puppeteer.launch({ headless: false });
    
    const page = await browser.newPage();

    // Capture the actual HTTP response status of the form POST.
    let responseStatus = null;
    page.on("response", (res) => {
      if (res.request().method() === "POST") {
        responseStatus = res.status();
      }
    });

    try {
      await page.goto(CONFIG.url, {
        waitUntil: "networkidle2",
        timeout: 10000,
      });

      // await page.waitForFunction(
      //   () => document.querySelectorAll('iframe').length > 0,
      //   { timeout: 10000 }
      // );
      
      // const allFrames = await page.$$('iframe');
      // console.log(`Found ${allFrames.length} iframes`);

      // const recaptchaFrame = page.frames().find((f) => f.url().includes('recaptcha') && f.url().includes('anchor'));
      // if (recaptchaFrame) {
      //   await recaptchaFrame.waitForSelector('#recaptcha-anchor', { timeout: 10000 });
      //   await recaptchaFrame.click('#recaptcha-anchor');
      // }

      // await sleep(CONFIG.delayMs * 2);
      
      // bro is genius adding login and register in onepage
      // but im also a genius
      await page.locator("button ::-p-text(Create Account)").click();

      await page.waitForSelector(CONFIG.emailField, { timeout: 5000 });
      await page.type(CONFIG.emailField, generateEmail(i), { delay: 20 });

      await page.waitForSelector(CONFIG.passwordField, { timeout: 5000 });
      await page.type(CONFIG.passwordField, "password", { delay: 20 });

      await Promise.all([
        page.click(CONFIG.submitButton),
        page
          .waitForNavigation({ waitUntil: "networkidle2", timeout: 5000 })
          .catch(() => {}),
      ]);

      console.log(
        `Request ${i + 1}/${CONFIG.maxRequests} -> status: ${responseStatus}`,
      );
      results.push({ i, status: responseStatus });

      if (
        responseStatus === 403 ||
        responseStatus === 429 ||
        responseStatus === 409
      ) {
        console.log(
          `Rate limit triggered at request ${i + 1} (status ${responseStatus}). Stopping.`,
        );
        await page.close();
        break;
      }
    } catch (err) {
      console.error(`Request ${i + 1} failed:`, err.message);
      results.push({ i, status: "error", error: err.message });
    }

   // await page.close();
   // await browser.close();

    await sleep(CONFIG.delayMs);
  }

  console.log("\nSummary:");
  console.table(results);

  
})();
