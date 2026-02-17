window.addEventListener("DOMContentLoaded", () => {
  // ---------- DOM ----------
  const elRoot = document.getElementById("cvRoot");

  const elRender = document.getElementById("renderBtn");
  const elPrint = document.getElementById("printBtn");
  const elDownloadJson = document.getElementById("downloadJsonBtn");
  const elUploadJson = document.getElementById("uploadJsonBtn");
  const elJsonFileInput = document.getElementById("jsonFileInput");
  const elReset = document.getElementById("resetBtn");

  // Optional JSON paste UI
  const fJsonPaste = document.getElementById("fJsonPaste");
  const elApplyJson = document.getElementById("applyJsonBtn");

  const fName = document.getElementById("fName");
  const fHeadline = document.getElementById("fHeadline");
  const fContacts = document.getElementById("fContacts");
  const fProfile = document.getElementById("fProfile");
  const fImpact = document.getElementById("fImpact");
  const fChips = document.getElementById("fChips");
  const fExpTitle = document.getElementById("fExpTitle");

  const fEdu = document.getElementById("fEdu");
  const fProjects = document.getElementById("fProjects");

  const elAddExp = document.getElementById("addExpBtn");
  const elExpList = document.getElementById("expList");

  // ---------- Guard: required elements ----------
  const required = [
    ["cvRoot", elRoot],
    ["renderBtn", elRender],
    ["printBtn", elPrint],
    ["downloadJsonBtn", elDownloadJson],
    ["uploadJsonBtn", elUploadJson],
    ["jsonFileInput", elJsonFileInput],
    ["resetBtn", elReset],
    ["fName", fName],
    ["fHeadline", fHeadline],
    ["fContacts", fContacts],
    ["fProfile", fProfile],
    ["fImpact", fImpact],
    ["fChips", fChips],
    ["fEdu", fEdu],
    ["fProjects", fProjects],
    ["addExpBtn", elAddExp],
    ["expList", elExpList],
  ];

  const missing = required.filter(([, el]) => !el).map(([id]) => id);
  if (missing.length) {
    alert(
      "Honey Badger: required elements not found in HTML:\n" +
        missing.map((x) => `#${x}`).join("\n") +
        "\n\nFix: make sure index.html has these exact id attributes."
    );
    return;
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
    return `
      <div class="expItem" data-idx="${idx}">
        <div class="row">
          <div class="field">
            <label>Company</label>
            <input class="xCompany" value="${esc(item.company)}" />
          </div>
          <div class="field">
            <label>Title</label>
            <input class="xTitle" value="${esc(item.title)}" />
          </div>
        </div>

        <div class="field">
          <label>Meta (dates/location)</label>
          <input class="xMeta" value="${esc(item.meta)}" />
        </div>

        <div class="field">
          <label>Summary</label>
          <input class="xSummary" value="${esc(item.summary)}" />
        </div>

        <div class="field">
          <label>Bullets (one per line)</label>
          <textarea class="xBullets">${esc(item.bullets.join("\n"))}</textarea>
        </div>

        <div class="expActions">
          <button class="mini-btn xUp" type="button">↑</button>
          <button class="mini-btn xDown" type="button">↓</button>
          <button class="mini-btn xDel" type="button">Delete</button>
        </div>
      </div>
    `;
  }

  function renderExpEditor() {
    elExpList.innerHTML = expItems.map((it, i) => expTemplate(it, i)).join("");
  }

  function syncFromEditor() {
    const nodes = elExpList.querySelectorAll(".expItem");
    expItems = [...nodes].map((box) => ({
      company: box.querySelector(".xCompany").value.trim(),
      title: box.querySelector(".xTitle").value.trim(),
      meta: box.querySelector(".xMeta").value.trim(),
      summary: box.querySelector(".xSummary").value.trim(),
      bullets: lines(box.querySelector(".xBullets").value),
    }));
  }

  elExpList.addEventListener("input", () => {
    syncFromEditor();
  });

  elExpList.addEventListener("click", (e) => {
    const box = e.target.closest(".expItem");
    if (!box) return;
    const idx = Number(box.dataset.idx);

    if (e.target.classList.contains("xDel")) {
      expItems.splice(idx, 1);
      renderExpEditor();
      return;
    }
    if (e.target.classList.contains("xUp") && idx > 0) {
      [expItems[idx - 1], expItems[idx]] = [expItems[idx], expItems[idx - 1]];
      renderExpEditor();
      return;
    }
    if (e.target.classList.contains("xDown") && idx < expItems.length - 1) {
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
      keyImpact: lines(fImpact.value).map((t) => ({ text: t, tags: ["all"] })),
      coreCompetencies: lines(fChips.value).map((t) => ({ text: t, tags: ["all"] })),
      experienceTitle: fExpTitle?.value?.trim() || "PROFESSIONAL EXPERIENCE",
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
    return [
      ...expBlocks,
      ...(edu.length ? [{ type: "section", title: "EDUCATION", bullets: edu.map((t) => ({ text: t, tags: ["all"] })) }] : []),
      ...(proj.length ? [{ type: "section", title: "SELECTED PRODUCT PROJECTS", bullets: proj.map((t) => ({ text: t, tags: ["all"] })) }] : []),
    ];
  }

  function getPageBottomMarginPx(pageEl) {
    if (!pageEl) return 0;
    return parseFloat(getComputedStyle(pageEl).paddingBottom) || 0;
  }

  function balancePages() {
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
      const effectiveBottom = p1Rect.bottom - marginBottom;

      if (candRect.bottom > effectiveBottom + 1) {
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
  }

  function splitPage2IntoPage3() {
    const pages = elRoot.querySelectorAll(".page");
    const p2 = pages[1];
    if (!p2 || p2.classList.contains("page--empty")) return;
    const marginBottom = getPageBottomMarginPx(p2);
    const maxContentHeight = p2.clientHeight - marginBottom;
    if (p2.scrollHeight <= maxContentHeight + 1) return;

    const p3 = document.createElement("section");
    p3.className = "page";
    const break3 = document.createElement("div");
    break3.className = "page-break-preview";
    break3.setAttribute("aria-hidden", "true");
    break3.innerHTML = "<span>— Page 3 —</span>";

    while (p2.children.length > 0 && p2.scrollHeight > p2.clientHeight - marginBottom + 1) {
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
      const maxContentHeight = last.clientHeight - marginBottom;
      if (last.scrollHeight <= maxContentHeight + 1) break;

      const pageNum = pages.length + 1;
      const breakEl = document.createElement("div");
      breakEl.className = "page-break-preview";
      breakEl.setAttribute("aria-hidden", "true");
      breakEl.innerHTML = `<span>— Page ${pageNum} —</span>`;
      const newPage = document.createElement("section");
      newPage.className = "page";

      while (last.children.length > 0 && last.scrollHeight > last.clientHeight - marginBottom + 1) {
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
  function renderRole(role, withDivider) {
    const bullets = (role.bullets || []).map((b) => b.text);
    const summary = role.summary ? `<p class="body body--tight">${esc(role.summary)}</p>` : "";
    return `
      <article class="exp ${withDivider ? "exp--divider" : ""}">
        <div class="exp__head">
          <div class="exp__role">${esc([role.company, role.title].filter(Boolean).join(" - "))}</div>
          <div class="exp__meta">${esc(role.meta || "")}</div>
        </div>
        ${summary}
        ${listHtml(bullets)}
      </article>
    `;
  }

  function renderDoc(d) {
    const impacts = (d.keyImpact || []).map((x) => x.text);
    const chips = (d.coreCompetencies || []).map((x) => x.text);

    const page1ExpTitle = d.experienceTitle || "PROFESSIONAL EXPERIENCE";
    const blocks = dataToBlocks(d);
    const hasPage2 = blocks.length > 0;

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
          ${sectionHead("PROFILE")}
          <p class="body">${esc(d.profile?.all || "")}</p>
        </section>

        ${
          impacts.length
            ? `
          <section class="section">
            ${sectionHead("KEY IMPACT")}
            <div class="card">${listHtml(impacts)}</div>
          </section>
        `
            : ""
        }

        ${
          chips.length
            ? `
          <section class="section">
            ${sectionHead("CORE COMPETENCIES")}
            <div class="chips">${chips.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
          </section>
        `
            : ""
        }

        <section class="section section--experience">
          ${sectionHead(page1ExpTitle)}
          <div class="experience-container"></div>
        </section>
      </section>
    `;

    const page2 = `
      <section class="page">
        ${blocks
          .map((b, i) => {
            const bullets = normalizeTextBullets(b.bullets);
            const subtitle = b.subtitle ? `<p class="body body--tight">${esc(b.subtitle)}</p>` : "";

            const isExperience = b.type === "experience";
            const prev = blocks[i - 1];
            const addDivider =
              i !== 0 &&
              isExperience &&
              prev &&
              prev.type === "experience";

            if (b.type === "section") {
              // No divider for EDUCATION / PROJECTS etc.
              return `
                <section class="section">
                  ${sectionHead(b.title || "", "grey")}
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
    elRoot.innerHTML = page1 + (hasPage2 ? pageBreakHtml + page2 : "");
    elRoot.classList.remove("doc--two-pages");
    if (hasPage2) {
      requestAnimationFrame(() => balancePages());
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

    return {
      schemaVersion: "cv.v1",
      name: basics.fullName || "",
      headline: basics.title || "",
      contacts,
      profile: { all: incoming?.summary || "" },
      keyImpact: [],
      coreCompetencies: skills.map((t) => ({ text: t, tags: ["all"] })),
      experienceTitle: "PROFESSIONAL EXPERIENCE",
      experience,
      education: eduLines,
      projects: [],
    };
  }

  function loadFromJsonData(raw) {
    const incoming = unwrapPayload(raw);

    if (!incoming || typeof incoming !== "object") {
      alert("Invalid JSON: root is not an object");
      return;
    }

    const normalized = normalizeIncomingToInternalSchema(incoming);

    // fill top
    fName.value = normalized.name || "";
    fHeadline.value = normalized.headline || "";
    fContacts.value = (normalized.contacts || []).join("\n");
    fProfile.value = normalized.profile?.all || "";

    fImpact.value = normalizeTextBullets(normalized.keyImpact).join("\n");
    fChips.value = normalizeTextBullets(normalized.coreCompetencies).join("\n");

    if (fExpTitle) {
      fExpTitle.value =
        normalized.experienceTitle ?? normalized.pages?.page1?.experienceTitle ?? "PROFESSIONAL EXPERIENCE";
    }

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

    if (fJsonPaste) fJsonPaste.value = "";
  }

  // ---------- ACTIONS ----------
  elRender.addEventListener("click", () => {
    syncFromEditor();
    renderDoc(buildInternalFromForm());
  });

  elPrint.addEventListener("click", () => {
    syncFromEditor();
    renderDoc(buildInternalFromForm());
    const el = elRoot;
    const done = () => {
      el.classList.remove("pdf-export");
      elPrint.disabled = false;
      elPrint.textContent = "Export PDF";
      renderDoc(buildInternalFromForm());
    };

    const usePerPageExport =
      typeof html2canvas !== "undefined" &&
      (typeof jspdf !== "undefined" || typeof jsPDF !== "undefined");

    if (usePerPageExport) {
      elPrint.disabled = true;
      elPrint.textContent = "…";
      el.classList.add("pdf-export");
      el.scrollIntoView({ block: "start", behavior: "auto" });
      if (el.parentElement) el.parentElement.scrollTop = 0;

      requestAnimationFrame(() => {
        const pages = el.querySelectorAll(".page");
        pages.forEach((p) => {
          const empty =
            p.classList.contains("page--empty") || p.children.length === 0;
          if (empty) {
            const prev = p.previousElementSibling;
            if (prev && prev.classList.contains("page-break-preview")) prev.remove();
            p.remove();
          }
        });

        const remainingPages = el.querySelectorAll(".page");
        const JsPDF = (typeof jspdf !== "undefined" && jspdf.jsPDF) || (typeof jsPDF !== "undefined" && jsPDF) || null;

        if (!JsPDF || remainingPages.length === 0) {
          done();
          if (remainingPages.length === 0) return;
        }

        const pdf = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        const canvasOpt = {
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          logging: false,
        };

        const addPageToPdf = (pageIndex) => {
          if (pageIndex >= remainingPages.length) {
            pdf.save("CV.pdf");
            done();
            return;
          }
          const pageEl = remainingPages[pageIndex];
          pageEl.scrollIntoView({ block: "start", behavior: "auto" });
          setTimeout(() => {
            html2canvas(pageEl, canvasOpt)
              .then((canvas) => {
                const dataUrl = canvas.toDataURL("image/jpeg", 0.98);
                if (pageIndex > 0) pdf.addPage();
                pdf.addImage(dataUrl, "JPEG", 0, 0, 210, 297);
                addPageToPdf(pageIndex + 1);
              })
              .catch((err) => {
                console.error(err);
                done();
                window.print();
              });
          }, 150);
        };

        addPageToPdf(0);
      });
    } else if (typeof html2pdf !== "undefined") {
      elPrint.disabled = true;
      elPrint.textContent = "…";
      el.classList.add("pdf-export");
      el.scrollIntoView({ block: "start", behavior: "auto" });
      if (el.parentElement) el.parentElement.scrollTop = 0;

      const opt = {
        margin: 0,
        filename: "CV.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      requestAnimationFrame(() => {
        const pages = el.querySelectorAll(".page");
        pages.forEach((p) => {
          if (p.classList.contains("page--empty") || p.children.length === 0) {
            const prev = p.previousElementSibling;
            if (prev && prev.classList.contains("page-break-preview")) prev.remove();
            p.remove();
          }
        });
        const remainingPages = el.querySelectorAll(".page");
        opt.pagebreak = remainingPages.length > 1 ? { mode: "css", before: ".page-break-preview + .page" } : {};
        html2pdf()
          .set(opt)
          .from(el)
          .save()
          .then(done)
          .catch((err) => {
            console.error(err);
            done();
            window.print();
          });
      });
    } else {
      window.print();
    }
  });

  elDownloadJson.addEventListener("click", () => {
    syncFromEditor();
    const data = buildInternalFromForm();
    downloadText("resume.internal.json", JSON.stringify(data, null, 2));
  });

  elUploadJson.addEventListener("click", () => elJsonFileInput.click());

  elJsonFileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(String(evt.target.result || "{}"));
        loadFromJsonData(data);
      } catch (err) {
        console.error(err);
        alert("Invalid JSON file: " + (err?.message || err));
      }
    };
    reader.readAsText(file);
  });

  if (elApplyJson && fJsonPaste) {
    elApplyJson.addEventListener("click", (e) => {
      e.preventDefault();
      const raw = fJsonPaste.value.trim();
      if (!raw) return alert("Paste JSON first");
      try {
        const data = JSON.parse(raw);
        loadFromJsonData(data);
      } catch (err) {
        console.error(err);
        alert("JSON parse error: " + (err?.message || err));
      }
    });
  }

  elReset.addEventListener("click", () => {
    fName.value = "";
    fHeadline.value = "";
    fContacts.value = "";
    fProfile.value = "";
    fImpact.value = "";
    fChips.value = "";
    if (fExpTitle) fExpTitle.value = "PROFESSIONAL EXPERIENCE";
    fEdu.value = "";
    fProjects.value = "";
    if (fJsonPaste) fJsonPaste.value = "";
    expItems = [];
    renderExpEditor();
    renderDoc(buildInternalFromForm());
  });

  // ---------- INIT ----------
  renderExpEditor();
  renderDoc(buildInternalFromForm());
});
