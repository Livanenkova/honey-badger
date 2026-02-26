(function () {
  "use strict";

  const REQUIRED_IDS = [
    "cvRoot", "renderBtn", "printBtn", "downloadJsonBtn", "uploadJsonBtn",
    "jsonFileInput", "resetBtn", "fName", "fHeadline", "fContacts", "fProfile",
    "fImpact", "fChips", "fEdu", "fProjects", "addExpBtn", "expList",
  ];

  const INPUT_DEBOUNCE_MS = 120;
  const PDF_CANVAS_SCALE = 2;
  const PDF_JPEG_QUALITY = 0.98;
  const PDF_PAGE_DELAY_MS = 150;
  /** Запас в px при балансировке страниц, чтобы контент не обрезался в PDF (шрифты/субпиксель). */
  const PAGE_BALANCE_SAFETY_PX = 14;
  const DRAFT_STORAGE_KEY = "honey-badger-draft";
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
    const elUploadJson = document.getElementById("uploadJsonBtn");
    const elJsonFileInput = document.getElementById("jsonFileInput");
    const elReset = document.getElementById("resetBtn");
    const fJsonPaste = document.getElementById("fJsonPaste");
    const elApplyJson = document.getElementById("applyJsonBtn");
    const fName = document.getElementById("fName");
    const fHeadline = document.getElementById("fHeadline");
    const fContacts = document.getElementById("fContacts");
    const fProfile = document.getElementById("fProfile");
    const fImpact = document.getElementById("fImpact");
    const fChips = document.getElementById("fChips");
    const fLanguages = document.getElementById("fLanguages");
    const fProfileTitle = document.getElementById("fProfileTitle");
    const fKeyImpactTitle = document.getElementById("fKeyImpactTitle");
    const fCoreCompetenciesTitle = document.getElementById("fCoreCompetenciesTitle");
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

  function toMonthYearRange(startDate, endDate) {
    const s = startDate ? String(startDate) : "";
    const e = endDate ? String(endDate) : "";
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
    const lang = (d.languages || []).map((x) => (typeof x === "string" ? x : x.text));
    const eduTitle = (d.educationTitle && d.educationTitle.trim()) || (typeof window.t === "function" ? window.t("section.education") : "EDUCATION");
    const projTitle = (d.projectsTitle && d.projectsTitle.trim()) || (typeof window.t === "function" ? window.t("section.projects") : "PROJECTS");
    const langTitle = (d.languagesTitle && d.languagesTitle.trim()) || (typeof window.t === "function" ? window.t("section.languages") : "LANGUAGES");
    return [
      ...expBlocks,
      ...(edu.length ? [{ type: "section", title: eduTitle, bullets: edu.map((t) => ({ text: t, tags: ["all"] })) }] : []),
      ...(proj.length ? [{ type: "section", title: projTitle, bullets: proj.map((t) => ({ text: t, tags: ["all"] })) }] : []),
      ...(lang.length ? [{ type: "languages", title: langTitle, items: lang }] : []),
    ];
  }

  function getPageBottomMarginPx(pageEl) {
    if (!pageEl) return 0;
    return parseFloat(getComputedStyle(pageEl).paddingBottom) || 0;
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
    const pageCount = elRoot.querySelectorAll(".page").length;
    elRoot.classList.toggle("doc--two-pages", pageCount === 2);
    elRoot.classList.toggle("doc--multi-pages", pageCount >= 3);
  }

  function splitPage2IntoPage3() {
    const pages = elRoot.querySelectorAll(".page");
    const p2 = pages[1];
    if (!p2 || p2.classList.contains("page--empty")) return;
    const marginBottom = getPageBottomMarginPx(p2);
    const maxContentHeight = p2.clientHeight - marginBottom - PAGE_BALANCE_SAFETY_PX;
    if (p2.scrollHeight <= maxContentHeight) return;

    const p3 = document.createElement("section");
    p3.className = "page";
    const break3 = document.createElement("div");
    break3.className = "page-break-preview";
    break3.setAttribute("aria-hidden", "true");
    break3.innerHTML = "<span>— Page 3 —</span>";

    while (p2.children.length > 0 && p2.scrollHeight > p2.clientHeight - marginBottom - PAGE_BALANCE_SAFETY_PX) {
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
      const marginBottom = getPageBottomMarginPx(last);
      const maxContentHeight = last.clientHeight - marginBottom - PAGE_BALANCE_SAFETY_PX;
      if (last.scrollHeight <= maxContentHeight) break;

      const pageNum = pages.length + 1;
      const breakEl = document.createElement("div");
      breakEl.className = "page-break-preview";
      breakEl.setAttribute("aria-hidden", "true");
      breakEl.innerHTML = `<span>— Page ${pageNum} —</span>`;
      const newPage = document.createElement("section");
      newPage.className = "page";

      while (last.children.length > 0 && last.scrollHeight > last.clientHeight - marginBottom - PAGE_BALANCE_SAFETY_PX) {
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
  }

  // ---------- RENDER ----------
  function renderDoc(d) {
    const template = (elTemplateSelect && elTemplateSelect.value) || "default";
    const isAts = template === "ats";
    elRoot.classList.toggle("doc--ats", isAts);

    const impacts = (d.keyImpact || []).map((x) => x.text);
    const chips = (d.coreCompetencies || []).map((x) => x.text);

    const profileTitle = (d.profileTitle && d.profileTitle.trim()) || (typeof window.t === "function" ? window.t("section.profile") : "PROFILE");
    const keyImpactTitle = (d.keyImpactTitle && d.keyImpactTitle.trim()) || (typeof window.t === "function" ? window.t("section.keyImpact") : "KEY IMPACT");
    const coreCompetenciesTitle = (d.coreCompetenciesTitle && d.coreCompetenciesTitle.trim()) || (typeof window.t === "function" ? window.t("section.coreCompetencies") : "CORE COMPETENCIES");
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
      blocks.length;

    if (!hasContent) {
      const emptyMsg = window.t("empty.preview");
      elRoot.innerHTML = `<section class="page page--empty-state"><p class="empty-state__text">${esc(emptyMsg)}</p></section>`;
      return;
    }

    const sectionHeadFn = isAts ? sectionHeadAts : sectionHead;
    const competenciesMarkup = chips.length
      ? isAts
        ? listHtml(chips)
        : chips.map((t) => `<span class="chip">${esc(t)}</span>`).join("")
      : "";

    const page1 = `
      <section class="page ${hasPage2 ? "page--break" : ""}">
        <section class="header">
          <div class="header__left">
            <h1 class="name">${esc(d.name || "")}</h1>
            <p class="headline">${esc(d.headline || "")}</p>
          </div>
          <div class="header__right">
            ${(d.contacts || []).map((c) => `<div class="contact">${esc(c)}</div>`).join("")}
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
            <div class="${isAts ? "ats-list-wrap" : "chips"}">${competenciesMarkup}</div>
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

            if (b.type === "languages" && Array.isArray(b.items)) {
              const langContent = isAts
                ? listHtml(b.items || [])
                : `<div class="chips">${(b.items || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`;
              return `
                <section class="section">
                  ${sectionHeadBlockFn(b.title || "", "grey")}
                  <div class="${isAts ? "ats-list-wrap" : ""}">${langContent}</div>
                </section>
              `;
            }
            if (b.type === "section") {
              return `
                <section class="section">
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

    const contacts = [basics.location, basics.email, ...links.map((l) => l?.url).filter(Boolean)].filter(
      Boolean
    );

    const skills = Array.isArray(incoming?.skills) ? incoming.skills : [];

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
  const elExportPdfSaveImage = document.getElementById("exportPdfSaveImage");
  const elExportPdfSaveAts = document.getElementById("exportPdfSaveAts");
  const elExportPdfSaveDesign = document.getElementById("exportPdfSaveDesign");
  const elExportPdfSaveServer = document.getElementById("exportPdfSaveServer");

  // Server-side HTML→PDF endpoint (Vercel function)
  const SERVER_PDF_ENDPOINT = "https://pdf-server-beryl.vercel.app/api/render-cv";

  function openExportPdfModal() {
    if (!elExportPdfModal || !elExportPdfFilename) return;
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

  async function buildServerPdfHtml(data) {
    const el = elRoot;
    if (!el) return "";
    const docHtml = el.innerHTML;
    const baseTitle = (data && data.name ? data.name + " — CV" : "CV");
    const mainStylesheet = document.querySelector('link[rel="stylesheet"]');
    const styleHref = mainStylesheet && mainStylesheet.href ? mainStylesheet.href : "styles.css";
    let styleBlock = "";
    if (styleHref.startsWith("http://") || styleHref.startsWith("https://")) {
      try {
        const cssResp = await fetch(styleHref);
        if (cssResp.ok) {
          const cssText = await cssResp.text();
          styleBlock = `<style>${cssText}</style>`;
        }
      } catch (_) {}
    }
    if (!styleBlock) styleBlock = `<link rel="stylesheet" href="${esc(styleHref)}" />`;
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(baseTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${styleBlock}
</head>
<body>
  <main class="doc">${docHtml}</main>
</body>
</html>`;
  }

  async function runPdfExportViaServer(filename, data) {
    if (!SERVER_PDF_ENDPOINT) {
      runPdfExportAsPrint(elRoot, filename);
      return;
    }
    try {
      const html = await buildServerPdfHtml(data || buildInternalFromForm());
      const resp = await fetch(SERVER_PDF_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, filename: sanitizePdfFilename(filename) }),
      });
      if (!resp.ok) throw new Error("Server PDF failed with " + resp.status);
      const blob = await resp.blob();
      await savePdfBlob(blob, filename);
    } catch (err) {
      console.error(err);
      runPdfExportAsPrint(elRoot, filename);
    }
  }

  /** @param {string} filename
   *  @param {{ asImage?: boolean, asAts?: boolean, asDesign?: boolean }} [options]
   *  asAts = pdfmake ATS PDF (text layer, plain),
   *  asDesign = pdfmake Design PDF (text layer, simplified blue layout),
   *  asImage = image PDF (html2canvas),
   *  default = print window (HTML + print dialog).
   */
  function runPdfExport(filename, options) {
    syncFromEditor();
    const data = buildInternalFromForm();
    renderDoc(data);
    const el = elRoot;
    const asImage = options && options.asImage;
    const asAts = options && options.asAts;
    const asDesign = options && options.asDesign;

    if (asAts) {
      runPdfExportAsAts(data, filename);
      return;
    }
    if (asDesign) {
      runPdfExportAsDesign(data, filename);
      return;
    }
    if (options && options.useServer) {
      runPdfExportViaServer(filename, data);
      return;
    }
    if (asImage) {
      runPdfExportAsImage(el, filename);
      return;
    }

    runPdfExportAsPrint(el, filename);
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
    if (d.headline) content.push({ text: d.headline, style: "headline", margin: [0, 0, 0, 10] });
    if (Array.isArray(d.contacts) && d.contacts.length)
      content.push({ text: d.contacts.join("  ·  "), style: "contacts", margin: [0, 0, 0, 12] });

    if (d.profile && d.profile.all)
      content.push(...section(d.profileTitle || "Profile", { text: d.profile.all, style: "body" }));

    if (Array.isArray(d.keyImpact) && d.keyImpact.length)
      content.push(...section(d.keyImpactTitle || "Key Impact", { ul: d.keyImpact.map(bullet) }));

    if (Array.isArray(d.coreCompetencies) && d.coreCompetencies.length)
      content.push(...section(d.coreCompetenciesTitle || "Core Competencies", { text: d.coreCompetencies.map(bullet).join("  ·  "), style: "body" }));

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

    if (Array.isArray(d.languages) && d.languages.length)
      content.push(...section(d.languagesTitle || "Languages", { ul: d.languages.map(bullet) }));

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

  /** One-click Design PDF with text layer (pdfmake). Approximates default blue layout. */
  function runPdfExportAsDesign(data, filename) {
    if (typeof pdfMake === "undefined" || typeof pdfMake.createPdf !== "function") {
      runPdfExportAsPrint(elRoot, filename);
      return;
    }
    const d = data || buildInternalFromForm();
    const bullet = (t) => (typeof t === "string" ? t : (t && t.text) || "");

    const headerColumns = [];
    const leftStack = [];
    const rightStack = [];
    if (d.name) leftStack.push({ text: d.name, style: "design_name" });
    if (d.headline) leftStack.push({ text: d.headline, style: "design_headline", margin: [0, 4, 0, 0] });
    if (Array.isArray(d.contacts) && d.contacts.length) {
      rightStack.push({ text: d.contacts.join("\n"), style: "design_contacts" });
    }
    if (leftStack.length || rightStack.length) {
      headerColumns.push({
        columns: [
          { width: "*", stack: leftStack },
          { width: "auto", stack: rightStack, alignment: "right" },
        ],
        margin: [0, 0, 0, 14],
      });
    }

    const section = (title) => ({
      text: String(title || "").toUpperCase(),
      style: "design_sectionHeader",
      margin: [0, 18, 0, 6],
    });

    const content = [...headerColumns];

    if (d.profile && d.profile.all) {
      content.push(section(d.profileTitle || (typeof window.t === "function" ? window.t("section.profile") : "Profile")));
      content.push({ text: d.profile.all, style: "design_body" });
    }

    if (Array.isArray(d.keyImpact) && d.keyImpact.length) {
      content.push(section(d.keyImpactTitle || (typeof window.t === "function" ? window.t("section.keyImpact") : "Key impact")));
      content.push({ ul: d.keyImpact.map(bullet), style: "design_list" });
    }

    if (Array.isArray(d.coreCompetencies) && d.coreCompetencies.length) {
      content.push(
        section(
          d.coreCompetenciesTitle ||
            (typeof window.t === "function" ? window.t("section.coreCompetencies") : "Core competencies")
        )
      );
      content.push({
        text: d.coreCompetencies.map(bullet).join("  ·  "),
        style: "design_body",
      });
    }

    const expTitle =
      d.experienceTitle || (typeof window.t === "function" ? window.t("section.experience") : "Professional experience");
    if (Array.isArray(d.experience) && d.experience.length) {
      content.push(section(expTitle));
      d.experience.forEach((job, idx) => {
        if (idx > 0) {
          content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#d1d5db" }], margin: [0, 10, 0, 10] });
        }
        const title = [job.company, job.title].filter(Boolean).join(" - ");
        if (title) {
          content.push({ text: title, style: "design_jobTitle", margin: [0, 0, 0, 1] });
        }
        if (job.meta) {
          content.push({ text: job.meta, style: "design_meta", margin: [0, 0, 0, 3] });
        }
        if (job.summary) {
          content.push({ text: job.summary, style: "design_body", margin: [0, 0, 0, 3] });
        }
        if (Array.isArray(job.bullets) && job.bullets.length) {
          content.push({ ul: job.bullets.map(bullet), style: "design_list", margin: [0, 0, 0, 6] });
        }
      });
    }

    if (Array.isArray(d.education) && d.education.length) {
      content.push(
        section(d.educationTitle || (typeof window.t === "function" ? window.t("section.education") : "Education"))
      );
      content.push({ ul: d.education, style: "design_list" });
    }

    if (Array.isArray(d.projects) && d.projects.length) {
      content.push(
        section(d.projectsTitle || (typeof window.t === "function" ? window.t("section.projects") : "Selected projects"))
      );
      content.push({ ul: d.projects, style: "design_list" });
    }

    if (Array.isArray(d.languages) && d.languages.length) {
      content.push(
        section(d.languagesTitle || (typeof window.t === "function" ? window.t("section.languages") : "Languages"))
      );
      content.push({ ul: d.languages.map(bullet), style: "design_list" });
    }

    const docDef = {
      pageSize: "A4",
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { fontSize: 10, color: "#111827" },
      styles: {
        design_name: { fontSize: 20, bold: true, color: "#111827" },
        design_headline: { fontSize: 11, color: "#4b5563" },
        design_contacts: { fontSize: 10, color: "#4b5563" },
        design_sectionHeader: {
          fontSize: 11,
          bold: true,
          color: "#2563eb",
          margin: [0, 18, 0, 6],
        },
        design_jobTitle: { fontSize: 11, bold: true },
        design_meta: { fontSize: 9, color: "#6b7280" },
        design_body: { fontSize: 10, color: "#111827" },
        design_list: { fontSize: 10, margin: [0, 2, 0, 0] },
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

  function runPdfExportAsPrint(el, filename) {
    if (!el) {
      window.print();
      return;
    }
    const docHtml = el.innerHTML;
    const data = buildInternalFromForm();
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
    const mainStylesheet = document.querySelector('link[rel="stylesheet"]');
    const styleHref = mainStylesheet && mainStylesheet.href ? mainStylesheet.href : "styles.css";
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(baseTitle)}</title>
  <link rel="stylesheet" href="${esc(styleHref)}" />
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
    @media print { .print-tip, .print-actions { display: none !important; } }
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
  <main class="doc">${docHtml}</main>
  <script>
    document.getElementById("printTrigger").onclick = function() { window.focus(); window.print(); };
  </script>
</body>
</html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function runPdfExportAsImage(el, filename) {
    function setPdfExportUi(exporting) {
      el.classList.toggle("pdf-export", exporting);
      elPrint.disabled = exporting;
      elPrint.textContent = window.t(exporting ? "button.exportPdfBusy" : "button.exportPdf");
      if (!exporting) {
        renderDoc(buildInternalFromForm());
        if (elPrint) elPrint.focus();
      }
    }
    const done = () => setPdfExportUi(false);
    setPdfExportUi(true);
    el.scrollIntoView({ block: "start", behavior: "auto" });
    if (el.parentElement) el.parentElement.scrollTop = 0;

    const usePerPage =
      typeof html2canvas !== "undefined" &&
      (typeof jspdf !== "undefined" || typeof jsPDF !== "undefined");

    if (usePerPage) {
      requestAnimationFrame(() => {
        balancePages();
        ensureNoPageOverflows();
        requestAnimationFrame(() => {
          const remainingPages = removeEmptyPages(el);
          const JsPDF = (typeof jspdf !== "undefined" && jspdf.jsPDF) || (typeof jsPDF !== "undefined" && jsPDF) || null;
          if (!JsPDF || remainingPages.length === 0) {
            done();
            if (remainingPages.length === 0) return;
          }
          const pdf = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
          const canvasOpt = { scale: PDF_CANVAS_SCALE, useCORS: true, scrollX: 0, scrollY: 0, logging: false };
          const addPageToPdf = (pageIndex) => {
            if (pageIndex >= remainingPages.length) {
              const blob = pdf.output("blob");
              savePdfBlob(blob, filename).then(done).catch((err) => { console.error(err); done(); });
              return;
            }
            const pageEl = remainingPages[pageIndex];
            pageEl.scrollIntoView({ block: "start", behavior: "auto" });
            setTimeout(() => {
              html2canvas(pageEl, canvasOpt)
                .then((canvas) => {
                  const dataUrl = canvas.toDataURL("image/jpeg", PDF_JPEG_QUALITY);
                  if (pageIndex > 0) pdf.addPage();
                  pdf.addImage(dataUrl, "JPEG", 0, 0, 210, 297);
                  addPageToPdf(pageIndex + 1);
                })
                .catch((err) => { console.error(err); done(); window.print(); });
            }, PDF_PAGE_DELAY_MS);
          };
          addPageToPdf(0);
        });
      });
    } else if (typeof html2pdf !== "undefined") {
      const opt = {
        margin: 0,
        filename: sanitizePdfFilename(filename),
        image: { type: "jpeg", quality: PDF_JPEG_QUALITY },
        html2canvas: { scale: PDF_CANVAS_SCALE, useCORS: true, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      requestAnimationFrame(() => {
        balancePages();
        ensureNoPageOverflows();
        requestAnimationFrame(() => {
          const remainingPages = removeEmptyPages(el);
          opt.pagebreak = remainingPages.length > 1 ? { mode: "css", before: ".page-break-preview + .page" } : {};
          html2pdf().set(opt).from(el).save().then(done).catch((err) => { console.error(err); done(); window.print(); });
        });
      });
    } else {
      window.print();
      done();
    }
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
  if (elExportPdfSaveImage) {
    elExportPdfSaveImage.addEventListener("click", () => {
      const name = elExportPdfFilename ? elExportPdfFilename.value.trim() : "";
      closeExportPdfModal(false);
      runPdfExport(name || "CV.pdf", { asImage: true });
    });
  }
  if (elExportPdfSaveAts) {
    elExportPdfSaveAts.addEventListener("click", () => {
      const name = elExportPdfFilename ? elExportPdfFilename.value.trim() : "";
      closeExportPdfModal(false);
      runPdfExport(name || "CV.pdf", { asAts: true });
    });
  }
  if (elExportPdfSaveDesign) {
    elExportPdfSaveDesign.addEventListener("click", () => {
      const name = elExportPdfFilename ? elExportPdfFilename.value.trim() : "";
      closeExportPdfModal(false);
      runPdfExport(name || "CV.pdf", { asDesign: true });
    });
  }
  if (elExportPdfSaveServer) {
    elExportPdfSaveServer.addEventListener("click", () => {
      const name = elExportPdfFilename ? elExportPdfFilename.value.trim() : "";
      closeExportPdfModal(false);
      runPdfExport(name || "CV.pdf", { useServer: true });
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

  elUploadJson.addEventListener("click", () => elJsonFileInput.click());

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
