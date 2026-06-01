const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const MAX_HTML_BYTES = 1_000_000;
const RENDER_TIMEOUT_MS = 25_000;
const ALLOWED_RESOURCE_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const ALLOWED_RESOURCE_PROTOCOLS = new Set(["about:", "data:", "blob:"]);

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sanitizeFilename(filename) {
  const raw = typeof filename === "string" && filename.trim() ? filename.trim() : "CV.pdf";
  const base = raw
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/[\r\n]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "CV.pdf";
  return base.toLowerCase().endsWith(".pdf") ? base : base + ".pdf";
}

function isAllowedResourceUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ALLOWED_RESOURCE_PROTOCOLS.has(url.protocol) || ALLOWED_RESOURCE_HOSTS.has(url.hostname);
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const { html, filename } = req.body || {};
  if (typeof html !== "string" || !html.trim()) {
    res.status(400).send("Missing html");
    return;
  }
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
    res.status(413).send("HTML payload too large");
    return;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(RENDER_TIMEOUT_MS);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (isAllowedResourceUrl(request.url())) {
        request.continue();
        return;
      }
      request.abort();
    });
    await page.setViewport({ width: 794, height: 1122, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: RENDER_TIMEOUT_MS });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 300));

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      displayHeaderFooter: false,
      preferCSSPageSize: false,
      waitForFonts: true,
    });

    const safeName = sanitizeFilename(filename);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
    );
    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to render PDF");
  } finally {
    if (browser) await browser.close();
  }
};
