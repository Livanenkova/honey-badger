# Обновление Honey Badger — для поста в LinkedIn

Краткий список того, что добавлено, изменено и улучшено в этой версии. Можно использовать целиком или выдержками для поста.

---

## Что нового

### Редактируемые заголовки секций
- У каждой секции (Profile, Key Impact, Core Competencies, Experience, Education, Projects, Languages) появилась кнопка **Edit heading**.
- По нажатию открывается поле, где можно изменить заголовок так, как он будет отображаться в резюме (например, «KEY IMPACT» → «KEY ACHIEVEMENTS» или «КЛЮЧЕВЫЕ ДОСТИЖЕНИЯ»).
- Резюме перестало быть «только под продактов»: заголовки можно подстроить под любую роль и язык.
- Заголовки сохраняются в JSON и при следующей загрузке подставляются автоматически.

### Удобное сохранение заголовков
- Кнопка **Save** (Сохранить) — явное действие «сохранить и закрыть» редактирование заголовка.
- Подсказки в интерфейсе: «Коснитесь вне поля или нажмите «Сохранить»» и «Превью обновляется после нажатия «Сформировать»».
- Сохранение работает и с телефона (без клавиши Enter): тап по Save или тап вне поля.

### UX и доступность
- Кнопка **Edit heading** и кнопка **Save** подписаны и визуально выделены (синяя кнопка Save).
- Повторное нажатие **Edit heading** закрывает поле редактирования (режим переключается).
- Подсказки показываются только когда открыто редактирование заголовка.

---

## Что улучшено

### Код и структура
- Введён общий массив **SECTION_TITLE_FIELDS**: один список полей заголовков используется для значений по умолчанию, при сборке данных формы и при загрузке из JSON. Меньше дублирования, проще поддерживать.
- Удалён неиспользуемый код (функция `renderRole`, переменная `draggedIdx`).
- Логика перетаскивания блоков опыта и синхронизация формы перед действиями «Вверх» / «Вниз» / «Удалить» доработаны.

### Документация
- В README в блок Features добавлен пункт про **Custom section titles** (редактируемые заголовки секций).

---

## Технические детали (если нужны в посте)

- **Стек:** vanilla JS, HTML, CSS, без фреймворков.
- **Локализация:** EN/RU, все новые строки (кнопки, подсказки) добавлены в `strings.js`.
- **Данные:** кастомные заголовки сохраняются в плоском JSON (поля `profileTitle`, `keyImpactTitle`, `educationTitle` и т.д.) и подставляются при импорте.

---

## Вариант текста для поста (коротко)

**Русский:**
Обновила Honey Badger — CV builder без аккаунта и бэкенда. Теперь можно менять заголовки секций (Profile, Key Impact, Education и др.) под свою роль и язык. У каждой секции — кнопка Edit heading и явная кнопка Save, подсказки в интерфейсе. Удобно и с телефона. Ссылка в первом комментарии.

**English:**
Updated Honey Badger — a no-account, offline CV builder. You can now customize section titles (Profile, Key Impact, Education, etc.) for any role and language. Each section has an Edit heading button and a clear Save button, with in-app hints. Works well on mobile too. Link in the first comment.

---

## Вариант текста для поста (подробнее)

**Русский:**
Выкатила обновление Honey Badger — простого конструктора резюме, который работает офлайн и не хранит данные на сервере.

В этой версии:
• Редактируемые заголовки секций — у каждой секции (Profile, Key Impact, Experience, Education, Projects, Languages) есть «Edit heading». Можно заменить стандартные заголовки на свои (например, под другую роль или язык).
• Удобное сохранение: кнопка «Сохранить» и подсказки, как сохранить и когда обновится превью. Всё работает и с телефона, без опоры на Enter.
• Небольшой рефакторинг: один источник правды для полей заголовков, меньше дублирования в коде.

Резюме можно по-прежнему скачать в PDF или сохранить в JSON и версионировать в Git. Ссылка на проект — в первом комментарии.

**English:**
Shipped an update to Honey Badger — a simple, offline-first CV builder that keeps your data local.

In this release:
• Custom section titles — each section (Profile, Key Impact, Experience, Education, Projects, Languages) has an “Edit heading” control. You can replace default labels to match your role or language.
• Clear save flow: a dedicated Save button and in-app hints on how to save and when the preview updates. Works on mobile without relying on Enter.
• Small refactor: a single source of truth for section title fields and less duplication in the code.

You can still export to PDF or save/load JSON and version it in Git. Link in the first comment.
