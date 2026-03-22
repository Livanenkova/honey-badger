const fs = require("fs");
const path = require("path");
const cssPath = path.join(__dirname, "..", "styles.css");
const outPath = path.join(__dirname, "..", "pdf-fallback-styles.js");
const css = fs.readFileSync(cssPath, "utf8");
const escaped = css.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const js = "window.__HB_PDF_FALLBACK_CSS = `" + escaped + "`;\n";
fs.writeFileSync(outPath, js);
console.log("Wrote pdf-fallback-styles.js, length:", js.length);
