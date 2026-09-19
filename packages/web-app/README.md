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
placeholder homes are `/app` and `/pro`. Without `RESEND_API_KEY` in
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
