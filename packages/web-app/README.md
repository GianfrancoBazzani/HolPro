# HolPro web app

Next.js App Router implementation of `reference-landing.html`, following
`../../brand-assets/STYLE.md`. The page uses the approved editorial hero,
Instrument Serif and Manrope through `next/font/google`, and local brand imagery.
The prototype's custom-element runtime is not needed.

From the repository root (Node 24.21+ and pnpm 12+):

```sh
pnpm --filter web-app dev
pnpm --filter web-app lint
pnpm --filter web-app build
pnpm --filter web-app start
```

The homepage is at http://localhost:3000. Build before using `start`.
Google Fonts must be reachable during the build; fonts are self-hosted at runtime.

## Assets and content

- `app/page.tsx`: page sections and the reference's audience, step and feature copy.
- `app/globals.css`: brand tokens, components, responsive grids and focus states.
- `app/layout.tsx`: fonts and page metadata.
- `public/brand`: wordmark, logomark and stem patterns copied from `brand-assets`,
  two photos extracted from the reference, and the existing coach-session photo.
- `app/icon.png`: HolPro logomark used as the browser icon.

The reference does not contain a working signup integration or privacy page.
The signup form is explicitly unavailable and disabled; no emails are collected.
Connect a real signup destination before enabling it. The placeholder privacy link
is omitted until there is a policy to link to.

## Accessibility

Small eyebrow labels and footer copyright use solid Pine on Parchment. This is
a deliberate exception to the guide's 14px Cumin and 70%-opacity Pine: those
pairs fall below WCAG AA's 4.5:1 small-text threshold. The CTA supporting line
uses 19px bold to meet the large-text threshold. The page includes a skip link,
visible focus outlines, reduced-motion support and 44px navigation targets.

## Authentication and database

Design: `docs/superpowers/specs/2026-09-19-auth-and-user-schema-design.md`.

Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `BETTER_AUTH_URL`,
`BETTER_AUTH_SECRET` (at least 32 random bytes, base64) and `EMAIL_FROM`.
Provision MySQL 8.0.16 or newer with `utf8mb4` and `utf8mb4_0900_ai_ci` as the
database defaults, for example:

```sql
CREATE DATABASE holpro CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

`deploy/docker-compose.yml` sets these server defaults. From the repository root:

```sh
pnpm --filter @holpro/db db:migrate
pnpm --filter web-app dev
```

`/login` is the coachee portal and `/pro/login` is the coach portal. The
placeholder homes are `/app` and `/pro`.

A signed-in user who opens the other portal keeps the session and lands on
`/login/switch` or `/pro/login/switch`. That page names the account type and
offers a link to the correct area and a sign-out button. Only a blocked
account is signed out, through `/api/gate/reject`.

Without `RESEND_API_KEY` in
development, email links go to the server console. Production requires the key
and a verified Resend sender in `EMAIL_FROM`. The rate limiter keys on the client
address from `x-forwarded-for`. Put the reverse proxy addresses or CIDR ranges
in `TRUSTED_PROXIES`, so the limiter can skip them in the header chain. Without
it, only a single-address header counts, and a request with a longer chain
falls into one shared bucket.

```sh
pnpm test
pnpm typecheck
pnpm --filter web-app lint
pnpm --filter @holpro/db db:generate
```

Tests run without MySQL. Live migration and real Resend delivery need
provisioned services.


## Languages

English (`en`) is the source language; Spanish (`es`) and Italian (`it`) are also available. All user-facing copy lives in `messages/<locale>.json`, with flat keys grouped into namespaces. Spanish and Italian are agent drafts and need native-speaker review before release.

Public marketing pages use `/` for English, `/es` for Spanish and `/it` for Italian. `/en` permanently redirects to `/`. Product paths (`/login`, `/pro/login`, `/app`, `/pro`) never receive a public language prefix: the proxy rewrites internally to `[lang]`, retaining query strings and existing authentication gates. Explicitly prefixed product URLs redirect back to their unprefixed equivalents. Never redirect based on browser language.

Product language resolves from explicit `hp_locale`, then session-only `hp_seen`, then weighted `Accept-Language`, then English. Reading a marketing page records only `hp_seen` when no explicit cookie exists. The footer/auth/home controls and optional landing hint post to `chooseLocale`, which saves `hp_locale` for one year, clears `hp_seen`, and updates `users.locale` for signed-in users. The device cookie controls rendering; stored profile locale is only an email fallback. The marketing landing uses route params for its language and verifies the session at request time to show dashboard links for signed-in visitors. Coaches go to `/pro`; coachees go to `/app`.

Email callbacks resolve request cookies/header before the stored profile locale, then English. The auth request boundary forwards `accept-language`. Apply the generated `packages/db/drizzle/0001_milky_zzzax.sql` migration through the normal deployment workflow before releasing this version; generation and tests do not apply migrations.

Use `getTranslator(locale, namespace)` on the server and `useT(namespace)` in clients. Only the `common` namespace is provided by the root layout and `auth` by AuthShell. Client components must not import dictionaries at runtime; type-only imports are fine. Each key holds a complete sentence or label. Interpolate `{camelCase}` values, and render optional `<em>` emphasis using `Rich`. Other tags remain plain text. Use `Intl` with the current locale for dates, numbers and lists, and the user's timezone for dates.

Signed-in coach and coachee homes share the `AccountControls` header and the `settings` translation namespace. Settings opens a native account dialog containing the language selector. Save changes posts to the existing `chooseLocale` action; closing the dialog discards an unsaved selection. Public and authentication pages retain their inline language controls.

To add a language, add its native name and direction to `lib/i18n/config.ts` and create `messages/<locale>.json` with the same namespace/key order, placeholders and emphasis as English. Loaders automatically discover the matching JSON file. All controls and metadata derive their locale lists from config. Run `pnpm --filter web-app exec vitest run test/i18n.test.tsx`, `pnpm --filter web-app test`, and `pnpm --filter web-app lint`. The parity test checks missing/extra keys, placeholders, emphasis and empty strings. The JSX lint rule catches literal copy; review literal `alt`, `aria-label`, `placeholder` and `title` attributes as well.

Keep text containers flexible for translations up to 30 percent longer. Test every language at 360px and 1360px, including keyboard focus and the language hint. The emergency global-error page deliberately uses English without a dictionary so that a broken provider cannot prevent error recovery.

Unmatched routes use Next.js's documented `experimental.globalNotFound` support for dynamic root layouts. The global fallback resolves the request locale and supplies the same common namespace and fonts, so the initial response is a localized HTTP 404 even without JavaScript. Verify the running production server with `node scripts/check-i18n-http.mjs http://localhost:3000`.

## Coachee calendar dashboard

`/app` aggregates the plan items of every active engagement. Coaches see the existing `/pro` home. Calendar filters and manual row order are saved per user in MySQL, and are loaded on every visit. Saves are serialized; a failed save restores the last confirmed view. Plan-document and assistant panels are placeholders.

Apply `packages/db/drizzle/0002_aromatic_bulldozer.sql` through the normal migration workflow before using the dashboard. The migration adds `plan_items`, `plan_checkpoints`, `plan_periods`, and `calendar_preferences` without changing existing rows.

For development, after migrating and registering a coachee:

```sh
pnpm --filter @holpro/db db:seed:plan -- coachee@example.com
```

This command reads `packages/web-app/.env.local`, rejects production mode, and replaces the first active engagement's plan in a transaction. It creates a sample coach/engagement if necessary. It seeds eight weeks beginning two weeks before the current UTC week. Re-running replaces that plan, including its checkpoints and periods; use only development data.

Whole-day plan dates are ISO strings and always formatted with `Intl` in UTC to preserve the day. Today is computed in the user's stored timezone, falling back to UTC for an invalid timezone. The range is capped at 52 whole weeks with a notice for clipped entries. Dashboard copy is in the `dashboard` namespace; Spanish and Italian dashboard additions are drafts requiring native-speaker review.
