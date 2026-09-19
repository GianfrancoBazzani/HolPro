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
