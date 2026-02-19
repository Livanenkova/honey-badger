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
        applyJson: "Apply JSON",
        addExp: "+ Add",
        delete: "Delete",
        moveUp: "↑",
        moveDown: "↓",
      },
      label: {
        name: "Name",
        headline: "Headline",
        contacts: "Contacts (one per line)",
        profile: "Profile",
        keyImpact: "Key Impact (one per line)",
        coreCompetencies: "Core Competencies (one per line)",
        experience: "Experience",
        education: "Education (one per line)",
        projects: "Projects (one per line)",
        importJson: "Import JSON",
        company: "Company",
        title: "Title",
        meta: "Meta (dates/location)",
        summary: "Summary",
        bullets: "Bullets (one per line)",
      },
      placeholder: {
        pasteJson: "Paste full CV JSON here...",
      },
      aria: {
        moveUp: "Move up",
        moveDown: "Move down",
        deleteExperience: "Delete this experience",
        importHint: "Paste JSON then click Apply to load into the form.",
        chooseJsonFile: "Choose JSON file to import",
      },
      section: {
        profile: "PROFILE",
        keyImpact: "KEY IMPACT",
        coreCompetencies: "CORE COMPETENCIES",
        experience: "PROFESSIONAL EXPERIENCE",
        education: "EDUCATION",
        projects: "SELECTED PRODUCT PROJECTS",
      },
      message: {
        jsonError: "JSON error",
      },
      exportPdf: {
        title: "Save PDF",
        filenameLabel: "File name",
        save: "Save",
        cancel: "Cancel",
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
        applyJson: "Применить JSON",
        addExp: "+ Добавить",
        delete: "Удалить",
        moveUp: "↑",
        moveDown: "↓",
      },
      label: {
        name: "Имя",
        headline: "Заголовок",
        contacts: "Контакты (по одному на строку)",
        profile: "О себе",
        keyImpact: "Ключевые достижения (по одному на строку)",
        coreCompetencies: "Ключевые навыки (по одному на строку)",
        experience: "Опыт",
        education: "Образование (по одному на строку)",
        projects: "Проекты (по одному на строку)",
        importJson: "Импорт JSON",
        company: "Компания",
        title: "Должность",
        meta: "Период / место",
        summary: "Кратко",
        bullets: "Пункты (по одному на строку)",
      },
      placeholder: {
        pasteJson: "Вставьте сюда JSON резюме...",
      },
      aria: {
        moveUp: "Поднять выше",
        moveDown: "Опустить ниже",
        deleteExperience: "Удалить этот опыт",
        importHint: "Вставьте JSON и нажмите «Применить», чтобы загрузить в форму.",
        chooseJsonFile: "Выберите JSON-файл для импорта",
      },
      section: {
        profile: "О СЕБЕ",
        keyImpact: "КЛЮЧЕВЫЕ ДОСТИЖЕНИЯ",
        coreCompetencies: "НАВЫКИ",
        experience: "ОПЫТ РАБОТЫ",
        education: "ОБРАЗОВАНИЕ",
        projects: "ПРОЕКТЫ",
      },
      message: {
        jsonError: "Ошибка JSON",
      },
      exportPdf: {
        title: "Сохранить PDF",
        filenameLabel: "Имя файла",
        save: "Сохранить",
        cancel: "Отмена",
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
      if (key) el.textContent = window.t(key);
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.setAttribute("placeholder", window.t(key));
    });

    root.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      const key = el.getAttribute("data-i18n-aria-label");
      if (key) el.setAttribute("aria-label", window.t(key));
    });

    root.querySelectorAll("[data-i18n-aria-describedby]").forEach(function (el) {
      const ids = (el.getAttribute("aria-describedby") || "").trim().split(/\s+/);
      const key = el.getAttribute("data-i18n-aria-describedby");
      const firstId = ids[0];
      const hint = firstId ? document.getElementById(firstId) : null;
      if (hint && key) hint.textContent = window.t(key);
    });
  };
})();
