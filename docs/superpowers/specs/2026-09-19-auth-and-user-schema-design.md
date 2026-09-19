# Authentication and user schema — design

Date: 2026-09-19
Status: approved for planning (revision 2)

## 1. Goal

Add the first version of identity and access to HolPro:

- A MySQL schema for users, coaches, coachees, coach specialties and engagements, managed with Drizzle.
- Authentication with Better Auth: email and password, magic links, email verification and account recovery. All emails go through Resend.
- Two login portals with the same components: one for coachees at `/login`, one for coaches at `/pro/login`.
- Two placeholder signed-in areas: `/app` for coachees and `/pro` for coaches.

Out of scope: OAuth providers, profile editing, coach discovery, engagement creation, any real dashboard content, admin tools.

## 2. Decisions

| Topic | Decision |
|---|---|
| Role model | Class-table inheritance. One `users` row per email. A `coaches` or `coachees` row gives the role. A person can hold both roles later, but registration creates one. |
| Wrong portal | A login on the wrong portal fails. The app signs the person out and shows an error. |
| Role assignment | A read-only gate at the boundary of each signed-in area sends a user without a role to a welcome page. A Server Action on that page creates the role. No writes happen during a render. See section 5.4. |
| OAuth | None in this version. The `accounts` table stays because Better Auth stores password hashes there. |
| Database code | A workspace package `packages/db`, name `@holpro/db`. The web app imports it. |
| Database | MySQL 8.0.16 or newer, `utf8mb4`. The user provisions it. The app assumes `DATABASE_URL` works. |
| Rate limit storage | Database. In-memory storage does not work across several instances or serverless functions. |

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
        auth.ts           users, sessions, accounts, verifications, rate_limits
        coaching.ts       coaches, coach_specialties, coachees, engagements
        relations.ts      drizzle relations()
        index.ts
    drizzle/              generated SQL migrations, committed
    test/
  web-app/
    proxy.ts
    .env.example
    app/
      api/auth/[...all]/route.ts     Better Auth handler
      api/gate/reject/route.ts       sign out + redirect on wrong portal
      login/                         coachee portal
        page.tsx
        sent/page.tsx
        reset/page.tsx
        welcome/page.tsx
      pro/login/                     coach portal, same pages
      app/layout.tsx  app/page.tsx
      pro/layout.tsx  pro/page.tsx
    lib/
      auth/
        server.ts         betterAuth() instance
        client.ts         createAuthClient()
        portals.ts        portal config and URL builders
        gate.ts           requirePortalUser(), decideGate()
        repository.ts     loadUserWithRoles(), registerRole()
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

Every table uses `utf8mb4` with the server default collation `utf8mb4_0900_ai_ci`. That collation compares emails without case, so the unique index on `users.email` also rejects `Foo@x.com` next to `foo@x.com`.

### 4.2 Tables

Better Auth field names are camelCase. The Drizzle schema maps each field to a snake_case column name. Better Auth reads the mapping from the schema.

`users`

| Column | Type | Note |
|---|---|---|
| `id` | `char(36)` PK | Better Auth |
| `full_name` | `varchar(255)` NOT NULL | Better Auth field `name`. Magic link sign-up leaves it empty until the welcome page. |
| `email` | `varchar(255)` NOT NULL UNIQUE | Better Auth |
| `email_verified` | `boolean` NOT NULL default false | Better Auth |
| `image_url` | `text` nullable | Better Auth field `image` |
| `timezone` | `varchar(64)` NOT NULL default `'UTC'` | The welcome page sets the browser timezone. |
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

`rate_limits` (Better Auth model `rateLimit`)

| Column | Type |
|---|---|
| `id` | `char(36)` PK |
| `key` | `varchar(255)` NOT NULL, index |
| `count` | `int` NOT NULL |
| `last_request` | `bigint` NOT NULL |

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
| `coach_id` | `char(36)` NOT NULL FK → coaches.user_id ON DELETE RESTRICT |
| `coachee_id` | `char(36)` NOT NULL FK → coachees.user_id ON DELETE RESTRICT |
| `status` | `varchar(16)` NOT NULL default `'active'`, CHECK in (`active`, `ended`) |
| `started_at` | `datetime(3)` NOT NULL default now |
| `ended_at` | `datetime(3)` nullable |

Indexes: `(coach_id, status)` and `(coachee_id, status)`. MySQL has no partial unique index, so "one active engagement per pair" is an application rule, not a constraint.

An engagement is a record. A coach or coachee delete must not remove it. Soft delete on `users` is the intended path.

### 4.3 Relations

Drizzle `relations()`:

- users 1:1 coaches, users 1:1 coachees
- users 1:N sessions, users 1:N accounts
- coaches 1:N coach_specialties
- coaches 1:N engagements, coachees 1:N engagements

### 4.4 Client

`src/client.ts` creates one `mysql2/promise` pool with `timezone: "Z"`, `connectionLimit: 5` and `charset: "utf8mb4"`. In development the pool is stored on `globalThis`, so hot reload does not open a new pool on each change. The Drizzle instance uses `mode: "default"` and the full schema, so relational queries work.

### 4.5 Migrations and environment

`drizzle-kit generate` writes SQL to `packages/db/drizzle/`. The first migration is committed. `drizzle-kit migrate` runs after the MySQL server exists.

`drizzle.config.ts` reads `DATABASE_URL` from the process environment. It loads `../web-app/.env.local` with `dotenv` when that file exists, so local development has one place for secrets. Scripts in `@holpro/db`: `db:generate`, `db:migrate`, `db:studio`.

## 5. Authentication

### 5.1 Better Auth configuration

File `packages/web-app/lib/auth/server.ts`.

- Adapter: `drizzleAdapter(db, { provider: "mysql", usePlural: true, schema })`.
- `advanced.database.generateId: "uuid"`.
- `baseURL` from `BETTER_AUTH_URL`, `secret` from `BETTER_AUTH_SECRET`. `trustedOrigins` is `[BETTER_AUTH_URL]`.
- `advanced.ipAddress.ipAddressHeaders: ["x-forwarded-for"]`. The reverse proxy in front of the app must set this header. Without it, every request shares one rate limit bucket.
- `user.additionalFields`: `timezone` (string, default `UTC`, input false), `status` (string, default `pending`, input false), `emailVerifiedAt` (date, input false), `deletedAt` (date, input false). Only server code changes these. Field to column mapping: `name → full_name`, `image → image_url`, and snake_case for every other field.
- `emailAndPassword`: enabled, `requireEmailVerification: true`, `minPasswordLength: 12`, `maxPasswordLength: 128`, `autoSignIn: false`, `sendResetPassword`, `resetPasswordTokenExpiresIn: 900`, `revokeSessionsOnPasswordReset: true`.
- `emailVerification`: `sendOnSignUp: true`, `autoSignInAfterVerification: true`, `sendVerificationEmail`, `afterEmailVerification` sets `status: active` and `emailVerifiedAt: now`.
- Plugin `magicLink`: `expiresIn: 300`, `disableSignUp: false`, `sendMagicLink`.
- `session`: `expiresIn` 7 days, `updateAge` 1 day, `cookieCache` enabled for 5 minutes.
- `advanced.useSecureCookies` true in production. Cookies are `httpOnly` and `sameSite: lax` by default.
- `rateLimit`: `enabled: true` except in test, `storage: "database"`, `modelName: "rateLimit"`. Custom rules: `/sign-in/magic-link` and `/request-password-reset` 3 per 60 s, `/sign-in/email` 5 per 60 s, `/sign-up/email` 3 per 60 s.
- `databaseHooks.user.create.before`: if `emailVerified` is true, set `status: active` and `emailVerifiedAt: now`. Magic link sign-ups arrive this way.
- `databaseHooks.session.create.before`: load the user; if `status` is `suspended` or `deletedAt` is set, throw `APIError("FORBIDDEN")`. This blocks new logins. The gate blocks existing sessions (section 5.4).

The plan verifies each option name against the installed `better-auth` version before use.

Route handler: `app/api/auth/[...all]/route.ts` exports `GET` and `POST` from `toNextJsHandler(auth)`.

Client: `lib/auth/client.ts` exports `createAuthClient` with `magicLinkClient` and `inferAdditionalFields<typeof auth>()`. The import of `auth` is type-only.

### 5.2 Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:3306/holpro` |
| `BETTER_AUTH_SECRET` | 32 or more random bytes, base64 |
| `BETTER_AUTH_URL` | Public origin, e.g. `https://holpro.app` |
| `RESEND_API_KEY` | Resend key. Empty in development logs links to the console. |
| `EMAIL_FROM` | e.g. `HolPro <hello@holpro.app>` |

Local development: `packages/web-app/.env.local`, from the template `packages/web-app/.env.example`. Next.js loads it. The `@holpro/db` config loads the same file. Deployment: the platform or Docker sets the variables. `deploy/.env.example` lists all of them with empty values next to `PORT`.

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

Every page, action and email receives a `Portal`. URL builders on the portal:

| Purpose | URL |
|---|---|
| Magic link callback, new and existing user | `homePath` |
| Magic link error | `${basePath}?error=link_invalid` |
| Email verification callback | `homePath` |
| Password reset page | `${basePath}/reset` |
| Welcome page | `${basePath}/welcome` |
| Sent page | `${basePath}/sent?kind=magic|verify|reset` |

`portalFromPath(pathname)` returns the portal for `/pro/...` or the coachee portal otherwise. The proxy and the reject handler use it.

### 5.4 Gate

`lib/auth/gate.ts` exports `requirePortalUser(portal)`. The layouts under `/app` and `/pro` call it. The gate only reads and redirects. It never writes, because a Server Component render cannot set cookies and must not mutate on a GET.

Sequence:

1. `auth.api.getSession({ headers })`. No session → `redirect(basePath + preserved error query)`. Better Auth appends `?error=<code>` to the callback URL when a verification or magic link fails. The gate maps `invalid_token`, `token_expired` and `INVALID_TOKEN` to `link_invalid` and drops unknown codes.
2. `loadUserWithRoles(userId)` from `repository.ts`. One relational query that returns the user with `coach` and `coachee`.
3. `decideGate({ status, deletedAt, hasCoach, hasCoachee, portal })`, a pure function:
   - `blocked` when `status` is `suspended` or `deletedAt` is set.
   - `enter` when the portal role exists.
   - `register` when no role exists.
   - `reject` when only the other role exists.
4. `enter`: return the user.
5. `register`: `redirect(\`${basePath}/welcome\`)`.
6. `reject`: `redirect(\`/api/gate/reject?portal=${portal.key}\`)`.
7. `blocked`: `redirect(\`/api/gate/reject?portal=${portal.key}&reason=account_unavailable\`)`.

`app/api/gate/reject/route.ts` is a GET route handler. It calls `auth.api.signOut({ headers })`, which clears the session cookie, then redirects to `${basePath}?error=wrong_portal` or `?error=account_unavailable`. It validates `portal` and `reason` against the known values and ignores anything else, so it cannot become an open redirect.

### 5.5 Welcome page

`{basePath}/welcome` completes a registration. It requires a session; without one it redirects to `basePath`. If the user already has this portal's role, it redirects to `homePath`. If the user has only the other role, it redirects to the reject handler.

The page shows: "You are creating a {coach/coachee} account for {email}." A form asks for the full name, prefilled when known. A hidden field carries `Intl.DateTimeFormat().resolvedOptions().timeZone`. One button: "Continue".

The Server Action `completeRegistration(portal, form)`:

1. Validates the name (2 to 120 characters) and the timezone (`Intl.supportedValuesOf("timeZone")` contains it, else `UTC`).
2. Re-runs `decideGate`. Only `register` continues. This closes the race where two tabs submit at once, together with the primary key on the child table.
3. In one transaction: update `full_name` and `timezone` on `users`, insert the child row for the portal.
4. Redirects to `homePath`.

This page covers both the cross-device case, where a magic link opens on a phone without any cookie, and the missing-name case for magic link sign-ups. The person confirms the role once, in clear words.

### 5.6 Proxy

`packages/web-app/proxy.ts` runs on `/app`, `/app/:path*`, `/pro` and `/pro/:path*`. In code it returns `NextResponse.next()` for any path that starts with `/pro/login`, because `/pro/:path*` also matches the coach login pages and a redirect there would loop. For the rest, it reads the session cookie with `getSessionCookie(request)` from `better-auth/cookies`. No cookie → redirect to the portal `basePath`. This is an optimistic check. The gate is the real check.

### 5.7 Pages

| Route | Content |
|---|---|
| `{basePath}` | Two tabs: "Email me a link" and "Password". The password tab switches between sign-in and sign-up. Sign-up asks for full name, email, password. Link "Forgot password?" opens a small form for the email. Query errors: `wrong_portal` → "This account is not a {coach/coachee} account. Use the other login." `link_invalid` → "This link is invalid or expired. Request a new one." `account_unavailable` → "This account is not available. Contact support." Query `reset=ok` → "Password updated. Sign in." |
| `{basePath}/sent` | "Check your inbox." Reads `kind=magic|reset|verify` from the query and adapts the copy. Neutral text: "If an account exists for this address, we sent a link." |
| `{basePath}/reset` | New password and confirmation. Reads `token` from the query. Missing token → error state. On success, redirect to `{basePath}?reset=ok`. |
| `{basePath}/welcome` | Section 5.5. |
| `{homePath}` | Placeholder. Heading "Welcome, {full_name}", the role label, and a sign-out button. |

### 5.8 Forms and actions

Client components with `useActionState` and Server Actions in `lib/auth/actions.ts`. Server-side validation with `zod` schemas in `lib/auth/schemas.ts`. Actions call `auth.api.*` with `headers()` so cookies propagate.

Actions:

- `sendMagicLink(portal, form)` → neutral success, redirect to `sent?kind=magic`.
- `signInWithPassword(portal, form)` → on success redirect to `homePath`; on `EMAIL_NOT_VERIFIED` show "Verify your email first" with a resend button; on invalid credentials show one generic error.
- `signUpWithPassword(portal, form)` → neutral success, redirect to `sent?kind=verify`. `USER_ALREADY_EXISTS` gets the same message.
- `requestPasswordReset(portal, form)` → neutral success, redirect to `sent?kind=reset`.
- `resetPassword(portal, form)` → on success redirect to `{basePath}?reset=ok`; on bad token show the error state.
- `completeRegistration(portal, form)` → section 5.5.
- `signOut()` → redirect to `/`.

Every input has a visible label. Errors render under the field with `aria-describedby`. Submit buttons show a busy state and are disabled while pending.

### 5.9 UI

Follow `brand-assets/STYLE.md`. Layout: a two-column grid, `repeat(auto-fit, minmax(min(100%, 420px), 1fr))`. Left column is a Pine panel with the Pine stem artboard (`Artboard 20`) faded with `mask-image`, the Parchment wordmark and one serif line. Right column is the form on Parchment.

- Eyebrow in Cumin: the portal label.
- Heading 2 in Instrument Serif. One `<em>` word in Cumin.
- Inputs: pill shape, `1.5px solid` hairline border, Pine text, Cumin border on focus, `16px 20px` padding.
- Primary button: Pine fill, Parchment text, Cumin on hover. Secondary: outlined Pine.
- Tabs: two pill buttons in a hairline-bordered pill track. The active tab has the Pine fill.
- Coach portal: the Pine panel uses a Pistachio leaf accent. Coachee portal: an Orchid leaf accent.
- No shadows, no gradients on surfaces, radius 20px or more on boxes.

### 5.10 Email

`lib/email/resend.ts` exports `sendEmail({ to, subject, html, text })`. It uses the `resend` package. When `RESEND_API_KEY` is empty and `NODE_ENV !== "production"`, it logs `to`, `subject` and every URL from `text` to the console and returns. In production a missing key throws at startup.

Templates in `lib/email/templates/`: `magicLink`, `verifyEmail`, `resetPassword`. Each is a function `(params: { url, portal }) => { subject, html, text }`. HTML uses inline styles: Parchment background, Pine text, Manrope with system fallback, one Pine pill button, the Pine wordmark from `BETTER_AUTH_URL/brand/wordmark.png`, and a footer line "If you did not request this, ignore this email." Every template includes the plain URL as text for clients that block buttons.

## 6. Error handling

- Auth actions catch `APIError` from Better Auth and map known codes to user copy. Unknown errors log server-side and show "Something went wrong. Try again."
- Email send failures log server-side. The user still sees the neutral "Check your inbox" page. A retry lives in the form.
- Database connection failure at gate time throws, and the Next.js error boundary shows a generic page.
- The reject handler accepts only known `portal` and `reason` values.
- The wrong-portal message says only "not a coach account" or "not a coachee account", which the person already knows from the page they used.

## 7. Testing

Vitest in both packages. Root `pnpm test` runs `pnpm -r run test`.

`packages/db`:

- Schema drift test: run `drizzle-kit generate` into a temp folder and assert it produces no new migration.
- SQL assertions on the committed migration: `CHECK` constraints on `users.status` and `engagements.status`, `ON DELETE RESTRICT` on engagement FKs, `ON DELETE CASCADE` on child tables, unique `users.email` and `sessions.token`, the `rate_limits` table.

`packages/web-app`:

- `portals.ts`: URL builders and `portalFromPath` return the expected values for both portals.
- `decideGate`: all combinations of `status`, `deletedAt`, `hasCoach`, `hasCoachee`, `portal`.
- Error code mapping: `invalid_token` → `link_invalid`, unknown → dropped.
- Timezone validation: accepts `America/Lima`, falls back to `UTC` for `Evil/Value` and empty.
- Zod schemas: password length bounds, email format, password confirmation match, name length.
- Reject handler: rejects unknown `portal` and `reason` values.
- Email templates: snapshot per template per portal, and every template's `text` contains the URL.
- The gate and `completeRegistration` use `repository.ts`. Tests pass a fake. No MySQL in tests.

## 8. Dependencies to add

| Package | Where | Version policy |
|---|---|---|
| `drizzle-orm`, `mysql2` | `@holpro/db` | latest stable, exact (workspace `saveExact`) |
| `drizzle-kit`, `dotenv` | `@holpro/db` dev | latest stable |
| `better-auth` | `web-app` | latest stable |
| `resend` | `web-app` | latest stable |
| `zod` | `web-app` | latest stable |
| `vitest` | both, dev | latest stable |
| `@holpro/db` | `web-app` | `workspace:*` |

`web-app/tsconfig.json` keeps `@/*`. `next.config.ts` adds `transpilePackages: ["@holpro/db"]` because the package ships TypeScript source.

## 9. Open items for later

- OAuth providers. The `accounts` table and Better Auth make this a config change plus a button.
- Profile editing: timezone, name, coach bio and specialties.
- Coach onboarding steps after the placeholder `/pro` page.
- Engagement creation and the coachee assistant. Enforce one active engagement per pair in the service layer.
- Admin: suspend a user and revoke their sessions in one step. Soft delete should also replace the email with a tombstone value, or the unique index blocks a new sign-up with that address.
- Second role for an existing user: an explicit "become a coach" flow, not a wrong-portal login.
