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
dashboards are `/app` and `/pro`.

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

`/app` aggregates the plan items of every active engagement. Coaches see their agenda and clients at `/pro`. Calendar filters and manual row order are saved per user in MySQL, and are loaded on every visit. Saves are serialized; a failed save restores the last confirmed view. The plan outline is read-only; the assistant supports chat, voice and published HTML plan documents.

Apply `packages/db/drizzle/0002_aromatic_bulldozer.sql` through the normal migration workflow before using the dashboard. The migration adds `plan_items`, `plan_checkpoints`, `plan_periods`, and `calendar_preferences` without changing existing rows.

For development, after migrating and registering a coachee:

```sh
pnpm --filter @holpro/db db:seed:plan -- coachee@example.com
```

This command reads `packages/web-app/.env.local`, rejects production mode, and replaces the first active engagement's plan in a transaction. It creates a sample coach/engagement if necessary. It seeds eight weeks beginning two weeks before the current UTC week. Re-running replaces that plan, including its checkpoints and periods; use only development data.

Whole-day plan dates are ISO strings and always formatted with `Intl` in UTC to preserve the day. Today is computed in the user's stored timezone, falling back to UTC for an invalid timezone. The range is capped at 52 whole weeks with a notice for clipped entries. Dashboard copy is in the `dashboard` namespace; Spanish and Italian dashboard additions are drafts requiring native-speaker review.

## Coach dashboard

`/pro` shows the coach’s month agenda and active clients. `/pro/clients/<engagementId>`
shows one client’s timeline and editable plan outline. Coach filters and row order
are local to the page; coachee preferences remain persisted. Forms support creating,
editing and deleting events, items, checkpoints and periods, with explicit delete confirmation.

Apply `packages/db/drizzle/0003_yummy_mercury.sql` through the normal migration
workflow before using the agenda. It adds `agenda_events` without changing existing rows.
Generation and tests do not apply the migration.

After registering a coach and coachee in development, seed their engagement with:

```sh
pnpm --filter @holpro/db db:seed:plan -- coachee@example.com coach@example.com
```

This replaces that active engagement’s plan; without a coach email, the previous
sample-coach behavior remains. Use development data only.

Event input is interpreted in the coach’s stored timezone, persisted in UTC and
shown in the coach’s timezone. Missing or doubled daylight-saving times resolve
to the later instant; invalid timezones fall back to UTC. Plan dates remain
whole-day ISO dates formatted in UTC. Agenda events remain coach-owned when a
linked engagement ends; assigning a client requires an active owned engagement.

The `pro` namespace and new `dashboard.outline.*` keys are translated into all
supported languages. Spanish and Italian are drafts requiring native review.

Browser interaction regressions run against real dashboard components with stubbed
server actions (no database or accounts required):

```sh
pnpm --filter web-app exec playwright install chromium
pnpm --filter web-app test:browser
```

These cover dialog focus, failed-submit input retention, pending-action locks,
and responsive layouts in all languages. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can
point to an existing Chromium binary. Live authenticated CRUD still requires a
migrated development database.

## Assistant chat and voice

`/app` and `/pro` share a localized assistant panel. A coachee with no plan
items starts in onboarding, expanded unless they saved another preference.
Saving goals leaves onboarding active until the coach creates a plan item or publishes a plan document.
The coach's assistant can read those goals only through an owned engagement.
Assistant and plan-event requests carry the active portal, which is checked
against current role membership. Dual-role accounts retain separate coach and
coachee chat histories; MCP tokens preserve the selected role.

The header of the panel has a plus button and a history button. The user can
start a new conversation, reopen one of the 20 newest conversations and delete
one. Each conversation is a Mastra thread with the ID `<role>:<userId>:<uuid>`;
the first conversation keeps the legacy ID `<role>:<userId>`. The chat and
`threads` routes accept only IDs inside that namespace and owned by the
session user. The coaching profile is resource-scoped and survives every
conversation. Titles come from `ASSISTANT_TITLE_MODEL` after the first turn.

Apply `packages/db/drizzle/0004_mature_blur.sql` with the normal migration
workflow before release. Generation does not apply it. Mastra's MySQLStore
also creates its own `mastra_*` tables for threads, messages, resource working
memory, workflow snapshots and background-task metadata. The application
MySQL user needs permission to create these tables. There is no vector store
or semantic recall in this version.

Set these server environment variables (also in the example files):

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | required for requests | Model, Whisper transcription and speech |
| `ASSISTANT_MODEL` | `openai/gpt-5.4-mini` | Mastra model id |
| `ASSISTANT_TITLE_MODEL` | `openai/gpt-5.4-mini` | Model for conversation titles |
| `ASSISTANT_VOICE_SPEAKER` | `alloy` | OpenAI TTS speaker |
| `MOCK_TASK_DURATION_MS` | `120000` | Mock task duration |
| `ASSISTANT_SKILLS_DIR` | auto-detected | Absolute workspace path containing `skills/` |

Run **one instance** (`pm2 -i 1`, or one container). The task registry and mock
backend are in memory. A process restart loses mock jobs; persisted workflow
snapshots cannot reconstruct them. Memory remains in MySQL. Skills are copied
into the Docker runtime and loaded from `mastra/workspace` when the working
directory is the app, or `packages/web-app/mastra/workspace` from the repo root.
The workspace filesystem is read-only and contained. Coach-authored skills come
from the `coach_skills` table, not from the workspace.

Use `deploy/nginx.example.conf` to disable proxy buffering and permit long
streams. Chat sends SSE comment heartbeats every 15 seconds. Voice uses HTTP
on a secure origin (HTTPS, or localhost): hold the microphone button, or click
once to start and again to stop. Transcription sends the same text chat turn;
voice playback is optional. Speech failures retry only the failed audio; after
a microphone error, use the recording control to try again. Starting another turn stops current playback and
the current generation, while already-deferred tasks continue in Mastra.

The pinned voice package bundles an older core voice base class, so
`mastra/voice.ts` adapts it to the current base class. Workflows start via
`run.stream()` and await `output.result`: `observeStream()` has no events
before streaming starts in core 1.67.

Spanish and Italian assistant translations are drafts for native review.
Before release, exercise the design's live checklist with a migrated MySQL
instance and OpenAI credentials: onboarding by voice, two-minute task progress
behind nginx, another turn during a task, tab close/reopen with persisted
results, and the same task flow from the coach dashboard. Unit and browser
fixture tests do not call OpenAI or apply database migrations.

## Published plan documents and private MCP

Apply migration `0005_gifted_skreet.sql` through the normal migration workflow
after `0004`. Both migrations are generated, not applied by the build. Set
`MCP_TOKEN_SECRET` to a dedicated key from `openssl rand -base64 32`; production
startup rejects a missing, malformed or shorter key. Keep it on the server.
`BETTER_AUTH_URL` must be the trusted application origin reachable from its own
server: the assistant uses the real `/api/mcp` endpoint with a short-lived JWT.
There is no public token issuance endpoint. Tokens are rechecked against current
user roles and block status on every request.

Coaches publish versioned HTML with the assistant's `publish_plan` tool. Both
roles can list and read scoped documents. `/pro` retains agenda and client
controls and adds engagement/document selectors; `/app` displays published
documents from active engagements. Selecting a document preserves the month.
Document publication ends coachee onboarding. Metadata lists exclude HTML; only
the selected document loads its content.

HTML runs in an opaque `sandbox="allow-scripts"` iframe. The server normalizes
it and inserts CSP before author scripts, removes refresh/base elements, and
blocks parent access, fetch connections, forms and nested frames. Approved CDN
scripts/styles, Google fonts and HTTPS images remain allowed: this is isolation,
not a promise of zero network activity. Arbitrary HTML may navigate its own frame.
Tool protocol diagnostics are fixed English text for the agent; dashboard labels
and assistant statuses are translated (Spanish/Italian drafts need native review).

Publication notifications use process-local SSE with session revalidation and
refresh on connection/reconnection; there is no replay queue. Run one application
process. Adapt the supplied nginx config for streaming and the 16 MB MCP request
limit (the HTML schema separately allows up to 2,000,000 UTF-16 units).

Before release, verify against migrated MySQL: concurrent publishes get distinct
sequential versions; rollback emits no event; foreign/ended engagements are
filtered; two authenticated browser sessions refresh after publishing; restart
and reconnect load the latest version; blocked users lose stream access. Exercise
coach publication through the live model, and confirm iframe behavior behind
HTTPS/nginx. Automated fixture tests do not replace these live checks.


## Telegram assistant

Apply generated migration `0007_cynical_venus.sql` through the normal migration
workflow before enabling the bot. It creates `telegram_links`; builds and tests
do not apply migrations to your application database.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | unset | BotFather token; unset disables the integration |
| `TELEGRAM_BOT_USERNAME` | required with token | Bot username without `@` |
| `TELEGRAM_WEBHOOK_SECRET_TOKEN` | required for webhook | 1–256 letters, digits, `_` or `-`; generate a random secret |
| `TELEGRAM_MODE` | `webhook` | `webhook` or `polling` |

Run one long-lived Node process. From `packages/web-app`, with variables exported:

```sh
node scripts/telegram-set-webhook.mjs --url https://your-host/api/telegram/webhook --dry-run
node scripts/telegram-set-webhook.mjs --url https://your-host/api/telegram/webhook
```

The dry run prints no credentials and makes no network call. The route checks
Telegram’s secret header. Polling starts through Next.js instrumentation and
requires no public URL; use a separate development bot because polling removes
that bot’s webhook. Run registration again when switching back to webhook mode.
Neither mode is started during the production build.

Connect in account settings on `/app` or `/pro`, open the link in Telegram and
press Start. Only ordinary private text messages are accepted. The connection
uses the role of that portal and the account’s stored language/timezone. Device
language may differ. To change role or Telegram account, disconnect first.
`/stop` also disconnects, even after loss of role access. Tokens expire after
15 minutes; reopening settings offers regeneration because only the hash is
stored. Cancellation invalidates that specific pending token.

Telegram has its own transcript (`telegram:<userId>`); the coaching profile is
shared with the web. Disconnect revokes future delivery and deletes HolPro’s
Telegram transcript after active work is cancelled. Messages already delivered
to Telegram remain there. A failed cleanup stays revoked and can be retried.
SDK subscriptions persist, but locks, deduplication, queues and mock jobs do not;
restarts can lose acknowledged updates or cause retries. Delivery is best-effort.

The standard unit suite requires no database or bot credentials. For the
transaction integration test, set `TELEGRAM_TEST_DATABASE_URL` to an **empty,
disposable MySQL 8 database** and run:

```sh
pnpm exec vitest run test/telegram-mysql.test.ts
```

The test refuses a nonempty database and creates the repository schema in that
disposable database. Manually check a real development bot for link/chat/long
task completion, `/stop`, role replacement, and both polling/webhook delivery.
Spanish and Italian Telegram copy is an agent draft requiring native review.
