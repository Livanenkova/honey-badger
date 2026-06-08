(function () {
  "use strict";

  const REQUIRED_IDS = [
    "cvRoot", "renderBtn", "printBtn", "downloadJsonBtn",
    "jsonFileInput", "resetBtn", "fName", "fHeadline", "fContacts", "fProfile",
    "fImpact", "fChips", "fTools", "fEdu", "fProjects", "addExpBtn", "expList",
  ];

  const INPUT_DEBOUNCE_MS = 120;
  /** Запас в px при балансировке страниц, чтобы контент не обрезался в PDF (шрифты/субпиксель). */
  const PAGE_BALANCE_SAFETY_PX = 14;
  const DRAFT_STORAGE_KEY = "honey-badger-draft";
  const SPLIT_BLOCKS_STORAGE_KEY = "honey-badger-split-blocks";
  const DESKTOP_WORKVIEW_STORAGE_KEY = "honey-badger-desktop-work-view";
  const DRAFT_SAVE_DEBOUNCE_MS = 800;

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  window.addEventListener("DOMContentLoaded", () => {
    const missing = REQUIRED_IDS.filter((id) => !document.getElementById(id));
    if (missing.length) {
      alert(window.t("alert.requiredElementsMissing", { ids: missing.map((x) => "#" + x).join("\n") }));
      return;
    }

    const elRoot = document.getElementById("cvRoot");
    const elRender = document.getElementById("renderBtn");
    const elPrint = document.getElementById("printBtn");
    const elDownloadJson = document.getElementById("downloadJsonBtn");
    const elJsonFileInput = document.getElementById("jsonFileInput");
    const elReset = document.getElementById("resetBtn");
    const fJsonPaste = document.getElementById("fJsonPaste");
    const elApplyJson = document.getElementById("applyJsonBtn");
    const elImportJsonFile = document.getElementById("importJsonFileBtn");
    const fName = document.getElementById("fName");
    const fHeadline = document.getElementById("fHeadline");
    const fContacts = document.getElementById("fContacts");
    const fProfile = document.getElementById("fProfile");
    const fImpact = document.getElementById("fImpact");
    const fChips = document.getElementById("fChips");
    const fTools = document.getElementById("fTools");
    const coreCompetenciesDisplay = document.getElementById("coreCompetenciesDisplay");
    const toolsDisplay = document.getElementById("toolsDisplay");
    const fLanguages = document.getElementById("fLanguages");
    const fProfileTitle = document.getElementById("fProfileTitle");
    const fKeyImpactTitle = document.getElementById("fKeyImpactTitle");
    const fCoreCompetenciesTitle = document.getElementById("fCoreCompetenciesTitle");
    const fToolsTitle = document.getElementById("fToolsTitle");
    const fExpTitle = document.getElementById("fExpTitle");
    const fEducationTitle = document.getElementById("fEducationTitle");
    const fProjectsTitle = document.getElementById("fProjectsTitle");
    const fLanguagesTitle = document.getElementById("fLanguagesTitle");
    const fEdu = document.getElementById("fEdu");
    const fProjects = document.getElementById("fProjects");
    const elAddExp = document.getElementById("addExpBtn");
    const elExpList = document.getElementById("expList");
    const elJsonError = document.getElementById("jsonError");
    const elNameHint = document.getElementById("fNameHint");
    const elTemplateSelect = document.getElementById("templateSelect");
    const elSplitBlocksToggle = document.getElementById("splitBlocksToggle");
    const elWorkViewToggleBtn = document.getElementById("workViewToggleBtn");

    let formDirty = false;
    function setDirty() {
      formDirty = true;
    }
    function clearDirty() {
      formDirty = false;
    }

    function updateNameHint() {
      if (!elNameHint) return;
      const name = (fName && fName.value || "").trim();
      if (name.length === 0) {
        elNameHint.textContent = typeof window.t === "function" ? window.t("validation.nameEmpty") : "";
        elNameHint.removeAttribute("hidden");
      } else {
        elNameHint.textContent = "";
        elNameHint.setAttribute("hidden", "");
      }
    }

    function defaultPdfFilename() {
      const raw = (fName && fName.value || "").trim();
      const safe = raw.replace(/\s+/g, "_").replace(/[^\w\u00C0-\u024F\-_.]/g, "");
      return (safe || "CV") + ".pdf";
    }

    const SECTION_TITLE_FIELDS = [
      [fProfileTitle, "profile", "profileTitle"],
      [fKeyImpactTitle, "keyImpact", "keyImpactTitle"],
      [fCoreCompetenciesTitle, "coreCompetencies", "coreCompetenciesTitle"],
      [fToolsTitle, "tools", "toolsTitle"],
      [fExpTitle, "experience", "experienceTitle"],
      [fEducationTitle, "education", "educationTitle"],
      [fProjectsTitle, "projects", "projectsTitle"],
      [fLanguagesTitle, "languages", "languagesTitle"],
    ];

    function setSectionTitleDefaults() {
      SECTION_TITLE_FIELDS.forEach(([el, key]) => {
        if (el && typeof window.t === "function") el.value = window.t("section." + key);
      });
    }

    function getSectionTitle(el, key) {
      const v = el && el.value.trim();
      return v || (typeof window.t === "function" ? window.t("section." + key) : "");
    }

    function showJsonError(message) {
      if (elJsonError) {
        elJsonError.textContent = message;
        elJsonError.removeAttribute("hidden");
        if (fJsonPaste) fJsonPaste.setAttribute("aria-invalid", "true");
      }
    }

    function clearJsonError() {
      if (elJsonError) {
        elJsonError.textContent = "";
        elJsonError.classList.remove("json-error--success");
        elJsonError.setAttribute("hidden", "");
        if (fJsonPaste) fJsonPaste.setAttribute("aria-invalid", "false");
      }
    }

    function showJsonSuccess(message) {
      if (elJsonError) {
        elJsonError.textContent = message;
        elJsonError.classList.add("json-error--success");
        elJsonError.removeAttribute("hidden");
        if (fJsonPaste) fJsonPaste.setAttribute("aria-invalid", "false");
        setTimeout(clearJsonError, 2500);
      }
    }

  // ---------- STATE ----------
  let expItems = [];

  // ---------- HELPERS ----------
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m]));
  }

  function toTitleCase(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  }

  /** Returns mailto:, https: or tel: URL for a contact line, or null if not a link. */
  function contactHref(c) {
    const s = String(c ?? "").trim();
    if (!s) return null;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "mailto:" + s;
    if (/^https?:\/\//i.test(s)) return s;
    if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/.*)?$/i.test(s) || /linkedin\.com|github\.com/i.test(s))
      return s.startsWith("//") ? "https:" + s : /^https?:\/\//i.test(s) ? s : "https://" + s;
    // Phone numbers: allow digits, spaces, (), + and dashes; normalize to E.164-like tel: link
    const phoneRaw = s.replace(/[\s()-]/g, "");
    if (/^\+?\d{7,}$/.test(phoneRaw)) {
      const normalized = phoneRaw.startsWith("+") ? phoneRaw : "+" + phoneRaw;
      return "tel:" + normalized;
    }
    return null;
  }

  /** Returns HTML for one contact: <a href="..."> or plain text. */
  function contactToLinkHtml(c) {
    const s = String(c ?? "").trim();
    if (!s) return "";
    const href = contactHref(s);
    if (href) return `<a class="contact__link" href="${esc(href)}">${esc(s)}</a>`;
    return esc(s);
  }

  function lines(t) {
    return String(t || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  const BULLET = "• ";
  function linesFromBulletList(t) {
    return String(t || "")
      .split("\n")
      .map((l) => l.replace(/^[•·]\s*/, "").trim())
      .filter(Boolean);
  }
  function formatBulletList(arr) {
    return (arr || [])
      .map((s) => (typeof s === "string" ? s : s?.text || "").trim())
      .filter(Boolean)
      .map((s) => BULLET + s)
      .join("\n");
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function sectionHead(title, variant = "blue") {
    // variant: "blue" | "grey"
    const cls = variant === "grey" ? "section__head section__head--grey" : "section__head";
    return `
      <div class="${cls}">
        <div class="section__title">${esc(title)}</div>
        <div class="section__line"></div>
      </div>
    `;
  }

  function sectionHeadAts(title) {
    return `
      <div class="section__head section__head--ats">
        <div class="section__title">${esc(title)}</div>
      </div>
    `;
  }

  function listHtml(items) {
    if (!items?.length) return "";
    return `<ul class="list">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }

  function inlineListHtml(items, className = "inline-list") {
    const list = (items || []).map((i) => String(i || "").trim()).filter(Boolean);
    if (!list.length) return "";
    return `<p class="${className}">${list.map(esc).join(" · ")}</p>`;
  }

  function getDisplayMode(el, fallback = "dots") {
    const value = el && typeof el.value === "string" ? el.value : fallback;
    return value === "chips" || value === "dots" ? value : fallback;
  }

  function normalizeTextBullets(arr) {
    // supports [{text}] or ["text"] or [{text:{...}}] -> будет пусто
    return (arr || [])
      .map((b) => {
        if (typeof b === "string") return b;
        if (b && typeof b === "object" && typeof b.text === "string") return b.text;
        return "";
      })
      .map((t) => String(t).trim())
      .filter(Boolean);
  }

  function unwrapPayload(data) {
    if (data && typeof data === "object") {
      if (data.json && typeof data.json === "object") return data.json;
      if (data.data && typeof data.data === "object") return data.data;
    }
    return data;
  }

  /** Normalizes incoming date string to ATS-friendly format: MM/YYYY or YYYY. */
  function normalizeDateForAts(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";

    // 1) YYYY-MM or YYYY/MM or YYYY.MM (optional day)
    let m = s.match(/^(\d{4})[-\/.](\d{1,2})(?:[-\/.]\d{1,2})?$/);
    if (m) {
      const year = m[1];
      const month = String(Math.min(Math.max(parseInt(m[2], 10) || 1, 1), 12)).padStart(2, "0");
      return month + "/" + year;
    }

    // 2) MM/YYYY or M/YYYY
    m = s.match(/^(\d{1,2})[-\/.](\d{4})$/);
    if (m) {
      const month = String(Math.min(Math.max(parseInt(m[1], 10) || 1, 1), 12)).padStart(2, "0");
      const year = m[2];
      return month + "/" + year;
    }

    // 3) Month YYYY (Mar 2019 / March 2019)
    m = s.match(/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})$/i);
    if (m) {
      const monthName = m[1].toLowerCase().slice(0, 3);
      const monthMap = {
        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        oct: "10",
        nov: "11",
        dec: "12",
      };
      const month = monthMap[monthName] || "01";
      const year = m[2];
      return month + "/" + year;
    }

    // 4) Year only
    if (/^\d{4}$/.test(s)) return s;

    // Fallback: leave as-is if we can't confidently parse
    return s;
  }

  function toMonthYearRange(startDate, endDate) {
    const s = normalizeDateForAts(startDate);
    const e = normalizeDateForAts(endDate);
    if (s && e) return `${s} - ${e}`; // keep ASCII hyphen
    return s || e || "";
  }

  // ---------- EXPERIENCE EDITOR ----------
  function expTemplate(item, idx) {
    const t = (key) => (typeof window.t === "function" ? window.t(key) : "Drag to reorder");
    const dragLabel = t("label.dragToReorder");
    const dragAria = t("aria.dragToReorder");
    return `
      <div class="expItem" data-idx="${idx}" draggable="false">
        <div class="expItem__drag-row">
          <span class="expItem-dragHandle" draggable="true" role="button" aria-label="${esc(dragAria)}" title="${esc(dragAria)}" tabindex="0">
            <span class="expItem-dragHandle__icon" aria-hidden="true">⋮⋮</span>
            <span class="expItem-dragHandle__label">${esc(dragLabel)}</span>
          </span>
        </div>
        <div class="row">
          <div class="field">
            <label>${esc(window.t("label.company"))}</label>
            <input class="xCompany" value="${esc(item.company)}" />
          </div>
          <div class="field">
            <label>${esc(window.t("label.title"))}</label>
            <input class="xTitle" value="${esc(item.title)}" />
          </div>
        </div>

        <div class="field">
          <label>${esc(window.t("label.meta"))}</label>
          <input class="xMeta" value="${esc(item.meta)}" />
        </div>

        <div class="field">
          <label>${esc(window.t("label.summary"))}</label>
          <input class="xSummary" value="${esc(item.summary)}" />
        </div>

        <div class="field">
          <label>${esc(window.t("label.bullets"))}</label>
          <textarea class="xBullets">${esc(formatBulletList(item.bullets))}</textarea>
        </div>

        <div class="expActions">
          <button class="mini-btn xUp" type="button" aria-label="${esc(window.t("aria.moveUp"))}">${esc(window.t("button.moveUp"))}</button>
          <button class="mini-btn xDown" type="button" aria-label="${esc(window.t("aria.moveDown"))}">${esc(window.t("button.moveDown"))}</button>
          <button class="mini-btn xDel" type="button" aria-label="${esc(window.t("aria.deleteExperience"))}">${esc(window.t("button.delete"))}</button>
        </div>
      </div>
    `;
  }

  function renderExpEditor() {
    elExpList.innerHTML = expItems.map((it, i) => expTemplate(it, i)).join("");
    const hint = elExpList.querySelector(".exp-empty-hint");
    if (hint) hint.remove();
    if (expItems.length === 0) {
      const p = document.createElement("p");
      p.className = "exp-empty-hint hint";
      p.textContent = window.t("empty.experience");
      p.setAttribute("aria-live", "polite");
      elExpList.appendChild(p);
    }
  }

  function syncFromEditor() {
    const nodes = elExpList.querySelectorAll(".expItem");
    expItems = [...nodes].map((box) => ({
      company: box.querySelector(".xCompany").value.trim(),
      title: box.querySelector(".xTitle").value.trim(),
      meta: box.querySelector(".xMeta").value.trim(),
      summary: box.querySelector(".xSummary").value.trim(),
      bullets: linesFromBulletList(box.querySelector(".xBullets").value),
    }));
  }

  elExpList.addEventListener("input", debounce(syncFromEditor, INPUT_DEBOUNCE_MS));

  elExpList.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const ta = e.target;
    if (!ta.matches || !ta.matches("textarea.xBullets")) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;
    const insert = "\n" + BULLET;
    ta.value = val.slice(0, start) + insert + val.slice(end);
    ta.selectionStart = ta.selectionEnd = start + insert.length;
    e.preventDefault();
  });
  elExpList.addEventListener("focusout", (e) => {
    const ta = e.target;
    if (!ta.matches || !ta.matches("textarea.xBullets")) return;
    const items = linesFromBulletList(ta.value);
    if (items.length) ta.value = formatBulletList(items);
  });
  (function initExpDragDrop() {
    elExpList.addEventListener("dragstart", (e) => {
      const handle = e.target.closest(".expItem-dragHandle");
      if (!handle) return;
      const box = handle.closest(".expItem");
      if (!box) return;
      e.dataTransfer.setData("text/plain", String(box.dataset.idx));
      e.dataTransfer.effectAllowed = "move";
      handle.closest(".expItem").classList.add("expItem--dragging");
    });
    elExpList.addEventListener("dragend", () => {
      document.querySelectorAll(".expItem--dragging").forEach((el) => el.classList.remove("expItem--dragging"));
      elExpList.querySelectorAll(".expItem--drop-target").forEach((el) => el.classList.remove("expItem--drop-target"));
    });
    elExpList.addEventListener("dragover", (e) => {
      const over = e.target.closest(".expItem");
      if (over) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        elExpList.querySelectorAll(".expItem--drop-target").forEach((el) => el.classList.remove("expItem--drop-target"));
        over.classList.add("expItem--drop-target");
      }
    });
    elExpList.addEventListener("dragleave", (e) => {
      if (!elExpList.contains(e.relatedTarget)) {
        elExpList.querySelectorAll(".expItem--drop-target").forEach((el) => el.classList.remove("expItem--drop-target"));
      }
    });
    elExpList.addEventListener("drop", (e) => {
      e.preventDefault();
      elExpList.querySelectorAll(".expItem--drop-target").forEach((el) => el.classList.remove("expItem--drop-target"));
      const targetItem = e.target.closest(".expItem");
      if (!targetItem) return;
      const srcIdx = Number(e.dataTransfer.getData("text/plain"));
      const tgtIdx = Number(targetItem.dataset.idx);
      if (Number.isNaN(srcIdx) || Number.isNaN(tgtIdx) || srcIdx === tgtIdx) return;
      syncFromEditor();
      const moved = expItems.splice(srcIdx, 1)[0];
      expItems.splice(tgtIdx, 0, moved);
      renderExpEditor();
      renderDoc(buildInternalFromForm());
    });
  })();

  elExpList.addEventListener("click", (e) => {
    const box = e.target.closest(".expItem");
    if (!box) return;
    const idx = Number(box.dataset.idx);

    if (e.target.classList.contains("xDel")) {
      syncFromEditor();
      expItems.splice(idx, 1);
      renderExpEditor();
      return;
    }
    if (e.target.classList.contains("xUp") && idx > 0) {
      syncFromEditor();
      [expItems[idx - 1], expItems[idx]] = [expItems[idx], expItems[idx - 1]];
      renderExpEditor();
      return;
    }
    if (e.target.classList.contains("xDown") && idx < expItems.length - 1) {
      syncFromEditor();
      [expItems[idx + 1], expItems[idx]] = [expItems[idx], expItems[idx + 1]];
      renderExpEditor();
      return;
    }
  });

  elAddExp.addEventListener("click", () => {
    expItems.push({
      company: "",
      title: "",
      meta: "",
      summary: "",
      bullets: [],
    });
    renderExpEditor();
  });

  function onBulletListEnter(ta) {
    if (!ta) return;
    ta.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const insert = "\n" + BULLET;
      ta.value = val.slice(0, start) + insert + val.slice(end);
      ta.selectionStart = ta.selectionEnd = start + insert.length;
      e.preventDefault();
    });
    ta.addEventListener("blur", () => {
      const items = linesFromBulletList(ta.value);
      if (items.length) ta.value = formatBulletList(items);
    });
  }
  onBulletListEnter(fImpact);
  onBulletListEnter(fChips);
  onBulletListEnter(fTools);
  onBulletListEnter(fLanguages);

  (function initExpandableFields() {
    const EXPANDED_HEIGHT = 180;
    const COLLAPSED_HEIGHT = 70;
    const panel = document.querySelector(".panel");
    if (!panel) return;
    panel.addEventListener("focusin", (e) => {
      const ta = e.target;
      if (ta.matches?.(".field textarea")) ta.style.height = EXPANDED_HEIGHT + "px";
    });
    panel.addEventListener("focusout", (e) => {
      const ta = e.target;
      if (ta.matches?.(".field textarea")) ta.style.height = COLLAPSED_HEIGHT + "px";
    });
  })();

  // ---------- INTERNAL DATA (flat JSON: no page1/page2) ----------
  function buildInternalFromForm() {
    const experience = expItems.map((x) => ({
      company: x.company,
      title: x.title,
      meta: x.meta,
      summary: x.summary,
      bullets: x.bullets.map((t) => ({ text: t, tags: ["all"] })),
    }));
    const education = lines(fEdu.value);
    const projects = lines(fProjects.value);

    return {
      schemaVersion: "cv.v1",
      name: fName.value.trim(),
      headline: fHeadline.value.trim(),
      contacts: lines(fContacts.value),
      profile: { all: fProfile.value.trim() },
      keyImpact: linesFromBulletList(fImpact.value).map((t) => ({ text: t, tags: ["all"] })),
      coreCompetencies: linesFromBulletList(fChips.value).map((t) => ({ text: t, tags: ["all"] })),
      coreCompetenciesDisplay: getDisplayMode(coreCompetenciesDisplay, "chips"),
      tools: linesFromBulletList(fTools.value).map((t) => ({ text: t, tags: ["all"] })),
      toolsDisplay: getDisplayMode(toolsDisplay, "dots"),
      languages: linesFromBulletList(fLanguages?.value || "").map((t) => ({ text: t, tags: ["all"] })),
      ...Object.fromEntries(
        SECTION_TITLE_FIELDS.map(([el, key, dataKey]) => [dataKey, getSectionTitle(el, key)])
      ),
      experience,
      education,
      projects,
    };
  }

  function dataToBlocks(d) {
    const exp = d.experience || [];
    const expBlocks = exp.map((x) => ({
      type: "experience",
      title: [x.company, x.title].filter(Boolean).join(" - "),
      meta: x.meta,
      subtitle: x.summary,
      bullets: (x.bullets || []).map((b) => (typeof b === "string" ? { text: b, tags: ["all"] } : b)),
    }));
    const edu = d.education || [];
    const proj = d.projects || [];
    const eduTitle = (d.educationTitle && d.educationTitle.trim()) || (typeof window.t === "function" ? window.t("section.education") : "EDUCATION");
    const projTitle = (d.projectsTitle && d.projectsTitle.trim()) || (typeof window.t === "function" ? window.t("section.projects") : "PROJECTS");
    return [
      ...expBlocks,
      ...(edu.length ? [{ type: "section", title: eduTitle, bullets: edu.map((t) => ({ text: t, tags: ["all"] })) }] : []),
      ...(proj.length ? [{ type: "section", title: projTitle, className: "section--projects", bullets: proj.map((t) => ({ text: t, tags: ["all"] })) }] : []),
    ];
  }

  function getPageBottomMarginPx(pageEl) {
    if (!pageEl) return 0;
    return parseFloat(getComputedStyle(pageEl).paddingBottom) || 0;
  }

  function getEffectivePageBottomPx(pageEl) {
    const marginBottomPx = getPageBottomMarginPx(pageEl);
    const rect = pageEl.getBoundingClientRect();
    return rect.bottom - marginBottomPx - PAGE_BALANCE_SAFETY_PX;
  }

  function getSplitBlocksEnabled() {
    return !!(elSplitBlocksToggle && elSplitBlocksToggle.checked);
  }

  /** Small visible hint that this experience block continues from the previous page. */
  function addExperienceContinuationLabel(sectionEl) {
    if (!sectionEl || !sectionEl.classList || !sectionEl.classList.contains("expBlock--continued")) return;
    if (sectionEl.querySelector(".expBlock__continued-label")) return;
    const p = document.createElement("p");
    p.className = "expBlock__continued-label";
    p.textContent = typeof window.t === "function" ? window.t("experience.continued") : "(continued)";
    if (typeof window.t === "function") {
      p.setAttribute("aria-label", window.t("experience.continuedAria"));
    }
    sectionEl.insertBefore(p, sectionEl.firstChild);
  }

  function removeExperienceContinuationSummary(sectionEl) {
    if (!sectionEl || !sectionEl.classList || !sectionEl.classList.contains("expBlock")) return;
    sectionEl.querySelectorAll(".body--tight").forEach((el) => el.remove());
  }

  function markSectionAsContinued(sectionEl) {
    if (!sectionEl || !sectionEl.classList || !sectionEl.classList.contains("section--continued")) return;
    const titleEl = sectionEl.querySelector(".section__title");
    if (!titleEl) return;
    const suffix = typeof window.t === "function" ? window.t("section.continuedSuffix") : " (continued)";
    if (!suffix) return;
    const raw = (titleEl.textContent || "").trim();
    if (!raw) return;
    if (raw.includes(suffix.trim())) return;
    titleEl.textContent = raw + suffix;
  }

  function getSectionContinuationSuffix() {
    return typeof window.t === "function" ? window.t("section.continuedSuffix") : " (continued)";
  }

  function getSectionBaseTitle(title) {
    const raw = String(title || "").trim();
    if (!raw) return "";
    const suffix = getSectionContinuationSuffix();
    if (suffix && raw.endsWith(suffix)) {
      return raw.slice(0, Math.max(0, raw.length - suffix.length)).trim();
    }
    return raw.replace(/\s+\((continued|продолжение)\)\s*$/i, "").trim();
  }

  function clearSectionContinuedMark(sectionEl) {
    if (!sectionEl || !sectionEl.classList) return;
    sectionEl.classList.remove("section--continued");
    const titleEl = sectionEl.querySelector(".section__title");
    if (!titleEl) return;
    titleEl.textContent = getSectionBaseTitle(titleEl.textContent || "");
  }

  function markAllSectionContinuations(rootEl) {
    if (!rootEl || !rootEl.querySelectorAll) return;
    const sections = Array.from(rootEl.querySelectorAll(".page .section"));
    sections.forEach((sectionEl, idx) => {
      if (!sectionEl.classList.contains("section--continued")) return;
      const titleEl = sectionEl.querySelector(".section__title");
      const listEl = sectionEl.querySelector(".list");
      if (!titleEl || !listEl || !listEl.children.length) {
        clearSectionContinuedMark(sectionEl);
        return;
      }

      const baseTitle = getSectionBaseTitle(titleEl.textContent || "");
      if (!baseTitle) {
        clearSectionContinuedMark(sectionEl);
        return;
      }

      const hasPreviousPart = sections.slice(0, idx).some((prev) => {
        const prevTitle = prev.querySelector(".section__title");
        const prevList = prev.querySelector(".list");
        if (!prevTitle || !prevList || !prevList.children.length) return false;
        const prevBaseTitle = getSectionBaseTitle(prevTitle.textContent || "");
        return prevBaseTitle === baseTitle;
      });

      if (!hasPreviousPart) {
        clearSectionContinuedMark(sectionEl);
        return;
      }

      markSectionAsContinued(sectionEl);
    });
  }

  function isElementOverflowingPage(pageEl, element) {
    if (!pageEl || !element) return false;
    return element.getBoundingClientRect().bottom > getEffectivePageBottomPx(pageEl);
  }

  function moveOverflowListItemsToNextPage(pageEl, nextPageEl) {
    if (!getSplitBlocksEnabled()) return false;
    const block = pageEl && pageEl.lastElementChild;
    if (!block || !block.matches) return false;
    const isExperienceBlock = block.matches(".expBlock");
    const isSplittableSection = block.matches(".section") && !isExperienceBlock;
    if (!isExperienceBlock && !isSplittableSection) return false;
    if (!isElementOverflowingPage(pageEl, block)) return false;

    const list = block.querySelector(".list");
    if (!list) return false;
    const items = Array.from(list.children || []);
    if (items.length < 2) return false;

    const continuation = block.cloneNode(true);
    if (isExperienceBlock) {
      continuation.classList.add("expBlock--continued");
      continuation.classList.remove("section--divider");
      removeExperienceContinuationSummary(continuation);
    } else {
      continuation.classList.add("section--continued");
      markSectionAsContinued(continuation);
    }
    const continuationList = continuation.querySelector(".list");
    if (!continuationList) return false;
    continuationList.innerHTML = "";

    let moved = 0;
    while (list.children.length > 0 && isElementOverflowingPage(pageEl, block)) {
      const li = list.lastElementChild;
      continuationList.insertBefore(li, continuationList.firstElementChild);
      moved++;
    }

    if (moved === 0) return false;
    if (isExperienceBlock && list.children.length === 0) {
      if (block.classList.contains("expBlock--continued")) {
        while (continuationList.firstElementChild) {
          list.appendChild(continuationList.firstElementChild);
        }
        return false;
      }
      if (isElementOverflowingPage(pageEl, block)) {
        while (continuationList.firstElementChild) {
          list.appendChild(continuationList.firstElementChild);
        }
        return false;
      }
      list.remove();
    }
    if (!list.children.length) {
      list.remove();
      if (isSplittableSection) block.remove();
    }
    if (isExperienceBlock) addExperienceContinuationLabel(continuation);
    nextPageEl.insertBefore(continuation, nextPageEl.firstElementChild);
    return true;
  }

  function splitBlockToFitCurrentPage(blockEl, currentPageEl, nextPageEl) {
    if (!getSplitBlocksEnabled()) return false;
    if (!blockEl || !currentPageEl || !nextPageEl) return false;
    if (!blockEl.matches) return false;
    const isExperienceBlock = blockEl.matches(".expBlock");
    const isSplittableSection = blockEl.matches(".section") && !isExperienceBlock;
    if (!isExperienceBlock && !isSplittableSection) return false;
    if (!isElementOverflowingPage(currentPageEl, blockEl)) return false;

    const list = blockEl.querySelector(".list");
    if (!list) return false;
    const items = Array.from(list.children || []);
    if (items.length < 2) return false;

    const continuation = blockEl.cloneNode(true);
    if (isExperienceBlock) {
      continuation.classList.add("expBlock--continued");
      continuation.classList.remove("section--divider");
      removeExperienceContinuationSummary(continuation);
    } else {
      continuation.classList.add("section--continued");
      markSectionAsContinued(continuation);
    }
    const continuationList = continuation.querySelector(".list");
    if (!continuationList) return false;
    continuationList.innerHTML = "";

    let moved = 0;
    while (list.children.length > 0 && isElementOverflowingPage(currentPageEl, blockEl)) {
      const li = list.lastElementChild;
      continuationList.insertBefore(li, continuationList.firstElementChild);
      moved++;
    }

    if (moved === 0 || isElementOverflowingPage(currentPageEl, blockEl)) {
      while (continuationList.firstElementChild) {
        list.appendChild(continuationList.firstElementChild);
      }
      return false;
    }
    if (isExperienceBlock && list.children.length === 0) {
      if (blockEl.classList.contains("expBlock--continued")) {
        while (continuationList.firstElementChild) {
          list.appendChild(continuationList.firstElementChild);
        }
        return false;
      }
      list.remove();
    }

    if (!list.children.length) {
      list.remove();
      if (isSplittableSection) blockEl.remove();
    }
    if (isExperienceBlock) addExperienceContinuationLabel(continuation);
    nextPageEl.insertBefore(continuation, nextPageEl.firstElementChild);
    return true;
  }

  /**
   * After pagination, two fragments of the same job can end up on the same .page
   * (false split or later reflow). Merge them into one block so the header is not duplicated.
   */
  function mergeSamePageExpContinuations(root) {
    if (!root) return;
    root.querySelectorAll(".page").forEach((page) => {
      let changed = true;
      while (changed) {
        changed = false;
        const blocks = Array.from(page.querySelectorAll(".expBlock"));
        for (let i = 0; i < blocks.length - 1; i++) {
          const a = blocks[i];
          const b = blocks[i + 1];
          if (!b.classList || !b.classList.contains("expBlock--continued")) continue;
          if (a.nextElementSibling !== b) continue;

          const roleA = a.querySelector(".exp__role")?.textContent?.trim() || "";
          const metaA = a.querySelector(".exp__meta")?.textContent?.trim() || "";
          const roleB = b.querySelector(".exp__role")?.textContent?.trim() || "";
          const metaB = b.querySelector(".exp__meta")?.textContent?.trim() || "";
          if (roleA !== roleB || metaA !== metaB) continue;

          const listA = a.querySelector(".list");
          const listB = b.querySelector(".list");
          if (!listA || !listB) continue;

          while (listB.firstElementChild) {
            listA.appendChild(listB.firstElementChild);
          }
          b.remove();
          changed = true;
          break;
        }
      }
    });
  }

  function removeEmptyExperienceContinuations(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll(".expBlock--continued").forEach((block) => {
      const list = block.querySelector(".list");
      if (list && list.children.length > 0) return;
      block.remove();
    });
  }

  function moveOrphanExperienceHeading(root) {
    if (!root || !root.querySelectorAll) return;
    const expSection = root.querySelector(".section--experience");
    if (!expSection) return;
    const container = expSection.querySelector(".experience-container");
    if (container && container.children.length > 0) return;

    const firstExpBlock = root.querySelector(".page .expBlock");
    if (!firstExpBlock) {
      expSection.remove();
      return;
    }
    if (expSection.parentElement === firstExpBlock.parentElement && expSection.nextElementSibling === firstExpBlock) return;

    firstExpBlock.parentElement.insertBefore(expSection, firstExpBlock);
  }

  function balancePages() {
    elRoot.classList.remove("doc--two-pages", "doc--multi-pages");
    const pages = elRoot.querySelectorAll(".page");
    const p1 = pages[0];
    const p2 = pages[1];
    if (!p1 || !p2) return;

    const appendTarget = p1.querySelector(".experience-container") || p1;
    const marginBottom = getPageBottomMarginPx(p1);

    while (p2.firstElementChild) {
      const candidate = p2.firstElementChild;
      appendTarget.appendChild(candidate);

      const p1Rect = p1.getBoundingClientRect();
      const candRect = candidate.getBoundingClientRect();
      const effectiveBottom = p1Rect.bottom - marginBottom - PAGE_BALANCE_SAFETY_PX;

      if (candRect.bottom > effectiveBottom) {
        if (splitBlockToFitCurrentPage(candidate, p1, p2)) {
          break;
        }
        p2.insertBefore(candidate, p2.firstElementChild);
        break;
      }
    }

    if (!p2.children.length) {
      p2.classList.add("page--empty");
      p1.classList.remove("page--break");
      return;
    }

    splitPage2IntoPage3();
    ensureNoPageOverflows();
    rebalanceAllPagePairs();
    ensureNoPageOverflows();
    removeEmptyExperienceContinuations(elRoot);
    moveOrphanExperienceHeading(elRoot);
    const pageCount = elRoot.querySelectorAll(".page").length;
    elRoot.classList.toggle("doc--two-pages", pageCount === 2);
    elRoot.classList.toggle("doc--multi-pages", pageCount >= 3);
  }

  function rebalanceAllPagePairs() {
    const MAX_PASSES = 20;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let changed = false;
      const pages = Array.from(elRoot.querySelectorAll(".page"));
      if (pages.length < 2) break;

      for (let i = 0; i < pages.length - 1; i++) {
        const currentPage = pages[i];
        const nextPage = pages[i + 1];
        const appendTarget =
          i === 0
            ? currentPage.querySelector(".experience-container") || currentPage
            : currentPage;

        while (nextPage.firstElementChild) {
          const candidate = nextPage.firstElementChild;
          appendTarget.appendChild(candidate);

          if (isElementOverflowingPage(currentPage, candidate)) {
            if (splitBlockToFitCurrentPage(candidate, currentPage, nextPage)) {
              changed = true;
            } else {
              nextPage.insertBefore(candidate, nextPage.firstElementChild);
            }
            break;
          }

          changed = true;
        }

        if (nextPage.children.length === 0) {
          const prev = nextPage.previousElementSibling;
          if (prev && prev.classList && prev.classList.contains("page-break-preview")) prev.remove();
          nextPage.remove();
          changed = true;
          break;
        }
      }

      if (!changed) break;
    }
    mergeSamePageExpContinuations(elRoot);
    removeEmptyExperienceContinuations(elRoot);
    moveOrphanExperienceHeading(elRoot);
    markAllSectionContinuations(elRoot);
  }

  function splitPage2IntoPage3() {
    const pages = elRoot.querySelectorAll(".page");
    const p2 = pages[1];
    if (!p2 || p2.classList.contains("page--empty")) return;

    const effectiveBottom = getEffectivePageBottomPx(p2);
    const lastChild = p2.lastElementChild;
    if (!lastChild) return;
    if (lastChild.getBoundingClientRect().bottom <= effectiveBottom) return;

    const p3 = document.createElement("section");
    p3.className = "page";
    const break3 = document.createElement("div");
    break3.className = "page-break-preview";
    break3.setAttribute("aria-hidden", "true");
    break3.innerHTML = "<span>— Page 3 —</span>";

    while (p2.lastElementChild && p2.lastElementChild.getBoundingClientRect().bottom > getEffectivePageBottomPx(p2)) {
      if (moveOverflowListItemsToNextPage(p2, p3)) continue;
      const last = p2.lastElementChild;
      p3.insertBefore(last, p3.firstElementChild);
    }

    if (p3.children.length === 0) return;
    if (p2.children.length === 0) {
      while (p3.firstElementChild) {
        p2.appendChild(p3.firstElementChild);
      }
      return;
    }
    p2.after(break3, p3);
  }

  function ensureNoPageOverflows() {
    for (;;) {
      const pages = elRoot.querySelectorAll(".page");
      const last = pages[pages.length - 1];
      if (!last) break;

      const effectiveBottom = getEffectivePageBottomPx(last);
      const lastChild = last.lastElementChild;
      const isOverflowing = !!lastChild && lastChild.getBoundingClientRect().bottom > effectiveBottom;
      if (!isOverflowing) break;

      const pageNum = pages.length + 1;
      const breakEl = document.createElement("div");
      breakEl.className = "page-break-preview";
      breakEl.setAttribute("aria-hidden", "true");
      breakEl.innerHTML = `<span>— Page ${pageNum} —</span>`;
      const newPage = document.createElement("section");
      newPage.className = "page";

      while (last.lastElementChild && last.lastElementChild.getBoundingClientRect().bottom > getEffectivePageBottomPx(last)) {
        if (moveOverflowListItemsToNextPage(last, newPage)) continue;
        const child = last.lastElementChild;
        newPage.insertBefore(child, newPage.firstElementChild);
      }
      if (last.children.length === 0) {
        while (newPage.firstElementChild) {
          last.appendChild(newPage.firstElementChild);
        }
        break;
      }
      last.after(breakEl, newPage);
    }
    mergeSamePageExpContinuations(elRoot);
    removeEmptyExperienceContinuations(elRoot);
    moveOrphanExperienceHeading(elRoot);
  }

  function createPageAfter(pageEl, pageNum) {
    const breakEl = document.createElement("div");
    breakEl.className = "page-break-preview";
    breakEl.setAttribute("aria-hidden", "true");
    breakEl.innerHTML = `<span>— Page ${pageNum} —</span>`;
    const newPage = document.createElement("section");
    newPage.className = "page";
    pageEl.after(breakEl, newPage);
    return newPage;
  }

  function getNextPageForOverflow(pageEl, pageIndex) {
    let next = pageEl.nextElementSibling;
    if (next && next.classList && next.classList.contains("page-break-preview")) {
      next = next.nextElementSibling;
    }
    if (next && next.classList && next.classList.contains("page")) return next;
    return createPageAfter(pageEl, pageIndex + 2);
  }

  function ensureAllPagesDoNotOverflow(rootEl = elRoot) {
    if (!rootEl || !rootEl.querySelectorAll) return;
    const MAX_PASSES = 60;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let changed = false;
      const pages = Array.from(rootEl.querySelectorAll(".page"));
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        let guard = 0;
        while (
          page.lastElementChild &&
          isElementOverflowingPage(page, page.lastElementChild) &&
          guard < 80
        ) {
          const nextPage = getNextPageForOverflow(page, i);
          if (moveOverflowListItemsToNextPage(page, nextPage)) {
            changed = true;
            guard++;
            continue;
          }
          const child = page.lastElementChild;
          nextPage.insertBefore(child, nextPage.firstElementChild);
          changed = true;
          guard++;
        }
      }
      removeEmptyPages(rootEl);
      mergeSamePageExpContinuations(rootEl);
      removeEmptyExperienceContinuations(rootEl);
      moveOrphanExperienceHeading(rootEl);
      markAllSectionContinuations(rootEl);
      if (!changed) break;
    }
    const pageCount = rootEl.querySelectorAll(".page").length;
    rootEl.classList.toggle("doc--two-pages", pageCount === 2);
    rootEl.classList.toggle("doc--multi-pages", pageCount >= 3);
  }

  // ---------- RENDER ----------
  function renderDoc(d) {
    const template = (elTemplateSelect && elTemplateSelect.value) || "default";
    const isAts = template === "ats";
    elRoot.classList.toggle("doc--ats", isAts);

    const impacts = (d.keyImpact || []).map((x) => x.text);
    const chips = (d.coreCompetencies || []).map((x) => x.text);
    const tools = (d.tools || []).map((x) => (typeof x === "string" ? x : x.text));
    const languages = (d.languages || []).map((x) => (typeof x === "string" ? x : x.text)).filter(Boolean);

    const profileTitle = (d.profileTitle && d.profileTitle.trim()) || (typeof window.t === "function" ? window.t("section.profile") : "PROFILE");
    const keyImpactTitle = (d.keyImpactTitle && d.keyImpactTitle.trim()) || (typeof window.t === "function" ? window.t("section.keyImpact") : "KEY IMPACT");
    const coreCompetenciesTitle = (d.coreCompetenciesTitle && d.coreCompetenciesTitle.trim()) || (typeof window.t === "function" ? window.t("section.coreCompetencies") : "CORE COMPETENCIES");
    const toolsTitle = (d.toolsTitle && d.toolsTitle.trim()) || (typeof window.t === "function" ? window.t("section.tools") : "TOOLS");
    const languagesTitle = (d.languagesTitle && d.languagesTitle.trim()) || (typeof window.t === "function" ? window.t("section.languages") : "LANGUAGES");
    const page1ExpTitle = (d.experienceTitle && d.experienceTitle.trim()) || (typeof window.t === "function" ? window.t("section.experience") : "PROFESSIONAL EXPERIENCE");
    const blocks = dataToBlocks(d);
    const hasPage2 = blocks.length > 0;

    const hasContent =
      (d.name || "").trim() ||
      (d.headline || "").trim() ||
      (d.profile?.all || "").trim() ||
      (d.contacts || []).length ||
      impacts.length ||
      chips.length ||
      tools.length ||
      languages.length ||
      blocks.length;

    if (!hasContent) {
      const emptyMsg = window.t("empty.preview");
      elRoot.innerHTML = `<section class="page page--empty-state"><p class="empty-state__text">${esc(emptyMsg)}</p></section>`;
      return;
    }

    const sectionHeadFn = isAts ? sectionHeadAts : sectionHead;
    const coreDisplay = isAts ? "dots" : (d.coreCompetenciesDisplay === "dots" ? "dots" : "chips");
    const toolsDisplayMode = isAts ? "dots" : (d.toolsDisplay === "chips" ? "chips" : "dots");
    const competenciesMarkup = chips.length
      ? coreDisplay === "dots"
        ? inlineListHtml(chips, "section-inline-list")
        : isAts
        ? listHtml(chips)
        : chips
            .map(
              (t, idx) =>
                `<span class="chip chip--draggable" draggable="true" data-core-chip-index="${idx}" title="${esc(window.t("hint.dragChip") || "Drag to reorder")}">${esc(t)}</span>`
            )
            .join("")
      : "";

    const page1 = `
      <section class="page ${hasPage2 ? "page--break" : ""}">
        <section class="header">
          <div class="header__left">
            <h1 class="name">${esc(d.name || "")}</h1>
            <p class="headline">${esc(d.headline || "")}</p>
            ${
              languages.length
                ? `<p class="language-line"><span>${esc(toTitleCase(languagesTitle))}:</span> ${languages.map(esc).join(" · ")}</p>`
                : ""
            }
          </div>
          <div class="header__right">
            ${(d.contacts || []).map((c) => `<div class="contact">${contactToLinkHtml(c)}</div>`).join("")}
          </div>
        </section>

        <section class="section">
          ${sectionHeadFn(profileTitle)}
          <p class="body">${esc(d.profile?.all || "")}</p>
        </section>

        ${
          impacts.length
            ? `
          <section class="section">
            ${sectionHeadFn(keyImpactTitle)}
            <div class="card">${listHtml(impacts)}</div>
          </section>
        `
            : ""
        }

        ${
          chips.length
            ? `
          <section class="section">
            ${sectionHeadFn(coreCompetenciesTitle)}
            ${
              coreDisplay === "chips"
                ? `<div class="chips chips--core-competencies">${competenciesMarkup}</div>`
                : competenciesMarkup
            }
          </section>
        `
            : ""
        }

        ${
          tools.length
            ? `
          <section class="section section--tools">
            ${sectionHeadFn(toolsTitle)}
            ${
              toolsDisplayMode === "chips"
                ? `<div class="chips chips--tools">${tools.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`
                : inlineListHtml(tools, isAts ? "body" : "section-inline-list section-inline-list--tools")
            }
          </section>
        `
            : ""
        }

        <section class="section section--experience">
          ${sectionHeadFn(page1ExpTitle)}
          <div class="experience-container"></div>
        </section>
      </section>
    `;

    const sectionHeadBlockFn = isAts ? sectionHeadAts : (title, variant) => sectionHead(title, variant);
    const page2 = `
      <section class="page">
        ${blocks
          .map((b, i) => {
            const bullets = normalizeTextBullets(b.bullets || []);
            const subtitle = b.subtitle ? `<p class="body body--tight">${esc(b.subtitle)}</p>` : "";

            const isExperience = b.type === "experience";
            const prev = blocks[i - 1];
            const addDivider =
              i !== 0 &&
              isExperience &&
              prev &&
              prev.type === "experience";

            if (b.type === "section") {
              return `
                <section class="section ${esc(b.className || "")}">
                  ${sectionHeadBlockFn(b.title || "", "grey")}
                  ${listHtml(bullets)}
                </section>
              `;
            }

            // Experience blocks: divider only between experience blocks
            return `
              <section class="section expBlock ${addDivider ? "section--divider" : ""}">
                <div class="exp__head">
                  <div class="exp__role">${esc(b.title || "")}</div>
                  <div class="exp__meta">${esc(b.meta || "")}</div>
                </div>
                ${subtitle}
                ${listHtml(bullets)}
              </section>
            `;
          })
          .join("")}
      </section>
    `;

    const pageBreakHtml = '<div class="page-break-preview" aria-hidden="true"><span>— Page 2 —</span></div>';
    elRoot.classList.remove("doc--two-pages", "doc--multi-pages");
    elRoot.innerHTML = page1 + (hasPage2 ? pageBreakHtml + page2 : "");
    if (hasPage2) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => balancePages());
      });
    }
  }

  // ---------- JSON IMPORT: flat format or legacy pages ----------
  function normalizeIncomingToInternalSchema(incoming) {
    // New flat format (no pages)
    if (Array.isArray(incoming?.experience) && (incoming?.name != null || incoming?.headline != null)) {
      return {
        ...incoming,
        education: incoming.education ?? [],
        projects: incoming.projects ?? [],
      };
    }
    // Legacy: pages.page1 / page2
    if (incoming?.pages && (incoming?.name || incoming?.headline)) return incoming;

    // External schema: basics/experience/education/skills/summary
    const basics = incoming?.basics || {};
    const links = Array.isArray(basics.links) ? basics.links : [];

    const contacts = [
      basics.location,
      basics.email,
      basics.phone,
      ...links.map((l) => l?.url).filter(Boolean),
    ].filter(Boolean);

    const skills = Array.isArray(incoming?.skills) ? incoming.skills : [];
    const toolsRaw = Array.isArray(incoming?.tools) ? incoming.tools : [];

    const expArr = Array.isArray(incoming?.experience) ? incoming.experience : [];
    const expMapped = expArr.map((r) => {
      const dates = toMonthYearRange(r.startDate, r.endDate);
      const meta = [dates, r.location].filter(Boolean).join(" · ");

      return {
        company: r.company || "",
        title: r.position || "",
        meta,
        summary: "",
        bullets: normalizeTextBullets(r.bullets).map((t) => ({ text: t, tags: ["all"] })),
        limit: 99,
      };
    });

    const eduArr = Array.isArray(incoming?.education) ? incoming.education : [];
    const eduLines = eduArr
      .map((e) => {
        const years =
          e.startDate || e.endDate ? `(${[e.startDate, e.endDate].filter(Boolean).join("-")})` : "";
        const inst = e.institution || "";
        const deg = e.degree || "";
        return `${inst}${deg ? " - " + deg : ""} ${years}`.trim();
      })
      .filter(Boolean);

    const experience = expMapped.map((r) => ({
      company: r.company,
      title: r.title,
      meta: r.meta,
      summary: r.summary || "",
      bullets: r.bullets,
    }));

    const langRaw = incoming?.languages || basics?.languages || [];
    const languages = Array.isArray(langRaw)
      ? langRaw.map((x) =>
          typeof x === "string" ? { text: x, tags: ["all"] } : { text: [x.language, x.fluency].filter(Boolean).join(" — ") || "", tags: ["all"] }
        )
      : [];

    return {
      schemaVersion: "cv.v1",
      name: basics.fullName || "",
      headline: basics.title || "",
      contacts,
      profile: { all: incoming?.summary || "" },
      keyImpact: [],
      coreCompetencies: skills.map((t) => ({ text: t, tags: ["all"] })),
      tools: toolsRaw.map((t) => (typeof t === "string" ? { text: t, tags: ["all"] } : { text: t?.text || "", tags: ["all"] })),
      languages,
      experienceTitle: window.t("section.experience"),
      experience,
      education: eduLines,
      projects: [],
    };
  }

  function loadFromJsonData(raw) {
    const incoming = unwrapPayload(raw);

    if (!incoming || typeof incoming !== "object") {
      return { ok: false, error: window.t("alert.jsonRootInvalid") };
    }

    const normalized = normalizeIncomingToInternalSchema(incoming);

    // fill top
    fName.value = normalized.name || "";
    fHeadline.value = normalized.headline || "";
    fContacts.value = (normalized.contacts || []).join("\n");
    fProfile.value = normalized.profile?.all || "";

    fImpact.value = formatBulletList(normalizeTextBullets(normalized.keyImpact));
    fChips.value = formatBulletList(normalizeTextBullets(normalized.coreCompetencies));
    if (coreCompetenciesDisplay) coreCompetenciesDisplay.value = normalized.coreCompetenciesDisplay === "dots" ? "dots" : "chips";
    fTools.value = formatBulletList(normalizeTextBullets(normalized.tools));
    if (toolsDisplay) toolsDisplay.value = normalized.toolsDisplay === "chips" ? "chips" : "dots";
    if (fLanguages) {
      const lang = normalized.languages;
      fLanguages.value = formatBulletList(Array.isArray(lang) ? lang : []);
    }

    const def = (key) => (typeof window.t === "function" ? window.t("section." + key) : "");
    SECTION_TITLE_FIELDS.forEach(([el, key, dataKey]) => {
      if (!el) return;
      let val = normalized[dataKey];
      if (dataKey === "experienceTitle") val = val ?? normalized.pages?.page1?.experienceTitle;
      el.value = val ?? def(key);
    });

    expItems = [];
    fEdu.value = "";
    fProjects.value = "";

    if (Array.isArray(normalized.experience)) {
      normalized.experience.forEach((r) => {
        expItems.push({
          company: r.company || "",
          title: r.title || "",
          meta: r.meta || "",
          summary: r.summary || "",
          bullets: normalizeTextBullets(r.bullets),
        });
      });
      fEdu.value = (normalized.education || []).join("\n");
      fProjects.value = (normalized.projects || []).join("\n");
    } else {
      const p1 = normalized.pages?.page1?.experience || [];
      p1.forEach((r) => {
        expItems.push({
          company: r.company || "",
          title: r.title || "",
          meta: r.meta || "",
          summary: r.summary || "",
          bullets: normalizeTextBullets(r.bullets),
        });
      });
      const p2 = normalized.pages?.page2?.blocks || [];
      p2.forEach((b) => {
        if (b.type === "experience") {
          const title = String(b.title || "");
          const parts = title.split(/\s[—-]\s/);
          expItems.push({
            company: (parts[0] || "").trim(),
            title: (parts.slice(1).join(" - ") || "").trim(),
            meta: b.meta || "",
            summary: b.subtitle || "",
            bullets: normalizeTextBullets(b.bullets),
          });
        }
        if (b.type === "section") {
          const t = String(b.title || "").toUpperCase();
          const content = normalizeTextBullets(b.bullets).join("\n");
          if (t.includes("EDUCATION")) fEdu.value = content;
          if (t.includes("PROJECT")) fProjects.value = content;
        }
      });
    }

    renderExpEditor();
    renderDoc(buildInternalFromForm());
    clearDirty();
    updateNameHint();
    if (fJsonPaste) fJsonPaste.value = "";
    return { ok: true };
  }

  // ---------- ACTIONS ----------
  const elPreviewLive = document.getElementById("previewLive");

  elRender.addEventListener("click", () => {
    syncFromEditor();
    renderDoc(buildInternalFromForm());
    if (elPreviewLive) {
      elPreviewLive.textContent = window.t("success.previewUpdated");
      setTimeout(() => { elPreviewLive.textContent = ""; }, 2000);
    }
  });

  const elExportPdfModal = document.getElementById("exportPdfModal");
  const elExportPdfFilename = document.getElementById("exportPdfFilename");
  const elExportPdfCancel = document.getElementById("exportPdfCancel");
  const elExportPdfSave = document.getElementById("exportPdfSave");
  const elExportPdfSaveAts = document.getElementById("exportPdfSaveAts");

  const SERVER_PDF_ENDPOINT = "https://pdf-server-beryl.vercel.app/api/render-cv";

  function openExportPdfModal() {
    if (!elExportPdfModal || !elExportPdfFilename) return;
    if (typeof window.applyLocale === "function") window.applyLocale();
    elExportPdfFilename.value = defaultPdfFilename();
    elExportPdfModal.removeAttribute("hidden");
    elExportPdfFilename.focus();
  }

  function closeExportPdfModal(returnFocusToPrint) {
    if (elExportPdfModal) elExportPdfModal.setAttribute("hidden", "");
    if (returnFocusToPrint && elPrint) elPrint.focus();
  }

  function sanitizePdfFilename(name) {
    const base = String(name || "CV.pdf").trim() || "CV.pdf";
    return base.toLowerCase().endsWith(".pdf") ? base : base + ".pdf";
  }

  function savePdfBlob(blob, suggestedName) {
    const filename = sanitizePdfFilename(suggestedName);
    if (typeof window.showSaveFilePicker === "function") {
      return window
        .showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
        })
        .then((handle) => handle.createWritable())
        .then((writable) => {
          writable.write(blob);
          return writable.close();
        });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return Promise.resolve();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForAnimationFrames(count = 2) {
    return new Promise((resolve) => {
      const step = () => {
        count -= 1;
        if (count <= 0) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function setExportButtonsDisabled(disabled) {
    [elExportPdfSave, elExportPdfSaveAts, elExportPdfCancel].forEach((button) => {
      if (button) button.disabled = disabled;
    });
  }

  function showExportStatus(message) {
    if (!elPreviewLive) return;
    elPreviewLive.textContent = message;
    elPreviewLive.removeAttribute("hidden");
    elPreviewLive.classList.remove("visually-hidden");
    setTimeout(() => {
      elPreviewLive.textContent = "";
      elPreviewLive.setAttribute("hidden", "");
      elPreviewLive.classList.add("visually-hidden");
    }, 6000);
  }

  function removeEmptyPages(rootEl) {
    const pages = rootEl.querySelectorAll(".page");
    pages.forEach((p) => {
      if (p.classList.contains("page--empty") || p.children.length === 0) {
        const prev = p.previousElementSibling;
        if (prev && prev.classList.contains("page-break-preview")) prev.remove();
        p.remove();
      }
    });
    return rootEl.querySelectorAll(".page");
  }

  const PDF_DEBUG = false; // set true to debug [HB-PDF *] console logs

  /** Returns Promise of <style>...</style> or <link.../> for styles.css (works from file:// via styleSheets). */
  async function getAppCssStyleBlock() {
    const log = PDF_DEBUG ? (...a) => console.log("[HB-PDF styles]", ...a) : () => {};
    const appStylesheet = document.querySelector('link[rel="stylesheet"][href*="styles.css"]');
    const styleHref = appStylesheet && appStylesheet.href ? appStylesheet.href : "styles.css";
    const isHttp = styleHref.startsWith("http://") || styleHref.startsWith("https://");
    const urlToFetch = isHttp ? styleHref : new URL("styles.css", window.location.href).href;
    log("origin:", window.location.origin, "| styleHref:", styleHref, "| isHttp:", isHttp);

    try {
      const cssResp = await fetch(urlToFetch);
      log("fetch(urlToFetch):", cssResp.status, cssResp.statusText, "url:", urlToFetch);
      if (cssResp.ok) {
        const cssText = await cssResp.text();
        if (cssText && cssText.trim()) {
          log("CSS inlined from fetch, length:", cssText.length);
          return `<style>${cssText}</style>`;
        }
        log("fetch ok but empty response");
      }
    } catch (e) {
      log("fetch(urlToFetch) failed:", e.message || e);
    }
    if (!isHttp) {
      try {
        const relResp = await fetch("styles.css");
        log("fetch('styles.css'):", relResp.status, relResp.statusText);
        if (relResp.ok) {
          const cssText = await relResp.text();
          if (cssText && cssText.trim()) {
            log("CSS inlined from fetch(relative), length:", cssText.length);
            return `<style>${cssText}</style>`;
          }
        }
      } catch (e) {
        log("fetch('styles.css') failed:", e.message || e);
      }
    }
    if (typeof document.styleSheets !== "undefined") {
      log("document.styleSheets.length:", document.styleSheets.length);
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          const href = (sheet.href || "") + (sheet.ownerNode && sheet.ownerNode.getAttribute ? (sheet.ownerNode.getAttribute("href") || "") : "");
          if (href.indexOf("styles.css") === -1) continue;
          if (!sheet.cssRules) {
            log("sheet", i, "href contains styles.css but no cssRules (CORS?)");
            continue;
          }
          let cssText = "";
          for (let j = 0; j < sheet.cssRules.length; j++) cssText += sheet.cssRules[j].cssText;
          if (cssText) {
            log("CSS inlined from styleSheets[styles.css], length:", cssText.length);
            return `<style>${cssText}</style>`;
          }
          break;
        } catch (e) {
          log("styleSheets[" + i + "] error:", e.message || e);
        }
      }
      for (let i = document.styleSheets.length - 1; i >= 0; i--) {
        const sheet = document.styleSheets[i];
        try {
          if ((sheet.href || "").indexOf("fonts.googleapis") !== -1) continue;
          if (!sheet.cssRules || sheet.cssRules.length === 0) continue;
          let cssText = "";
          for (let j = 0; j < sheet.cssRules.length; j++) cssText += sheet.cssRules[j].cssText;
          if (cssText.length > 400) {
            log("CSS inlined from styleSheets[last non-google], length:", cssText.length);
            return `<style>${cssText}</style>`;
          }
        } catch (e) {
          log("styleSheets fallback[" + i + "] error:", e.message || e);
        }
      }
    }
    if (typeof window.__HB_PDF_FALLBACK_CSS === "string" && window.__HB_PDF_FALLBACK_CSS.length > 500) {
      log("fallback: using embedded PDF styles (server export will have full CSS)");
      return "<style>" + window.__HB_PDF_FALLBACK_CSS + "</style>";
    }
    if (isHttp) {
      log("fallback: using <link>, server may not load it from your origin");
      return `<link rel="stylesheet" href="${esc(styleHref)}" />`;
    }
    log("fallback: empty <style> (file:// and no styleSheets access)");
    return "<style></style>";
  }

  async function buildServerPdfHtml(data) {
    const log = PDF_DEBUG ? (...a) => console.log("[HB-PDF buildHtml]", ...a) : () => {};
    const el = elRoot;
    if (!el) {
      log("no elRoot, returning empty");
      return "";
    }
    const docHtml = el.innerHTML;
    const baseTitle = (data && data.name ? data.name + " — CV" : "CV");
    const styleBlock = await getAppCssStyleBlock();
    const hasInlineStyle = styleBlock.indexOf("<style>") !== -1 && styleBlock.length > 50;
    log("docHtml length:", docHtml.length, "| styleBlock length:", styleBlock.length, "| hasInlineStyle:", hasInlineStyle);
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(baseTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${styleBlock}
  <style>html,body{margin:0;padding:0;}
  @media print{ @page{margin:0;size:A4;} }</style>
</head>
<body>
  <main class="${esc((el && el.className) ? el.className : "doc")}">${docHtml}</main>
</body>
</html>`;
  }

  async function postServerPdf(payload) {
    const resp = await fetch(SERVER_PDF_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error("Server PDF failed with " + resp.status + (text ? ": " + text.slice(0, 200) : ""));
    }
    return resp.blob();
  }

  async function runPdfExportViaServer(filename, data) {
    const formData = data || buildInternalFromForm();
    const maxAttempts = 3;
    try {
      setExportButtonsDisabled(true);
      elRoot.classList.add("pdf-export");
      await waitForAnimationFrames(2);
      balancePages();
      ensureNoPageOverflows();
      ensureAllPagesDoNotOverflow(elRoot);
      await waitForAnimationFrames(2);
      const html = await buildServerPdfHtml(formData);
      const payload = { html, filename: sanitizePdfFilename(filename) };

      let lastError = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const blob = await postServerPdf(payload);
          await savePdfBlob(blob, filename);
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          if (attempt < maxAttempts) await sleep(900 * attempt);
        }
      }
      if (lastError) throw lastError;
    } catch (err) {
      console.error("[HB-PDF server] FAILED:", err);
      const fallback = typeof window.t === "function"
        ? window.t("exportPdf.serverFailed")
        : "Could not generate preview-matching PDF. Please try again.";
      showExportStatus(fallback);
    } finally {
      elRoot.classList.remove("pdf-export");
      renderDoc(formData);
      setExportButtonsDisabled(false);
    }
  }

  /** @param {string} filename
   *  @param {{ asAts?: boolean }} [options]
   *  asAts = pdfmake ATS PDF (text layer, plain).
   *  default = preview-matching server PDF rendered by headless Chrome.
   */
  function runPdfExport(filename, options) {
    syncFromEditor();
    const data = buildInternalFromForm();
    renderDoc(data);
    const asAts = options && options.asAts;

    if (asAts) {
      runPdfExportAsAts(data, filename);
      return;
    }
    runPdfExportViaServer(filename, data);
  }

  /** One-click ATS PDF with real text layer (pdfmake). Plain layout, no blue/gray design. */
  function runPdfExportAsAts(data, filename) {
    if (typeof pdfMake === "undefined" || typeof pdfMake.createPdf !== "function") {
      runPdfExportAsPrint(elRoot, filename);
      return;
    }
    const d = data || buildInternalFromForm();
    const section = (title, body) => [
      { text: (title || "").toUpperCase(), style: "sectionHeader", margin: [0, 14, 0, 4] },
      body,
    ];
    const bullet = (t) => (typeof t === "string" ? t : (t && t.text) || "");
    const content = [];

    if (d.name) content.push({ text: d.name, style: "name", margin: [0, 0, 0, 2] });
    if (d.headline) content.push({ text: d.headline, style: "headline", margin: [0, 0, 0, 4] });
    if (Array.isArray(d.languages) && d.languages.length) {
      const title = d.languagesTitle || "Languages";
      content.push({
        text: [
          { text: String(title).toUpperCase() + ": ", bold: true },
          { text: d.languages.map(bullet).join("  ·  ") },
        ],
        style: "headline",
        margin: [0, 0, 0, 10],
      });
    } else if (d.headline) {
      content[content.length - 1].margin = [0, 0, 0, 10];
    }
    if (Array.isArray(d.contacts) && d.contacts.length) {
      const sep = { text: "  ·  " };
      const contactItems = d.contacts.flatMap((c, i) => {
        const s = String(c ?? "").trim();
        const href = contactHref(s);
        const segment = href ? { text: s, link: href } : { text: s };
        return i === 0 ? [segment] : [sep, segment];
      });
      content.push({ text: contactItems, style: "contacts", margin: [0, 0, 0, 12] });
    }

    if (d.profile && d.profile.all)
      content.push(...section(d.profileTitle || "Profile", { text: d.profile.all, style: "body" }));

    if (Array.isArray(d.keyImpact) && d.keyImpact.length)
      content.push(...section(d.keyImpactTitle || "Key Impact", { ul: d.keyImpact.map(bullet) }));

    if (Array.isArray(d.coreCompetencies) && d.coreCompetencies.length)
      content.push(...section(d.coreCompetenciesTitle || "Core Competencies", { text: d.coreCompetencies.map(bullet).join("  ·  "), style: "body" }));

    if (Array.isArray(d.tools) && d.tools.length)
      content.push(...section(d.toolsTitle || "Tools", { text: d.tools.map(bullet).join("  ·  "), style: "body" }));

    const expTitle = d.experienceTitle || "Professional Experience";
    if (Array.isArray(d.experience) && d.experience.length) {
      content.push({ text: expTitle.toUpperCase(), style: "sectionHeader", margin: [0, 14, 0, 4] });
      d.experience.forEach((job) => {
        const title = [job.company, job.title].filter(Boolean).join(" — ");
        if (title) content.push({ text: title, style: "jobTitle", margin: [0, 8, 0, 0] });
        if (job.meta) content.push({ text: job.meta, style: "meta", margin: [0, 0, 0, 2] });
        if (job.summary) content.push({ text: job.summary, style: "body", margin: [0, 0, 0, 4] });
        if (Array.isArray(job.bullets) && job.bullets.length)
          content.push({ ul: job.bullets.map(bullet), margin: [0, 0, 0, 6] });
      });
    }

    if (Array.isArray(d.education) && d.education.length)
      content.push(...section(d.educationTitle || "Education", { ul: d.education }));

    if (Array.isArray(d.projects) && d.projects.length)
      content.push(...section(d.projectsTitle || "Selected Projects", { ul: d.projects }));

    const docDef = {
      pageSize: "A4",
      pageMargins: [50, 50, 50, 50],
      defaultStyle: { fontSize: 10, color: "#111827" },
      styles: {
        name: { fontSize: 20, bold: true },
        headline: { fontSize: 11, color: "#4b5563" },
        contacts: { fontSize: 10, color: "#4b5563" },
        sectionHeader: { fontSize: 11, bold: true },
        jobTitle: { fontSize: 11, bold: true },
        meta: { fontSize: 9, color: "#6b7280" },
        body: { fontSize: 10 },
      },
      content,
    };
    try {
      const pdf = pdfMake.createPdf(docDef);
      pdf.getBlob((blob) => {
        savePdfBlob(blob, filename).catch(() => {});
      });
    } catch (err) {
      console.error(err);
      runPdfExportAsPrint(elRoot, filename);
    }
  }

  async function runPdfExportAsPrint(el, filename) {
    if (!el) {
      window.print();
      return;
    }
    const data = buildInternalFromForm();
    el.classList.add("pdf-export");
    balancePages();
    ensureNoPageOverflows();
    const docHtml = el.innerHTML;
    const mainClass = (el && el.className) ? el.className : "doc pdf-export";
    el.classList.remove("pdf-export");
    renderDoc(data);
    const baseTitle = (data && data.name ? data.name + " — CV" : "CV");
    const printTipText =
      typeof window.t === "function" ? window.t("exportPdf.printTip") : "In print settings, disable «Headers and footers» (no URL/date in PDF). Enable «Background graphics» to keep blue headings.";
    const printTipTitle =
      typeof window.t === "function" ? window.t("exportPdf.printTipTitle") : "Before saving to PDF:";
    const printBtnLabel =
      typeof window.t === "function" ? window.t("exportPdf.printBtnLabel") : "Open print dialog";
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }
    const styleBlock = await getAppCssStyleBlock();
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(baseTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${styleBlock}
  <style>
    .print-tip {
      margin: 0 0 16px 0; padding: 14px 18px; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px;
      font-size: 14px; color: #1e3a5f; line-height: 1.5; font-weight: 500;
    }
    .print-tip strong { display: block; margin-bottom: 6px; font-size: 15px; }
    .print-actions { margin-bottom: 20px; }
    .print-actions button {
      padding: 10px 20px; font-size: 15px; font-weight: 600; cursor: pointer;
      background: #2563eb; color: #fff; border: none; border-radius: 8px;
    }
    .print-actions button:hover { background: #1d4ed8; }
    @media print {
      .print-tip, .print-actions { display: none !important; }
      @page { margin: 0; size: A4; }
      .doc.pdf-export .page { page-break-after: always; }
      .doc.pdf-export .page:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="print-tip" role="status">
    <strong>${esc(printTipTitle)}</strong>
    ${esc(printTipText)}
  </div>
  <div class="print-actions">
    <button type="button" id="printTrigger">${esc(printBtnLabel)}</button>
  </div>
  <main class="${esc(mainClass)}">${docHtml}</main>
  <script>
    document.getElementById("printTrigger").onclick = function() { window.focus(); window.print(); };
  </script>
</body>
</html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  elPrint.addEventListener("click", () => {
    openExportPdfModal();
  });

  if (elExportPdfCancel) {
    elExportPdfCancel.addEventListener("click", () => closeExportPdfModal(true));
  }
  if (elExportPdfSave) {
    elExportPdfSave.addEventListener("click", () => {
      const name = elExportPdfFilename ? elExportPdfFilename.value.trim() : "";
      closeExportPdfModal(false);
      runPdfExport(name || "CV.pdf");
    });
  }
  if (elExportPdfSaveAts) {
    elExportPdfSaveAts.addEventListener("click", () => {
      const name = elExportPdfFilename ? elExportPdfFilename.value.trim() : "";
      closeExportPdfModal(false);
      runPdfExport(name || "CV.pdf", { asAts: true });
    });
  }
  if (elExportPdfModal && elExportPdfModal.querySelector(".modal__backdrop")) {
    elExportPdfModal.querySelector(".modal__backdrop").addEventListener("click", () => closeExportPdfModal(true));
  }
  if (elExportPdfFilename) {
    elExportPdfFilename.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (elExportPdfSave) elExportPdfSave.click();
      }
    });
  }

  function trapFocusInModal(modalEl, e) {
    if (e.key !== "Tab" || !modalEl || modalEl.hasAttribute("hidden")) return;
    const focusable = modalEl.querySelectorAll(
      'input:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  if (elExportPdfModal) {
    elExportPdfModal.addEventListener("keydown", (e) => trapFocusInModal(elExportPdfModal, e));
  }

  elDownloadJson.addEventListener("click", () => {
    syncFromEditor();
    const data = buildInternalFromForm();
    downloadText("resume.internal.json", JSON.stringify(data, null, 2));
    clearDirty();
  });

  function openJsonFilePicker() {
    elJsonFileInput.click();
  }

  if (elImportJsonFile) elImportJsonFile.addEventListener("click", openJsonFilePicker);

  elJsonFileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(String(evt.target.result || "{}"));
        const result = loadFromJsonData(data);
        if (result.ok) {
          clearJsonError();
          showJsonSuccess(window.t("success.jsonApplied"));
        } else {
          showJsonError(result.error);
        }
      } catch (err) {
        console.error(err);
        showJsonError(window.t("alert.jsonFileInvalid", { detail: err?.message || String(err) }));
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  if (elApplyJson && fJsonPaste) {
    elApplyJson.addEventListener("click", (e) => {
      e.preventDefault();
      const raw = fJsonPaste.value.trim();
      if (!raw) {
        showJsonError(window.t("alert.pasteJsonFirst"));
        return;
      }
      try {
        const data = JSON.parse(raw);
        const result = loadFromJsonData(data);
        if (result.ok) {
          clearJsonError();
          showJsonSuccess(window.t("success.jsonApplied"));
        } else {
          showJsonError(result.error);
        }
      } catch (err) {
        console.error(err);
        showJsonError(window.t("alert.jsonParseError", { detail: err?.message || String(err) }));
      }
    });
  }

  function saveDraft() {
    try {
      syncFromEditor();
      const data = buildInternalFromForm();
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }
  const debouncedSaveDraft = debounce(saveDraft, DRAFT_SAVE_DEBOUNCE_MS);

  elReset.addEventListener("click", () => {
    if (!confirm(window.t("confirm.reset"))) return;
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch (e) { /* ignore */ }
    clearDirty();
    fName.value = "";
    fHeadline.value = "";
    fContacts.value = "";
    fProfile.value = "";
    fImpact.value = "";
    fChips.value = "";
    if (coreCompetenciesDisplay) coreCompetenciesDisplay.value = "chips";
    fTools.value = "";
    if (toolsDisplay) toolsDisplay.value = "dots";
    if (fLanguages) fLanguages.value = "";
    setSectionTitleDefaults();
    fEdu.value = "";
    fProjects.value = "";
    if (fJsonPaste) fJsonPaste.value = "";
    expItems = [];
    renderExpEditor();
    renderDoc(buildInternalFromForm());
    updateNameHint();
  });

  const panel = document.querySelector(".panel");
  if (panel) {
    panel.addEventListener("input", (e) => { setDirty(); debouncedSaveDraft(); });
    panel.addEventListener("change", (e) => { setDirty(); debouncedSaveDraft(); });
    function setTitleFieldVisible(input, visible) {
      if (!input) return;
      input.hidden = !visible;
      let next = input.nextElementSibling;
      if (next && next.classList.contains("section-title-done-btn")) {
        next.hidden = !visible;
        if (visible) {
          const label = next.querySelector(".section-title-done-btn__label");
          if (label) label.textContent = (typeof window.t === "function" ? window.t("button.done") : "Save");
          if (typeof window.t === "function") next.setAttribute("title", window.t("aria.doneLabel"));
        }
        next = next.nextElementSibling;
      }
      while (next && next.classList.contains("section-title-inline-hint")) {
        next.hidden = !visible;
        next = next.nextElementSibling;
      }
    }
    panel.addEventListener("click", (e) => {
      const btn = e.target.closest(".edit-section-title-btn");
      if (!btn) return;
      const field = btn.closest(".field");
      const input = field && field.querySelector(".section-title-inline");
      if (!input) return;
      if (!input.hidden) {
        input.blur();
        return;
      }
      setTitleFieldVisible(input, true);
      input.focus();
    });
    panel.addEventListener("focusout", (e) => {
      const input = e.target;
      if (input.classList && input.classList.contains("section-title-inline")) {
        setTitleFieldVisible(input, false);
      }
    });
    panel.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const input = e.target;
      if (input.classList && input.classList.contains("section-title-inline")) {
        e.preventDefault();
        input.blur();
      }
    });
    panel.addEventListener("click", (e) => {
      const doneBtn = e.target.closest(".section-title-done-btn");
      if (!doneBtn || doneBtn.hidden) return;
      const field = doneBtn.closest(".field");
      const input = field && field.querySelector(".section-title-inline");
      if (input) input.blur();
    });
  }
  window.addEventListener("beforeunload", (e) => {
    if (formDirty) {
      e.preventDefault();
    }
  });

  if (fName) fName.addEventListener("input", updateNameHint);
  [coreCompetenciesDisplay, toolsDisplay].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", () => {
      syncFromEditor();
      setDirty();
      debouncedSaveDraft();
      renderDoc(buildInternalFromForm());
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (elExportPdfModal && !elExportPdfModal.hasAttribute("hidden")) {
      closeExportPdfModal(true);
      e.preventDefault();
      return;
    }
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) {
      el.blur();
    }
  });

  if (typeof window.applyLocale === "function") window.applyLocale();
  if (typeof window.getLocale === "function") {
    document.documentElement.setAttribute("lang", window.getLocale());
  }
  setSectionTitleDefaults();
  updateNameHint();

  (function initMobileTabs() {
    const app = document.getElementById("appRoot");
    const tabForm = document.getElementById("tabForm");
    const tabPreview = document.getElementById("tabPreview");
    if (!app || !tabForm || !tabPreview) return;
    tabForm.addEventListener("click", () => {
      app.classList.remove("app--show-preview");
      tabForm.setAttribute("aria-selected", "true");
      tabPreview.setAttribute("aria-selected", "false");
    });
    tabPreview.addEventListener("click", () => {
      app.classList.add("app--show-preview");
      tabForm.setAttribute("aria-selected", "false");
      tabPreview.setAttribute("aria-selected", "true");
    });
  })();

  (function initCoreCompetenciesDragDrop() {
    if (!elRoot || !fChips) return;
    let dragChip = null;
    let dropBefore = false;

    function clearChipDragMarks() {
      elRoot
        .querySelectorAll(".chip--drag-over, .chip--insert-before, .chip--insert-after")
        .forEach((el) => el.classList.remove("chip--drag-over", "chip--insert-before", "chip--insert-after"));
    }

    function reorderCoreCompetencies(fromIdx, toIdx) {
      const arr = linesFromBulletList(fChips.value);
      if (
        !Number.isInteger(fromIdx) ||
        !Number.isInteger(toIdx) ||
        fromIdx < 0 ||
        toIdx < 0 ||
        fromIdx >= arr.length ||
        toIdx >= arr.length ||
        fromIdx === toIdx
      ) {
        return;
      }
      const moved = arr.splice(fromIdx, 1)[0];
      arr.splice(toIdx, 0, moved);
      fChips.value = formatBulletList(arr);
      setDirty();
      debouncedSaveDraft();
      renderDoc(buildInternalFromForm());
    }

    elRoot.addEventListener("dragstart", (e) => {
      const chip = e.target.closest(".chips--core-competencies .chip--draggable");
      if (!chip) return;
      dragChip = chip;
      chip.classList.add("chip--dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", chip.dataset.coreChipIndex || "");
      }
    });

    elRoot.addEventListener("dragover", (e) => {
      const targetChip = e.target.closest(".chips--core-competencies .chip--draggable");
      if (!dragChip || !targetChip || targetChip === dragChip) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      clearChipDragMarks();
      targetChip.classList.add("chip--drag-over");
      const rect = targetChip.getBoundingClientRect();
      dropBefore = e.clientX < rect.left + rect.width / 2;
      targetChip.classList.add(dropBefore ? "chip--insert-before" : "chip--insert-after");
    });

    elRoot.addEventListener("drop", (e) => {
      const targetChip = e.target.closest(".chips--core-competencies .chip--draggable");
      if (!dragChip || !targetChip) return;
      e.preventDefault();
      const fromIdx = Number(dragChip.dataset.coreChipIndex);
      let toIdx = Number(targetChip.dataset.coreChipIndex);
      if (!dropBefore) toIdx += 1;
      if (fromIdx < toIdx) toIdx -= 1;
      clearChipDragMarks();
      dragChip.classList.remove("chip--dragging");
      dragChip = null;
      reorderCoreCompetencies(fromIdx, toIdx);
    });

    elRoot.addEventListener("dragend", () => {
      elRoot.querySelectorAll(".chip--dragging").forEach((el) => el.classList.remove("chip--dragging"));
      clearChipDragMarks();
      dragChip = null;
      dropBefore = false;
    });
  })();

  (function initDesktopWorkView() {
    const app = document.getElementById("appRoot");
    const tabForm = document.getElementById("tabForm");
    const tabPreview = document.getElementById("tabPreview");
    if (!app || !tabForm || !tabPreview || !elWorkViewToggleBtn) return;

    let enabled = false;
    try {
      enabled = localStorage.getItem(DESKTOP_WORKVIEW_STORAGE_KEY) === "1";
    } catch (e) { /* ignore */ }

    app.classList.toggle("app--desktop-workflow", enabled);
    if (enabled) {
      // Default to editing view.
      app.classList.remove("app--show-preview");
      tabForm.setAttribute("aria-selected", "true");
      tabPreview.setAttribute("aria-selected", "false");
    }

    elWorkViewToggleBtn.addEventListener("click", () => {
      enabled = !enabled;
      app.classList.toggle("app--desktop-workflow", enabled);

      try {
        localStorage.setItem(DESKTOP_WORKVIEW_STORAGE_KEY, enabled ? "1" : "0");
      } catch (e) { /* ignore */ }

      if (!enabled) {
        app.classList.remove("app--show-preview");
        tabForm.setAttribute("aria-selected", "true");
        tabPreview.setAttribute("aria-selected", "false");
        return;
      }

      // When switching on, default to editing view.
      app.classList.remove("app--show-preview");
      tabForm.setAttribute("aria-selected", "true");
      tabPreview.setAttribute("aria-selected", "false");
    });
  })();

  (function initFastTooltips() {
    var tooltipEl = null;
    var tooltipTimer = null;
    function showTooltip(text, x, y) {
      if (!text) return;
      if (!tooltipEl) {
        tooltipEl = document.createElement("div");
        tooltipEl.className = "fast-tooltip";
        tooltipEl.setAttribute("role", "tooltip");
        document.body.appendChild(tooltipEl);
      }
      tooltipEl.textContent = text;
      tooltipEl.style.left = x + "px";
      tooltipEl.style.top = (y + 12) + "px";
      tooltipEl.classList.add("fast-tooltip--visible");
    }
    function hideTooltip() {
      if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
      }
      if (tooltipEl) tooltipEl.classList.remove("fast-tooltip--visible");
    }
    document.body.addEventListener("mouseover", function (e) {
      var el = e.target.closest("[title]");
      if (!el || !el.title) {
        hideTooltip();
        return;
      }
      var text = el.getAttribute("title");
      if (!text) {
        hideTooltip();
        return;
      }
      tooltipTimer = setTimeout(function () {
        tooltipTimer = null;
        var rect = el.getBoundingClientRect();
        showTooltip(text, rect.left, rect.bottom);
      }, 400);
    });
    document.body.addEventListener("mouseout", function (e) {
      var to = e.relatedTarget;
      if (!to || (!to.closest("[title]") && !(tooltipEl && tooltipEl.contains(to)))) hideTooltip();
    });
  })();

  const elLocaleSelect = document.getElementById("localeSelect");
  if (elLocaleSelect) {
    const cur = typeof window.getLocale === "function" ? window.getLocale() : "en";
    elLocaleSelect.value = cur;
    elLocaleSelect.addEventListener("change", () => {
      const code = elLocaleSelect.value;
      if (window.setLocale(code)) {
        document.documentElement.setAttribute("lang", code);
        if (typeof window.applyLocale === "function") window.applyLocale();
        setSectionTitleDefaults();
        renderExpEditor();
        renderDoc(buildInternalFromForm());
      }
    });
  }

  if (elTemplateSelect) {
    elTemplateSelect.addEventListener("change", () => {
      syncFromEditor();
      renderDoc(buildInternalFromForm());
    });
  }

  if (elSplitBlocksToggle) {
    try {
      const stored = localStorage.getItem(SPLIT_BLOCKS_STORAGE_KEY);
      elSplitBlocksToggle.checked = stored === null ? true : stored === "1";
    } catch (e) { /* ignore */ }
    elRoot.classList.toggle("doc--allow-block-split", elSplitBlocksToggle.checked);
    elSplitBlocksToggle.addEventListener("change", () => {
      elRoot.classList.toggle("doc--allow-block-split", elSplitBlocksToggle.checked);
      try {
        localStorage.setItem(SPLIT_BLOCKS_STORAGE_KEY, elSplitBlocksToggle.checked ? "1" : "0");
      } catch (e) { /* ignore */ }
      syncFromEditor();
      renderDoc(buildInternalFromForm());
    });
  }

  // ---------- INIT ----------
  renderExpEditor();
  renderDoc(buildInternalFromForm());

  (function tryRestoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return;
      loadFromJsonData(data);
      showJsonSuccess(window.t("success.draftRestored"));
    } catch (e) { /* ignore */ }
  })();
  });
})();
