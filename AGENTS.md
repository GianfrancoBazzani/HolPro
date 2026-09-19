# AGENTS.md

Rules for agents that work in this repository.

## UI design

`brand-assets/STYLE.md` is the reference for any UI design in the app. Before you create or change any user interface, read that file. Apply its colors, fonts, spacing, shapes, components and accessibility rules. If a design decision is not in the guide, follow the reference landing page in `packages/web-app/reference-landing.html`. Do not introduce colors, fonts or shapes that the guide does not define.

## Languages

Every user-facing text is translatable. Follow these rules.

1. Do not write user-facing text in code. Put it in `packages/web-app/messages/en.json` and in every other file in that folder. Read it with `getTranslator` on the server or `useT` in a client component. This includes `alt`, `aria-label`, `placeholder`, `title`, email subjects and error messages.
2. One key holds one full sentence or one full label. Do not build a sentence from parts. If a sentence changes with the portal, the role or a count, create one key per variant.
3. Use `{camelCase}` placeholders for values. Use the same placeholders in every language.
4. Use `<em>` for one emphasized word and render it with `Rich`. Do not put other markup in a message.
5. Format dates, numbers and lists with the `Intl` API and the current locale. Use the user's `timezone` for dates.
6. Read the "Languages" section of `packages/web-app/README.md` before you change routing: public pages carry the language in the URL, product pages do not. Do not add a language prefix to a product URL and do not redirect by browser language.
7. Design for text that is 30 percent longer than English. Do not fix the width of a text container.
8. Set `lang` on any element whose language differs from the page.
9. When you add a key, add it to every language file in the same position. Draft the translation and mark it for review in your summary. Run `pnpm --filter web-app test` and `pnpm --filter web-app lint`; the parity test and the lint rule fail on missing keys or hard-coded text.
10. To add a language, add it to `lib/i18n/config.ts`, add `messages/<locale>.json` and run the tests. Nothing else changes.

## Git

Never run `git commit`, `git push` or any command that changes git history. Stage nothing. The owner reviews the working tree and commits manually.
