# PDF export: design vs text layer (ATS)

## The problem

We need **two ways** to download a CV as PDF:

1. **Default (with design)** — Blue section headings, gray accents, our layout. Must still have a **text layer** so ATS and recruiters can parse and copy text.
2. **ATS** — Plain, ATS-friendly layout. Must have a **text layer** (no images).

Current situation:

- **Print → Save as PDF** gives a real text layer and can show our design (if “Background graphics” is on), but:
  - The browser adds headers/footers (date, URL like `about:blank`) unless the user turns them off.
  - Extra steps (open print window, click button, disable headers/footers in the dialog) — poor UX.
- **Download as image** (html2canvas + jsPDF) gives pixel-perfect design but **no text layer**. ATS and recruiters cannot parse it; some refuse to process such PDFs.

So we cannot today offer “one click → PDF with our design and text layer” without either user steps (print) or a different technical approach.

## Options

### 1. Keep current flows (what we have now)

- **Save (print → PDF)** — Text layer, design (if user enables background graphics), but user must disable “Headers and footers” in the print dialog.
- **Download as image** — Design only, no text layer; for when design matters more than parsing.

**Pros:** No new dependencies, works offline.  
**Cons:** Print flow is not one-click and depends on user settings.

### 2. pdfmake for ATS PDF (implemented)

- Add **pdfmake** (client-side). Build a **document definition** from form data (name, headline, contacts, profile, key impact, competencies, experience, education, projects).
- Offer **“Download ATS PDF”** — one click, **real text layer**, simple black-and-white layout (no blue/gray design). Ideal for ATS and for recruiters who need to copy text.

**Pros:** One-click, guaranteed text layer, no print dialog, works offline.  
**Cons:** ATS layout is plain (no blue stripes); “default design” still needs the print flow or image export.

### 3. Default design + text layer in one click (future)

To get **our default design and a text layer in one click** without user print settings, we’d need one of:

- **Server/cloud API** — Send HTML to a service (e.g. DocRaptor, PDFShift) that returns a PDF with a text layer. Then we could offer “Download default PDF (with design, text layer)” as one click. Cost and dependency on external service.
- **Backend with Puppeteer/Playwright** — Headless browser on the server prints HTML to PDF with controlled options (no headers/footers). Requires a backend or serverless function; not “frontend-only” anymore.
- **Heavy client-side option** — Use jsPDF or pdfmake to **recreate the default layout programmatically** (position every block, font, color). High effort and two sources of truth (HTML preview vs PDF definition).

Recommendation: keep **default** as “print → PDF” (or image) for now; use **pdfmake for ATS** so at least one export is one-click and ATS-safe.

## What we implemented

- **Download ATS PDF** — Uses pdfmake. One click, text layer, simple ATS-friendly layout. No print dialog.
- **Save (print → PDF)** — Opens a window with the default design; user clicks “Save as PDF” and should disable “Headers and footers” in the dialog. Text layer + design.
- **Download as image** — html2canvas + jsPDF. Default design, no text layer.

So:

- For **ATS and parsing** → use **Download ATS PDF** (or print → PDF with headers/footers off).
- For **design only** (no parsing needed) → **Download as image**.
- For **design + text layer** → **Save (print → PDF)** and turn off headers/footers (and enable background graphics if you want colors).

## Files

- `index.html` — Scripts for pdfmake (and existing html2canvas/jspdf for image export).
- `app.js` — `runPdfExportAsAts(data, filename)` builds a pdfmake document definition from `buildInternalFromForm()` and triggers download.
- This doc: `docs/PDF-EXPORT.md`.
