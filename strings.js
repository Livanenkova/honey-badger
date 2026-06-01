/**
 * Localized strings for Honey Badger CV.
 * Use t(key) or t(key, { param: value }) for {param} substitution.
 * Set CURRENT_LOCALE to switch language; call applyLocale() to update UI.
 */
(function () {
  "use strict";

  const LOCALES = {
    en: {
      alert: {
        requiredElementsMissing: "Honey Badger: required elements not found in HTML:\n{ids}\n\nFix: make sure index.html has these exact id attributes.",
        jsonRootInvalid: "Invalid JSON: root is not an object.",
        jsonFileInvalid: "Invalid JSON file: {detail}",
        pasteJsonFirst: "Paste JSON first.",
        jsonParseError: "JSON parse error: {detail}",
      },
      confirm: {
        reset: "Clear all form data and reset the CV?",
      },
      button: {
        generate: "Generate",
        exportPdf: "Export PDF",
        exportPdfBusy: "…",
        reset: "Reset",
        downloadJson: "Download JSON",
        uploadJson: "Upload JSON",
        chooseJsonFile: "Choose file",
        applyJson: "Apply JSON",
        addExp: "+ Add",
        delete: "Delete",
        moveUp: "↑",
        moveDown: "↓",
        editSectionTitles: "Edit section titles",
        editTitle: "Edit",
        editHeading: "Edit heading",
        done: "Save",
        workView: "Work view",
      },
      label: {
        name: "Name",
        headline: "Headline",
        contacts: "Contacts (one per line)",
        profile: "Profile",
        keyImpact: "Key Impact (one per line)",
        coreCompetencies: "Core Competencies (one per line)",
        tools: "Tools (one per line)",
        languages: "Languages (one per line)",
        experience: "Experience",
        education: "Education (one per line)",
        projects: "Projects (one per line)",
        importJson: "Import JSON",
        company: "Company",
        title: "Title",
        meta: "Meta (dates/location)",
        summary: "Summary",
        bullets: "Bullets (one per line)",
        dragToReorder: "Drag to reorder",
        splitBlocks: "Split long blocks between pages",
      },
      placeholder: {
        pasteJson: "Paste full CV JSON here...",
        languages: "e.g. English — Fluent, Russian — Native",
        name: "e.g. Jane Smith",
        headline: "e.g. Senior Product Manager",
        contacts: "City, Country\n+1 555 123 4567\nemail@example.com\nlinkedin.com/in/username",
        profile: "Short summary of your experience and focus areas...",
        keyImpact: "One achievement per line, e.g. Shipped X and increased Y by 20%",
        coreCompetencies: "e.g. Product strategy, Roadmapping, User research",
        tools: "e.g. Notion, Jira, Confluence, Figma, GitHub",
        education: "Degree, Institution (year)",
        projects: "Project name — brief description",
      },
      hintPreview: "Preview updates when you click Generate.",
      tabs: { form: "Form", preview: "Preview" },
      validation: {
        nameEmpty: "Fill in name to see preview.",
      },
      aria: {
        moveUp: "Move up",
        moveDown: "Move down",
        deleteExperience: "Delete this experience",
        dragToReorder: "Drag to reorder",
        importHint: "Paste JSON then click Apply to load into the form.",
        chooseJsonFile: "Choose JSON file to import",
        doneLabel: "Save and close heading",
        coreCompetenciesDisplay: "Core competencies display style",
        toolsDisplay: "Tools display style",
      },
      display: {
        chips: "Chips",
        dots: "Dots",
      },
      section: {
        profile: "PROFILE",
        keyImpact: "KEY IMPACT",
        coreCompetencies: "CORE COMPETENCIES",
        tools: "TOOLS",
        languages: "LANGUAGES",
        experience: "PROFESSIONAL EXPERIENCE",
        education: "EDUCATION",
        projects: "SELECTED PRODUCT PROJECTS",
        continuedSuffix: " (continued)",
      },
      sectionTitleLabel: {
        profile: "Profile",
        keyImpact: "Key Impact",
        coreCompetencies: "Core Competencies",
        tools: "Tools",
        experience: "Experience",
        education: "Education",
        projects: "Projects",
        languages: "Languages",
      },
      message: {
        jsonError: "JSON error",
      },
      exportPdf: {
        title: "Save PDF",
        textLayerHint: "Download PDF matches the preview. Use ATS PDF for the safest applicant tracking system parsing.",
        printTipTitle: "Before saving to PDF:",
        printBtnLabel: "Save as PDF",
        printTip: "In print settings: disable «Headers and footers» (no URL/date in PDF). Enable «Background graphics» to keep blue headings and design.",
        filenameLabel: "File name",
        filenameHint: ".pdf will be added if needed.",
        save: "Download PDF",
        saveAts: "Download ATS PDF",
        cancel: "Cancel",
        serverFailed: "Could not generate preview-matching PDF. Please try again.",
      },
      template: {
        label: "Template",
        default: "Default",
        ats: "ATS",
      },
      empty: {
        preview: "Fill in the form on the left to see your CV here.",
        experience: "Click «+ Add» to add your first job.",
      },
      experience: {
        continued: "(continued)",
        continuedAria: "Continuation of the same job from the previous page.",
      },
      success: {
        jsonApplied: "JSON applied. Form updated.",
        previewUpdated: "Preview updated.",
        draftRestored: "Draft restored.",
      },
      hint: {
        generate: "Update the CV preview with current form data.",
        reset: "Clear all fields and start over.",
        downloadJson: "Download your CV data as a JSON file.",
        uploadJson: "Upload a JSON file to load into the form.",
        exportPdf: "Save the CV as a PDF file.",
        applyJson: "Load the pasted JSON into the form.",
        addExp: "Add a new job or experience entry.",
        dragChip: "Drag to reorder competency",
        splitBlocks: "When enabled, long experience blocks can be split between pages to reduce empty space.",
        workView: "Full-width form + Preview tab (like on tablet).",
        saveHeading: "Tap outside or click Save to save",
        headingUpdatesOnGenerate: "Preview updates when you click Generate.",
      },
    },
    ru: {
      alert: {
        requiredElementsMissing: "Honey Badger: в HTML не найдены обязательные элементы:\n{ids}\n\nУбедитесь, что в index.html указаны эти id.",
        jsonRootInvalid: "Неверный JSON: корень не является объектом.",
        jsonFileInvalid: "Неверный JSON-файл: {detail}",
        pasteJsonFirst: "Вставьте JSON сначала.",
        jsonParseError: "Ошибка разбора JSON: {detail}",
      },
      confirm: {
        reset: "Очистить все поля формы и сбросить резюме?",
      },
      button: {
        generate: "Сформировать",
        exportPdf: "Экспорт PDF",
        exportPdfBusy: "…",
        reset: "Сброс",
        downloadJson: "Скачать JSON",
        uploadJson: "Загрузить JSON",
        chooseJsonFile: "Выбрать файл",
        applyJson: "Применить JSON",
        addExp: "+ Добавить",
        delete: "Удалить",
        moveUp: "↑",
        moveDown: "↓",
        editSectionTitles: "Настроить заголовки секций",
        editTitle: "Изменить",
        editHeading: "Изменить заголовок",
        done: "Сохранить",
        workView: "Рабочий вид",
      },
      label: {
        name: "Имя",
        headline: "Заголовок",
        contacts: "Контакты (по одному на строку)",
        profile: "О себе",
        keyImpact: "Ключевые достижения (по одному на строку)",
        coreCompetencies: "Ключевые навыки (по одному на строку)",
        tools: "Инструменты (по одному на строку)",
        languages: "Языки (по одному на строку)",
        experience: "Опыт",
        education: "Образование (по одному на строку)",
        projects: "Проекты (по одному на строку)",
        importJson: "Импорт JSON",
        company: "Компания",
        title: "Должность",
        meta: "Период / место",
        summary: "Кратко",
        bullets: "Пункты (по одному на строку)",
        dragToReorder: "Перетащите для изменения порядка",
        splitBlocks: "Делить длинные блоки между страницами",
      },
      placeholder: {
        pasteJson: "Вставьте сюда JSON резюме...",
        languages: "напр. English — Fluent, Русский — родной",
        name: "напр. Иван Петров",
        headline: "напр. Senior Product Manager",
        contacts: "Город, Страна\n+7 999 123-45-67\nemail@example.com\nlinkedin.com/in/username",
        profile: "Кратко о себе и ключевых направлениях...",
        keyImpact: "По одному достижению на строку",
        coreCompetencies: "напр. Стратегия продукта, Roadmapping",
        tools: "напр. Notion, Jira, Confluence, Figma, GitHub",
        education: "Степень, Вуз (год)",
        projects: "Название проекта — краткое описание",
      },
      hintPreview: "Превью обновляется по нажатию «Сформировать».",
      tabs: { form: "Форма", preview: "Превью" },
      validation: {
        nameEmpty: "Введите имя, чтобы увидеть превью.",
      },
      aria: {
        moveUp: "Поднять выше",
        moveDown: "Опустить ниже",
        deleteExperience: "Удалить этот опыт",
        dragToReorder: "Перетащите для изменения порядка",
        importHint: "Вставьте JSON и нажмите «Применить», чтобы загрузить в форму.",
        chooseJsonFile: "Выберите JSON-файл для импорта",
        doneLabel: "Сохранить и закрыть заголовок",
        coreCompetenciesDisplay: "Вид отображения навыков",
        toolsDisplay: "Вид отображения инструментов",
      },
      display: {
        chips: "Чипсы",
        dots: "Точки",
      },
      section: {
        profile: "О СЕБЕ",
        keyImpact: "КЛЮЧЕВЫЕ ДОСТИЖЕНИЯ",
        coreCompetencies: "НАВЫКИ",
        tools: "ИНСТРУМЕНТЫ",
        languages: "ЯЗЫКИ",
        experience: "ОПЫТ РАБОТЫ",
        education: "ОБРАЗОВАНИЕ",
        projects: "ПРОЕКТЫ",
        continuedSuffix: " (продолжение)",
      },
      sectionTitleLabel: {
        profile: "О себе",
        keyImpact: "Ключевые достижения",
        coreCompetencies: "Навыки",
        tools: "Инструменты",
        experience: "Опыт",
        education: "Образование",
        projects: "Проекты",
        languages: "Языки",
      },
      message: {
        jsonError: "Ошибка JSON",
      },
      exportPdf: {
        title: "Сохранить PDF",
        textLayerHint: "Download PDF совпадает с превью. Для систем отбора кандидатов надёжнее использовать ATS PDF.",
        printTipTitle: "Перед сохранением в PDF:",
        printBtnLabel: "Сохранить как PDF",
        printTip: "В настройках печати: отключите «Колонтитулы» (чтобы в PDF не было адреса и даты). Включите «Фоновые рисунки» — тогда сохранятся синие заголовки и дизайн.",
        filenameLabel: "Имя файла",
        filenameHint: "Расширение .pdf будет добавлено при необходимости.",
        save: "Скачать PDF",
        saveAts: "Скачать ATS PDF",
        cancel: "Отмена",
        serverFailed: "Не удалось создать PDF как в превью. Попробуйте ещё раз.",
      },
      template: {
        label: "Шаблон",
        default: "Обычный",
        ats: "ATS",
      },
      empty: {
        preview: "Заполните форму слева — здесь появится превью резюме.",
        experience: "Нажмите «+ Добавить», чтобы добавить первое место работы.",
      },
      experience: {
        continued: "(продолжение)",
        continuedAria: "Продолжение того же места работы с предыдущей страницы.",
      },
      success: {
        jsonApplied: "JSON применён. Форма обновлена.",
        previewUpdated: "Превью обновлено.",
        draftRestored: "Черновик восстановлен.",
      },
      hint: {
        generate: "Обновить превью резюме по данным формы.",
        reset: "Очистить все поля и начать заново.",
        downloadJson: "Скачать данные резюме в виде JSON-файла.",
        uploadJson: "Загрузить JSON-файл в форму.",
        exportPdf: "Сохранить резюме в PDF.",
        applyJson: "Загрузить вставленный JSON в форму.",
        addExp: "Добавить новое место работы или опыт.",
        dragChip: "Перетащите для изменения порядка компетенций",
        splitBlocks: "Если включено, длинные блоки опыта можно делить между страницами, чтобы уменьшить пустые зоны.",
        workView: "Форма на всю ширину + вкладка Превью (как на планшете).",
        saveHeading: "Коснитесь вне поля или нажмите «Сохранить»",
        headingUpdatesOnGenerate: "Превью обновляется после нажатия «Сформировать».",
      },
    },
  };

  const DEFAULT_LOCALE = "en";
  const SUPPORTED = Object.keys(LOCALES);

  let currentLocale = DEFAULT_LOCALE;

  function getByPath(obj, path) {
    const parts = path.split(".");
    let v = obj;
    for (const p of parts) {
      v = v != null && typeof v === "object" ? v[p] : undefined;
    }
    return v;
  }

  window.t = function (key, replacements) {
    const s = getByPath(LOCALES[currentLocale], key) ?? getByPath(LOCALES[DEFAULT_LOCALE], key) ?? key;
    if (typeof s !== "string") return key;
    if (!replacements || typeof replacements !== "object") return s;
    return Object.entries(replacements).reduce(
      (acc, [k, v]) => acc.replace(new RegExp("\\{" + k + "\\}", "g"), String(v)),
      s
    );
  };

  window.getLocale = function () {
    return currentLocale;
  };

  window.setLocale = function (code) {
    if (LOCALES[code]) {
      currentLocale = code;
      if (typeof window.applyLocale === "function") window.applyLocale();
      return true;
    }
    return false;
  };

  window.getSupportedLocales = function () {
    return SUPPORTED.slice();
  };

  (function initLocale() {
    const lang = (document.documentElement.getAttribute("lang") || navigator.language || "")
      .toLowerCase()
      .slice(0, 2);
    if (LOCALES[lang]) currentLocale = lang;
  })();

  window.applyLocale = function () {
    const root = document.body;
    if (!root) return;

    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      if (key) {
        const text = window.t(key);
        if (text !== key) el.textContent = text;
      }
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) {
        const text = window.t(key);
        if (text !== key) el.setAttribute("placeholder", text);
      }
    });

    root.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      const key = el.getAttribute("data-i18n-aria-label");
      if (key) {
        const text = window.t(key);
        if (text !== key) el.setAttribute("aria-label", text);
      }
    });

    root.querySelectorAll("[data-i18n-aria-describedby]").forEach(function (el) {
      const ids = (el.getAttribute("aria-describedby") || "").trim().split(/\s+/);
      const key = el.getAttribute("data-i18n-aria-describedby");
      const firstId = ids[0];
      const hint = firstId ? document.getElementById(firstId) : null;
      if (hint && key) {
        const text = window.t(key);
        if (text !== key) hint.textContent = text;
      }
    });

    root.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      const key = el.getAttribute("data-i18n-title");
      if (key) {
        const text = window.t(key);
        if (text !== key) el.setAttribute("title", text);
      }
    });
  };
})();
