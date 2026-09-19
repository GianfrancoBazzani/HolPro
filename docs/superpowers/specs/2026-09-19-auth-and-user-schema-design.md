# Authentication and user schema — design

Date: 2026-09-19
Status: approved for planning

## 1. Goal

Add the first version of identity and access to HolPro:

- A MySQL schema for users, coaches, coachees, coach specialties and engagements, managed with Drizzle.
- Authentication with Better Auth: email and password, magic links, email verification and account recovery. All emails go through Resend.
- Two login portals with the same components: one for coachees at `/login`, one for coaches at `/pro/login`.
- Two placeholder signed-in areas: `/app` for coachees and `/pro` for coaches.

Out of scope: OAuth providers, profile editing, coach discovery, engagement creation, any real dashboard content.

## 2. Decisions

| Topic | Decision |
|---|---|
| Role model | Class-table inheritance. One `users` row per email. A `coaches` or `coachees` row gives the role. A person can hold both roles later, but registration creates one. |
| Wrong portal | A login on the wrong portal fails. The app signs the person out and shows an error. |
| Role assignment | A gate at the boundary of each signed-in area, not a Better Auth hook. See section 5. |
| OAuth | None in this version. The `accounts` table stays because Better Auth stores password hashes there. |
| Database code | A workspace package `packages/db`, name `@holpro/db`. The web app imports it. |
| Database | MySQL 8.0.16 or newer. The user provisions it. The app assumes `DATABASE_URL` works. |

## 3. Package layout

```
packages/
  db/
    package.json          @holpro/db
    drizzle.config.ts
    src/
      index.ts            exports schema, relations, db client
      client.ts           mysql2 pool + drizzle instance, timezone 'Z'
      schema/
        auth.ts           users, sessions, accounts, verifications
        coaching.ts       coaches, coach_specialties, coachees, engagements
        relations.ts      drizzle relations()
        index.ts
    drizzle/              generated SQL migrations, committed
    test/
  web-app/
    proxy.ts
    app/
      api/auth/[...all]/route.ts
      login/                      coachee portal
        page.tsx
        sent/page.tsx
        reset/page.tsx
        verify/page.tsx
      pro/login/                  coach portal, same pages
      app/layout.tsx  app/page.tsx
      pro/layout.tsx  pro/page.tsx
    lib/
      auth/
        server.ts         betterAuth() instance
        client.ts         createAuthClient()
        portals.ts        portal config
        gate.ts           requirePortalUser()
        actions.ts        server actions for forms
        schemas.ts        zod schemas
      email/
        resend.ts         client and send() with dev fallback
        templates/        magic-link, verify-email, reset-password
    components/auth/      shared form components
```

## 4. Database schema

### 4.1 Type mapping

MySQL has no `UUID` and no `TIMESTAMPTZ`.

| Spec type | MySQL column | Note |
|---|---|---|
| `UUID` | `char(36)` | App-generated with `crypto.randomUUID()`. Better Auth uses `generateId: "uuid"`. |
| `TIMESTAMPTZ` | `datetime(3)` | Client connects with timezone `Z`. All stored values are UTC. `timestamp` stops in 2038. |
| `TEXT` + `CHECK` | `varchar(16)` + `CHECK` | MySQL enforces `CHECK` from 8.0.16. `TEXT` cannot have a default. |
| `TEXT` timezone | `varchar(64)` | IANA names are at most 40 characters. |

### 4.2 Tables

Better Auth field names are camelCase. The Drizzle schema maps each field to a snake_case column name. Better Auth reads the mapping from the schema.

`users`

| Column | Type | Note |
|---|---|---|
| `id` | `char(36)` PK | Better Auth |
| `full_name` | `varchar(255)` NOT NULL | Better Auth field `name` |
| `email` | `varchar(255)` NOT NULL UNIQUE | Better Auth |
| `email_verified` | `boolean` NOT NULL default false | Better Auth |
| `image_url` | `text` nullable | Better Auth field `image` |
| `timezone` | `varchar(64)` NOT NULL default `'UTC'` | Gate replaces with browser timezone |
| `status` | `varchar(16)` NOT NULL default `'pending'` | CHECK in (`pending`, `active`, `suspended`) |
| `email_verified_at` | `datetime(3)` nullable | Set when `email_verified` turns true |
| `created_at` | `datetime(3)` NOT NULL default now | |
| `updated_at` | `datetime(3)` NOT NULL default now, on update now | |
| `deleted_at` | `datetime(3)` nullable | Soft delete |

`sessions`

| Column | Type |
|---|---|
| `id` | `char(36)` PK |
| `user_id` | `char(36)` NOT NULL FK → users.id ON DELETE CASCADE, index |
| `token` | `varchar(255)` NOT NULL UNIQUE |
| `expires_at` | `datetime(3)` NOT NULL |
| `ip_address` | `varchar(45)` nullable |
| `user_agent` | `text` nullable |
| `created_at`, `updated_at` | `datetime(3)` NOT NULL |

`accounts`

| Column | Type |
|---|---|
| `id` | `char(36)` PK |
| `user_id` | `char(36)` NOT NULL FK → users.id ON DELETE CASCADE, index |
| `account_id` | `varchar(255)` NOT NULL |
| `provider_id` | `varchar(255)` NOT NULL |
| `access_token`, `refresh_token`, `id_token` | `text` nullable |
| `access_token_expires_at`, `refresh_token_expires_at` | `datetime(3)` nullable |
| `scope` | `text` nullable |
| `password` | `text` nullable |
| `created_at`, `updated_at` | `datetime(3)` NOT NULL |

`verifications`

| Column | Type |
|---|---|
| `id` | `char(36)` PK |
| `identifier` | `varchar(255)` NOT NULL, index |
| `value` | `text` NOT NULL |
| `expires_at` | `datetime(3)` NOT NULL |
| `created_at`, `updated_at` | `datetime(3)` NOT NULL |

`coaches`

| Column | Type |
|---|---|
| `user_id` | `char(36)` PK, FK → users.id ON DELETE CASCADE |
| `bio` | `text` nullable |
| `accepting_clients` | `boolean` NOT NULL default true |
| `created_at`, `updated_at` | `datetime(3)` NOT NULL |

`coach_specialties`

| Column | Type |
|---|---|
| `coach_id` | `char(36)` FK → coaches.user_id ON DELETE CASCADE |
| `specialty` | `varchar(64)` NOT NULL |

Primary key `(coach_id, specialty)`. MySQL cannot put a `TEXT` column in a primary key without a prefix length, so `specialty` is `varchar(64)`.

`coachees`

| Column | Type |
|---|---|
| `user_id` | `char(36)` PK, FK → users.id ON DELETE CASCADE |
| `created_at` | `datetime(3)` NOT NULL default now |

`engagements`

| Column | Type |
|---|---|
| `id` | `char(36)` PK |
| `coach_id` | `char(36)` NOT NULL FK → coaches.user_id ON DELETE RESTRICT, index |
| `coachee_id` | `char(36)` NOT NULL FK → coachees.user_id ON DELETE RESTRICT, index |
| `status` | `varchar(16)` NOT NULL default `'active'`, CHECK in (`active`, `ended`) |
| `started_at` | `datetime(3)` NOT NULL default now |
| `ended_at` | `datetime(3)` nullable |

An engagement is a record. A coach or coachee delete must not remove it. Soft delete on `users` is the intended path.

### 4.3 Relations

Drizzle `relations()`:

- users 1:1 coaches, users 1:1 coachees
- users 1:N sessions, users 1:N accounts
- coaches 1:N coach_specialties
- coaches 1:N engagements, coachees 1:N engagements

### 4.4 Migrations

`drizzle-kit generate` writes SQL to `packages/db/drizzle/`. The first migration is committed. `drizzle-kit migrate` runs after the MySQL server exists. Scripts in `@holpro/db`: `db:generate`, `db:migrate`, `db:studio`.

## 5. Authentication

### 5.1 Better Auth configuration

File `packages/web-app/lib/auth/server.ts`.

- Adapter: `drizzleAdapter(db, { provider: "mysql", usePlural: true, schema })`.
- `advanced.database.generateId: "uuid"`.
- `baseURL` from `BETTER_AUTH_URL`, `secret` from `BETTER_AUTH_SECRET`. `trustedOrigins` is `[BETTER_AUTH_URL]`.
- `user.additionalFields`: `timezone` (string, default `UTC`, input true), `status` (string, default `pending`, input false), `emailVerifiedAt` (date, input false), `deletedAt` (date, input false). Field to column mapping: `name → full_name`, `image → image_url`, and snake_case for every other field.
- `emailAndPassword`: enabled, `requireEmailVerification: true`, `minPasswordLength: 12`, `maxPasswordLength: 128`, `autoSignIn: false`, `sendResetPassword`, `resetPasswordTokenExpiresIn: 900`, `revokeSessionsOnPasswordReset: true`.
- `emailVerification`: `sendOnSignUp: true`, `autoSignInAfterVerification: true`, `sendVerificationEmail`, `afterEmailVerification` sets `status: active` and `emailVerifiedAt: now`.
- Plugin `magicLink`: `expiresIn: 300`, `disableSignUp: false`, `sendMagicLink`.
- `session`: `expiresIn` 7 days, `updateAge` 1 day, `cookieCache` enabled for 5 minutes.
- `advanced.useSecureCookies` true in production. Cookies are `httpOnly` and `sameSite: lax` by default.
- `rateLimit`: enabled in every environment except test. Custom rules: `/sign-in/magic-link` and `/request-password-reset` 3 per 60 s, `/sign-in/email` 5 per 60 s, `/sign-up/email` 3 per 60 s.
- `databaseHooks.user.create.before`: if `emailVerified` is true, set `status: active` and `emailVerifiedAt: now`.
- `databaseHooks.session.create.before`: load the user; if `status` is `suspended` or `deletedAt` is set, throw `APIError("FORBIDDEN")`.

Route handler: `app/api/auth/[...all]/route.ts` exports `GET` and `POST` from `toNextJsHandler(auth)`.

Client: `lib/auth/client.ts` exports `createAuthClient` with `magicLinkClient` and `inferAdditionalFields<typeof auth>()`.

### 5.2 Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:3306/holpro` |
| `BETTER_AUTH_SECRET` | 32 or more random bytes, base64 |
| `BETTER_AUTH_URL` | Public origin, e.g. `https://holpro.app` |
| `RESEND_API_KEY` | Resend key. Empty in development logs links to the console. |
| `EMAIL_FROM` | e.g. `HolPro <hello@holpro.app>` |

`deploy/.env.example` lists them with empty values.

### 5.3 Portals

`lib/auth/portals.ts`:

```ts
type PortalKey = "coachee" | "coach";
type Portal = {
  key: PortalKey;
  basePath: "/login" | "/pro/login";
  homePath: "/app" | "/pro";
  label: string;          // "For you" | "For coaches"
  heading: string;        // serif headline on the login page
};
```

Every page, action and email receives a `Portal`. Callback URLs are built from it: magic link → `${homePath}`, new user → `${homePath}`, verification → `${basePath}/verify`, reset → `${basePath}/reset`, error → `${basePath}?error=link_invalid`.

### 5.4 Gate

`lib/auth/gate.ts` exports `requirePortalUser(portal)`. The layouts under `/app` and `/pro` call it. Sequence:

1. `auth.api.getSession({ headers })`. No session → `redirect(portal.basePath)`.
2. Load the user with `coach` and `coachee` relations in one query.
3. Decide with the pure function `decideGate({ hasCoach, hasCoachee, portal })`:
   - `enter` when the portal role exists.
   - `register` when no role exists.
   - `reject` when only the other role exists.
4. `register`: in a transaction, insert the child row for the portal, set `timezone` from the `hp_tz` cookie when it is a valid IANA name, set `status: active` when `emailVerified` is true. Return the user.
5. `reject`: `auth.api.signOut({ headers })`, then `redirect(\`${portal.basePath}?error=wrong_portal\`)`.

The login page sets the `hp_tz` cookie on load from `Intl.DateTimeFormat().resolvedOptions().timeZone`. The cookie is not `httpOnly`, lasts 1 year, `sameSite: lax`. The password sign-up form also sends `timezone` in the sign-up body.

### 5.5 Proxy

`packages/web-app/proxy.ts` matches `/app/:path*` and `/pro/:path*`. It reads the session cookie with `getSessionCookie(request)` from `better-auth/cookies`. No cookie → redirect to the portal login. This is an optimistic check. The gate is the real check.

### 5.6 Pages

| Route | Content |
|---|---|
| `{basePath}` | Two tabs: "Email me a link" and "Password". The password tab switches between sign-in and sign-up. Sign-up asks for full name, email, password. Link "Forgot password?" opens a small form for the email. Query `error=wrong_portal` shows "This account is not a {coach/coachee} account. Use the other login." Query `error=link_invalid` shows "This link is invalid or expired. Request a new one." |
| `{basePath}/sent` | "Check your inbox." Reads `kind=magic|reset|verify` from the query and adapts the copy. Neutral text: "If an account exists for this address, we sent a link." |
| `{basePath}/reset` | New password and confirmation. Reads `token` from the query. Missing token → error state. On success, redirect to `{basePath}?reset=ok`. |
| `{basePath}/verify` | Landing after email verification. Shows "Email verified" and a "Continue" button to `homePath`. |
| `{homePath}` | Placeholder. Heading "Welcome, {full_name}", the role label, and a sign-out button. |

### 5.7 Forms and actions

Client components with `useActionState` and Server Actions in `lib/auth/actions.ts`. Server-side validation with `zod` schemas in `lib/auth/schemas.ts`. Actions call `auth.api.*` with `headers()` so cookies propagate.

Actions:

- `sendMagicLink(portal, form)` → neutral success, redirect to `sent?kind=magic`.
- `signInWithPassword(portal, form)` → on success redirect to `homePath`; on `EMAIL_NOT_VERIFIED` show "Verify your email first" with a resend button; on invalid credentials show one generic error.
- `signUpWithPassword(portal, form)` → neutral success, redirect to `sent?kind=verify`. An existing email gets the same message.
- `requestPasswordReset(portal, form)` → neutral success, redirect to `sent?kind=reset`.
- `resetPassword(portal, form)` → on success redirect to `{basePath}?reset=ok`; on bad token show the error state.
- `signOut()` → redirect to `/`.

Every input has a visible label. Errors render under the field with `aria-describedby`. Submit buttons show a busy state and are disabled while pending.

### 5.8 UI

Follow `brand-assets/STYLE.md`. Layout: a two-column grid, `repeat(auto-fit, minmax(min(100%, 420px), 1fr))`. Left column is a Pine panel with the Pine stem artboard (`Artboard 20`) faded with `mask-image`, the Parchment wordmark and one serif line. Right column is the form on Parchment.

- Eyebrow in Cumin: the portal label.
- Heading 2 in Instrument Serif. One `<em>` word in Cumin.
- Inputs: pill shape, `1.5px solid` hairline border, Pine text, Cumin border on focus, `16px 20px` padding.
- Primary button: Pine fill, Parchment text, Cumin on hover. Secondary: outlined Pine.
- Tabs: two pill buttons in a hairline-bordered pill track. The active tab has the Pine fill.
- Coach portal: the Pine panel uses a Pistachio leaf accent. Coachee portal: an Orchid leaf accent.
- No shadows, no gradients on surfaces, radius 20px or more on boxes.

### 5.9 Email

`lib/email/resend.ts` exports `sendEmail({ to, subject, html, text })`. It uses the `resend` package. When `RESEND_API_KEY` is empty and `NODE_ENV !== "production"`, it logs `to`, `subject` and every URL from `text` to the console and returns.

Templates in `lib/email/templates/`: `magicLink`, `verifyEmail`, `resetPassword`. Each is a function `(params: { url, portal }) => { subject, html, text }`. HTML uses inline styles: Parchment background, Pine text, Manrope with system fallback, one Pine pill button, the Pine wordmark from `BETTER_AUTH_URL/brand/wordmark.png`, and a footer line "If you did not request this, ignore this email." Every template includes the plain URL as text for clients that block buttons.

## 6. Error handling

- Auth actions catch `APIError` from Better Auth and map known codes to user copy. Unknown errors log server-side and show "Something went wrong. Try again."
- Email send failures log server-side. The user still sees the neutral "Check your inbox" page. A retry lives in the form.
- Database connection failure at gate time throws, and the Next.js error boundary shows a generic page.
- The gate never leaks the other role in the wrong-portal message beyond "not a coach account" or "not a coachee account", which the person already knows from the page they used.

## 7. Testing

Vitest in both packages. Root `pnpm test` runs `pnpm -r run test`.

`packages/db`:

- Schema drift test: run `drizzle-kit generate` into a temp folder and assert it produces no new migration.
- SQL assertions on the committed migration: `CHECK` constraints on `users.status` and `engagements.status`, `ON DELETE RESTRICT` on engagement FKs, `ON DELETE CASCADE` on child tables, unique `users.email` and `sessions.token`.

`packages/web-app`:

- `portals.ts`: URL builders return the expected paths for both portals.
- `decideGate`: all combinations of `hasCoach`, `hasCoachee`, `portal`.
- Timezone cookie validation: accepts `America/Lima`, rejects `Evil/Value` and empty. Uses `Intl.supportedValuesOf("timeZone")`.
- Zod schemas: password length bounds, email format, password confirmation match.
- Email templates: snapshot per template per portal, and every template's `text` contains the URL.
- The gate uses a repository interface `{ loadUserWithRoles, registerRole }`. Tests pass a fake. No MySQL in tests.

## 8. Dependencies to add

| Package | Where | Version policy |
|---|---|---|
| `drizzle-orm`, `mysql2` | `@holpro/db` | latest stable, exact (workspace `saveExact`) |
| `drizzle-kit` | `@holpro/db` dev | latest stable |
| `better-auth` | `web-app` | latest stable |
| `resend` | `web-app` | latest stable |
| `zod` | `web-app` | latest stable |
| `vitest` | both, dev | latest stable |
| `@holpro/db` | `web-app` | `workspace:*` |

`web-app/tsconfig.json` keeps `@/*`. `next.config.ts` adds `transpilePackages: ["@holpro/db"]` if the package ships TypeScript source.

## 9. Open items for later

- OAuth providers. The `accounts` table and Better Auth make this a config change plus a button.
- Profile editing: timezone, name, coach bio and specialties.
- Coach onboarding steps after the placeholder `/pro` page.
- Engagement creation and the coachee assistant.
