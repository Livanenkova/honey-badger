# PDF export

Honey Badger currently has two PDF paths:

1. **Download PDF** — preview-matching PDF rendered by the serverless Puppeteer endpoint.
2. **Download ATS PDF** — plain pdfmake PDF with a reliable text layer for applicant tracking systems.

## Preview-matching PDF

The default export sends the current rendered CV HTML to `pdf-server/api/render-cv.js`. The server opens the HTML in headless Chromium and prints it to A4 PDF with backgrounds enabled and browser headers/footers disabled.

Before sending HTML to the server, the client prepares the preview DOM for export:

- balances page content;
- splits long list blocks when enabled;
- removes duplicate summary text from continued experience blocks;
- runs a final overflow pass so clipped text does not leak into the PDF text layer.

This path is intended to match the on-screen preview while keeping selectable/copyable text.

## ATS PDF

The ATS export uses pdfmake in the browser and builds a simpler single-column document from structured form data. It does not try to match the visual preview. Use this when parser reliability matters more than design.

## Server safeguards

The PDF endpoint is intentionally narrow:

- accepts only `POST`;
- rejects missing or oversized HTML payloads;
- sanitizes the download filename before writing `Content-Disposition`;
- sets Puppeteer timeouts;
- blocks external Chromium requests except Google Fonts and local/data/blob resources.

If this endpoint becomes shared beyond the static Honey Badger frontend, add authentication or a signed request flow. A static frontend cannot keep a shared secret private.

## Files

- `app.js` — export orchestration, DOM pagination, ATS pdfmake export.
- `pdf-server/api/render-cv.js` — serverless Chromium PDF renderer.
- `styles.css` — preview/export styles.
- `pdf-fallback-styles.js` — generated fallback copy of `styles.css`.

Regenerate fallback styles after CSS changes:

```sh
node scripts/inline-css.js
```
