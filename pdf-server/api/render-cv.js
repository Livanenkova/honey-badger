const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", right: "18mm", bottom: "18mm", left: "18mm" },
      displayHeaderFooter: false,
    });

    const safeName = typeof filename === "string" && filename.trim() ? filename.trim() : "CV.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${safeName}\"`);
    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to render PDF");
  } finally {
    if (browser) await browser.close();
  }
};

