# HolPro UI Style Guide

This guide defines how HolPro user interfaces look and behave. It is derived from the reference landing page in `packages/landing/reference-landing.html` and the brand assets in this folder. Apply it to the landing site, the web app, emails and any other surface that carries the HolPro brand.

Tagline: **Unlock yourself.**

---

## 1. Brand feel

HolPro is a coaching platform with an agent on your side. The UI must feel:

- **Warm and natural.** Parchment paper, deep pine green, earthy cumin. Never pure white, never pure black.
- **Editorial.** Large serif headlines, generous whitespace, a clear reading order.
- **Organic.** Leaf shapes, pills and dots. No sharp corners, no hard shadows, no gradients on UI elements.
- **Calm.** Few colors per screen, flat surfaces, quiet motion.

---

## 2. Color

### 2.1 Palette

| Token | Name | Hex | RGB | Role |
|---|---|---|---|---|
| `--parchment` | Parchment | `#F5F4EF` | 245 244 239 | Default page background. Text on dark surfaces. |
| `--pine` | Pine | `#1D4533` | 29 69 51 | Default text. Primary button. Dark section background. |
| `--cumin` | Cumin | `#CA6728` | 202 103 40 | Accent. Eyebrow labels, hover state, italic emphasis, final CTA background. |
| `--pistachio` | Pistachio | `#C3B737` | 195 183 55 | Secondary accent. Card fill, image frame, primary button on Pine. |
| `--orchid` | Orchid | `#E3B7D6` | 227 183 214 | Secondary accent. Card fill, image frame, decorative panel. |

### 2.2 Tints

Each brand color has one lighter tint. The tint is the base color mixed with 25% Parchment. The logomark and every artboard pattern use these tints for secondary leaves. Tints are decorative only. Never use a tint for text or as a text background.

| Token | Value | Formula |
|---|---|---|
| `--pine-tint` | `#537263` | `color-mix(in srgb, #1D4533, #F5F4EF 25%)` |
| `--cumin-tint` | `#D58A5A` | `color-mix(in srgb, #CA6728, #F5F4EF 25%)` |
| `--pistachio-tint` | `#D0C665` | `color-mix(in srgb, #C3B737, #F5F4EF 25%)` |
| `--orchid-tint` | `#E8C6DC` | `color-mix(in srgb, #E3B7D6, #F5F4EF 25%)` |

The logomark PNG uses `#587A64` for its pine tint. Treat it as the same value.

Translucent values used in the reference:

| Token | Value | Use |
|---|---|---|
| `--pine-18` | `rgba(29,69,51,.18)` | Hairline dividers on Parchment. |
| `--pine-70` | `rgba(29,69,51,.70)` | Muted text on Parchment (footer copyright). |
| `--parchment-12` | `rgba(245,244,239,.12)` | Input background on dark surfaces. |
| `--parchment-22` | `rgba(245,244,239,.22)` | Card borders on Pine. |
| `--parchment-50` | `rgba(245,244,239,.50)` | Secondary button and input border on dark surfaces. |
| `--parchment-55` | `rgba(245,244,239,.55)` | Translucent leaf shapes over photos or Orchid. |
| `--parchment-60` | `rgba(245,244,239,.60)` | Secondary button border on Cumin. |

### 2.3 Surfaces

A surface is a background color that a block of UI sits on. HolPro uses four surfaces. Every component has a defined look on each surface (see section 7).

| Surface | Background | Default text | When to use |
|---|---|---|---|
| Parchment | `#F5F4EF` | Pine | Default. Most of every page. |
| Pine | `#1D4533` | Parchment | One dense block per page: features, hero variant, app sidebar. |
| Cumin | `#CA6728` | Parchment | The final call to action. Headlines and buttons only, keep body copy short. |
| Orchid / Pistachio | `#E3B7D6` / `#C3B737` | Pine | Cards and image frames. Never a full-width text section. |

### 2.4 Text and background pairs

Measured WCAG contrast ratios. Use only the pairs marked AAA or AA for body text.

| Text | Background | Ratio | Grade | Rule |
|---|---|---|---|---|
| Pine | Parchment | 9.77 | AAA | Default body text. |
| Parchment | Pine | 9.77 | AAA | Default text on dark sections. |
| Pine | Orchid | 6.16 | AA | Body text on Orchid cards. |
| Pine | Pistachio | 5.20 | AA | Body text on Pistachio cards. |
| Orchid | Pine | 6.16 | AA | Accent text on Pine. |
| Pistachio | Pine | 5.20 | AA | Accent text on Pine. |
| Cumin | Parchment | 3.48 | Large only | Eyebrow labels (14px, 600, uppercase), italic words inside display headlines, step numbers. Never for paragraph text. |
| Parchment | Cumin | 3.48 | Large only | Headlines and buttons on the Cumin CTA. Keep supporting copy to one short line at 18px or larger. |
| Pine | Cumin | 2.81 | Fail | Do not use for text. |
| Cumin | Orchid | 2.19 | Fail | Do not use for text. |
| Cumin | Pistachio | 1.85 | Fail | Do not use for text. |
| Parchment | Orchid | 1.59 | Fail | Do not use for text. Use Parchment only as a translucent shape. |
| Parchment | Pistachio | 1.88 | Fail | Do not use for text. Use Parchment only as a translucent shape. |

### 2.5 Color rules

1. Parchment is the page background. Do not use `#FFFFFF`.
2. Pine is the text color. Do not use `#000000` or gray for text. For muted text use Pine at 70% opacity.
3. Cumin is the interactive accent on Parchment. Links, button hovers and eyebrows turn Cumin. On Pine the hover color is Pistachio. On Cumin the hover state is Parchment at 75% opacity.
4. Use at most three brand colors as fills in one viewport, plus Parchment.
5. Pistachio, Orchid and Cumin appear together only as a set: the three audience cards, the three checklist dots, the four hero tiles, the feature card swatches.
6. Do not invent new tints. Use the 25% Parchment tint from section 2.2 for decorative leaves and the translucent values for borders, overlays and muted text.
7. No gradients on surfaces, text or buttons. The only permitted gradient is a `mask-image` fade on a decorative photo or pattern (section 9).

---

## 3. Typography

### 3.1 Fonts

| Role | Family | Weights | Source |
|---|---|---|---|
| Headings, display numbers, card titles | **Instrument Serif** | 400 normal, 400 italic | https://fonts.google.com/specimen/Instrument+Serif |
| Body, UI, labels, buttons, small titles | **Manrope** | 400, 500, 600, 700 | https://fonts.google.com/specimen/Manrope |

Fallbacks: `'Instrument Serif', Georgia, serif` and `'Manrope', system-ui, sans-serif`.

Load only these weights. Instrument Serif has no bold. Never apply `font-weight: 700` to a serif element.

In Next.js load the fonts with `next/font/google`. Put both `variable` class names on `<html>`. The tokens in section 11 map them to `--font-serif` and `--font-sans`.

```tsx
import { Instrument_Serif, Manrope } from "next/font/google";

const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const sans = Manrope({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});
```

Set `-webkit-font-smoothing: antialiased` on `body`.

### 3.2 Type scale

All heading sizes are fluid with `clamp()`. Body sizes are fixed.

| Style | Family | Size | Weight | Line height | Tracking | Extra |
|---|---|---|---|---|---|---|
| Display XL (Pine hero) | Instrument Serif | `clamp(56px, 9vw, 136px)` | 400 | 0.92 | -0.02em | `text-wrap: balance` |
| Display L (hero, CTA) | Instrument Serif | `clamp(52px, 7.5vw, 112px)` | 400 | 0.95 | -0.02em | `text-wrap: balance` |
| Display M (CTA) | Instrument Serif | `clamp(48px, 7vw, 104px)` | 400 | 0.95 | -0.02em | `text-wrap: balance` |
| Heading 2 (section title) | Instrument Serif | `clamp(40px, 4.5vw, 64px)` | 400 | 1.0 | -0.01em | `text-wrap: balance` |
| Heading 3 serif (colored cards) | Instrument Serif | `clamp(28px, 2.6vw, 38px)` | 400 | 1.05 | 0 | |
| Display number (step list) | Instrument Serif | `40px` | 400 | 1.0 | 0 | Color Cumin |
| Heading 3 sans (lists, feature cards) | Manrope | `22px` / `20px` | 600 | 1.2 | 0 | |
| Lead (hero paragraph) | Manrope | `clamp(17px, 1.4vw, 21px)` | 400 | 1.55 | 0 | `max-width: 520px`, `text-wrap: pretty` |
| Body | Manrope | `16px` | 400 | 1.55 | 0 | `text-wrap: pretty` |
| Body large (feature intro) | Manrope | `17px` | 400 | 1.6 | 0 | `max-width: 520px` |
| Body small (card copy) | Manrope | `15px` | 400 | 1.55 | 0 | |
| Nav link | Manrope | `15px` | 500 | 1 | 0 | |
| Button | Manrope | `16px` | 600 (700 on dark or colored fills) | 1 | 0 | |
| Eyebrow (section label) | Manrope | `14px` | 600 | 1 | 0.12em | Uppercase, Cumin |
| Eyebrow (inside a card) | Manrope | `13px` | 700 | 1 | 0.10em | Uppercase, inherits text color |
| Caption, footer | Manrope | `14px` | 400 | 1.4 | 0 | |

### 3.3 Typography rules

1. Every headline is Instrument Serif at weight 400. Every other text is Manrope.
2. Display headlines use negative tracking and a line height below 1. Section headings use `-0.01em` and line height 1.
3. Headlines are short. Two lines maximum on desktop. Apply `text-wrap: balance`.
4. Paragraphs have a maximum width between 460px and 560px. Apply `text-wrap: pretty`.
5. Emphasize one word in a headline with `<em>` in Instrument Serif italic, colored Cumin. Example: `Unlock <em>yourself.</em>` Use this at most once per page.
6. Eyebrow labels sit above headings. They are uppercase Manrope with wide tracking. On Parchment they are Cumin. Inside a colored card they inherit the card text color.
7. Remove default margins on `h1` to `h6` and `p`. Control spacing with the parent `gap`.
8. Do not use all caps outside eyebrow labels. Do not use underlines on links.

---

## 4. Layout and spacing

### 4.1 Container

```css
.container {
  max-width: 1360px;
  width: 100%;
  margin: 0 auto;
  padding-inline: clamp(20px, 5vw, 64px);
}
```

Every section, the nav and the footer use this container. Full-bleed color sections wrap the container in a colored `<section>`.

### 4.2 Section vertical padding

| Section type | Padding block |
|---|---|
| Nav | `20px` |
| Standard section | `clamp(40px, 6vw, 88px)` |
| Large section (features, for coaches) | `clamp(48px, 7vw, 104px)` |
| Hero | `clamp(32px, 6vw, 88px)` top, `clamp(48px, 7vw, 104px)` bottom |
| Hero on Pine | `clamp(56px, 9vw, 140px)` |
| Final CTA | `clamp(64px, 10vw, 140px)` |
| Footer | `32px` |

### 4.3 Spacing scale

Use `gap` on flex and grid parents. Do not use margins between siblings.

| Token | Value | Use |
|---|---|---|
| `--space-1` | 6px | Gap between translucent shapes in a cluster |
| `--space-2` | 8px | Dot to label, heading to body inside a list item |
| `--space-3` | 10px | Form field to button |
| `--space-4` | 12px | Button group, card content, checklist items, card grid |
| `--space-5` | 14px | Feature card content, hero tile grid |
| `--space-6` | 16px | Card grid, footer items |
| `--space-7` | 20px | Sticky column content, step list columns |
| `--space-8` | 24px | Nav items, text column in a two-column section |
| `--space-9` | 28px | Hero text column, CTA column, step list padding |
| `--space-10` | 32px | Card padding, Pine hero column |
| `--space-fluid-sm` | `clamp(16px, 3vw, 36px)` | Nav link gap |
| `--space-fluid-md` | `clamp(32px, 4vw, 56px)` | Feature section header to grid |
| `--space-fluid-lg` | `clamp(32px, 5vw, 72px)` | Two-column section gap |

### 4.4 Grids

Every grid is intrinsic. It uses `auto-fit` with a minimum column width, so it collapses on small screens without media queries.

| Pattern | Grid template | Gap |
|---|---|---|
| Two-column hero (text + art) | `repeat(auto-fit, minmax(min(100%, 420px), 1fr))` | `clamp(32px, 5vw, 72px)` |
| Two-column feature (art + text) | `repeat(auto-fit, minmax(min(100%, 380px), 1fr))` | `clamp(32px, 5vw, 72px)` |
| Sticky heading + list | `repeat(auto-fit, minmax(min(100%, 300px), 1fr))`, `align-items: start` | `clamp(32px, 5vw, 64px)` |
| Three audience cards | `repeat(auto-fit, minmax(min(100%, 280px), 1fr))` | 16px |
| Feature cards | `repeat(auto-fit, minmax(min(100%, 260px), 1fr))` | 16px |
| Hero tile cluster | `1fr 1fr`, `aspect-ratio: 1`, `max-width: 560px` | 14px |
| Step list item | `56px 1fr` | 20px |

In a two-column section with a long list, make the heading column `position: sticky; top: 32px`.

Text columns cap at `max-width: 520px` for paragraphs and `max-width: 640px` to `900px` for headlines.

---

## 5. Shape

### 5.1 Radius scale

| Token | Value | Use |
|---|---|---|
| `--radius-pill` | `999px` | Buttons, inputs, tags |
| `--radius-dot` | `50%` | Bullet dots, avatars, status dots |
| `--radius-card` | `24px` | Colored cards, large image frames |
| `--radius-panel` | `20px` | Outlined cards, medium image frames |
| `--radius-leaf` | `100% 0 100% 0` | Leaf shape, pointing top-left to bottom-right |
| `--radius-leaf-alt` | `0 100% 0 100%` | Leaf shape, mirrored |

Do not use radii smaller than 20px on containers. Do not use square corners on any visible box.

### 5.2 The leaf

The leaf is the brand shape. It is a square with two opposite corners at `100%` radius. It comes from the four-leaf logomark.

```css
.leaf { border-radius: 100% 0 100% 0; }
.leaf-alt { border-radius: 0 100% 0 100%; }
```

Rules:

1. Always give a leaf `aspect-ratio: 1` or an equal width and height.
2. Alternate `.leaf` and `.leaf-alt` in a 2 by 2 grid to form the four-leaf cluster.
3. Rotate a cluster `45deg` to make a diamond flower.
4. Fill a leaf with a brand color, a photo (`overflow: hidden` and `object-fit: cover`) or `--parchment-55`.
   On a solid color panel, fill the secondary leaves with the tint of that color (section 2.2). Fill one leaf with Parchment or a photo.
5. Use a 36px leaf as an icon substitute in feature cards. Do not use icon fonts.
6. Use 10px dots (`border-radius: 50%`) as list bullets. Color them Cumin, Pistachio, Orchid or Parchment in sequence.

### 5.3 Borders and elevation

- Hairlines: `1px solid rgba(29,69,51,.18)` on Parchment; `1px solid rgba(245,244,239,.22)` on Pine.
- Outlines: `1.5px solid` in the current text color or its translucent form.
- No `box-shadow`. Depth comes from color blocks, not from shadows.

---

## 6. Iconography and imagery

HolPro does not use an icon set on marketing surfaces. Leaves and dots carry meaning through color. If an app view needs icons, use a single stroke set (Lucide or Phosphor Regular) at 1.5px stroke, colored Pine or Parchment, at 20px or 24px.

### 6.1 Photography

- Subject: coaches and clients at work. Warm light, natural settings, real people, no stock smiles.
- Crop photos into a leaf, a `24px` rounded rectangle at `4/5`, or a `20px` rounded rectangle at `4/5`.
- Place a photo inside a solid color frame (Pistachio or Orchid) and offset the leaf inside the frame.
- Use `object-fit: cover`. Never stretch.

### 6.2 Artboards

The artboards in this folder are 4:5 brand illustrations. There are two families, each in the four solid colors.

| Family | Files | Description |
|---|---|---|
| Leaf cluster | `Artboard 8` (Pine), `Artboard 9` (Orchid), `Artboard 10` (Pistachio), `Artboard 11` (Cumin) | A solid background, a four-leaf cluster in the color tint, and one leaf that holds a portrait photo. |
| Stem pattern | `Artboard 20` (Pine), `Artboard 19` (Orchid), `Artboard 17` (Pistachio), `Artboard 18` (Cumin) | A solid background with a vertical stem and three pairs of leaves in the color tint. |

Use the stem pattern as:

- A decorative background for a full-color section. Position `absolute`, `height` from 125% to 150%, `opacity: .9`, `pointer-events: none`.
- Fade the pattern into the section with `mask-image: linear-gradient(90deg, #000 55%, transparent 98%)`. Flip the angle to `270deg` for a right-aligned pattern.
- A fill for an image frame. Set the artboard as the frame background under a leaf-cropped photo.

Use the leaf cluster as:

- A hero or campaign image on a solid color panel.
- A social or story image. Replace the photo with a portrait of the coach or client.

Always match the artboard to the section color: Pine artboard on a Pine section, Cumin artboard on the Cumin CTA.

### 6.3 Logo

| File | Use |
|---|---|
| `logo-1D4533.png` | Pine wordmark. Default on Parchment. |
| `logo-F5F4EF.png` | Parchment wordmark. On Pine and Cumin. |
| `logo-C3B737.png`, `logo-E3B7D6.png`, `logo-CA6728.png` | Colored wordmarks. Only on Pine or Parchment, only as a brand moment. |
| `holpro_logomark.png` | Pine circle with the four-leaf mark. Favicon, avatar, app icon, loading state. |

Sizes: 34px tall in the nav, 26px tall in the footer, `clamp(40px, 5vw, 64px)` in a Pine hero. Keep clear space equal to the height of the "o" around the wordmark. Do not recolor, rotate or add effects.

---

## 7. Components

Each component is defined per surface. "Hover" also applies to `:focus-visible`.

### 7.1 Links

| Surface | Default | Hover |
|---|---|---|
| Parchment | Pine, no underline | Cumin |
| Pine | Parchment | Pistachio |
| Cumin | Parchment | Parchment at 75% opacity |

Add `:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }` to every link and button.

### 7.2 Buttons

All buttons are pills. Font is Manrope 16px. Inline padding is `16px 28px` for filled buttons and `16px 22px` for outlined buttons (the border takes the missing width). Buttons in the nav use `11px 20px` and 15px text. Use `transition: background-color .15s, color .15s, border-color .15s`.

**Primary**

| Surface | Fill | Text | Weight | Hover |
|---|---|---|---|---|
| Parchment | Pine | Parchment | 600 | Fill Cumin |
| Pine | Pistachio | Pine | 700 | Fill Parchment |
| Cumin | Pine | Parchment | 700 | Fill Parchment, text Pine |
| Cumin (alternative) | Parchment | Cumin | 700 | Fill Pine, text Parchment |

On Cumin, prefer the Pine-filled button. The Parchment-filled alternative appears in the reference hero, but Cumin text at 16px measures 3.48:1 and passes only as large text. If you use it, set the text to 19px or larger.

**Secondary (outlined)**

| Surface | Border | Text | Hover |
|---|---|---|---|
| Parchment | `1.5px solid` Pine | Pine | Border and text Cumin |
| Pine | `1.5px solid rgba(245,244,239,.5)` | Parchment | Border Parchment |
| Cumin | `1.5px solid rgba(245,244,239,.6)` | Parchment | Border Parchment |

On Cumin, Parchment text at 16px measures 3.48:1. Use the outlined button on Cumin only with 19px bold text, or use a single Pine-filled primary button instead.

Rules:

1. One primary button per section. Pair it with at most one secondary button.
2. Button groups use `gap: 12px` and `flex-wrap: wrap`.
3. Button text is a short verb phrase: "Start free", "See how it works", "Set up your practice".
4. Disabled state: opacity `.5`, `cursor: not-allowed`, no hover change.

### 7.3 Navigation bar

- Container padding `20px` block. `justify-content: space-between`.
- Left: Pine wordmark at 34px height.
- Right: links at 15px, weight 500, gap `clamp(16px, 3vw, 36px)`, then one small primary button.
- Transparent background over Parchment. No border, no shadow.

### 7.4 Eyebrow label

```css
.eyebrow {
  font: 600 14px/1 var(--font-sans);
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--cumin);
}
.card .eyebrow {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .1em;
  color: inherit;
}
```

### 7.5 Colored card

Used for audiences, plans, or any set of two to three parallel options.

- Fill: Orchid, Pistachio or Pine. Text is Pine on the light fills, Parchment on Pine.
- Radius `24px`, padding `32px`, `min-height: 220px`.
- Column flex with `gap: 12px`. Order: eyebrow, serif heading 3, body 15px.
- Push the body to the bottom with `margin-top: auto`.
- No border, no shadow, no hover lift.

### 7.6 Outlined card (on Pine)

Used for feature grids on a dark section.

- Border `1px solid rgba(245,244,239,.22)`, radius `20px`, padding `28px`, `min-height: 200px`.
- Column flex with `gap: 14px`. Order: 36px leaf swatch, sans heading 3 (20px, 600), body 15px.
- Push the heading and body to the bottom with `margin-top: auto` on the heading.
- Leaf swatch colors cycle Pistachio, Orchid, Cumin, Parchment.

### 7.7 Step list

An ordered list with serif numbers.

- `<ol>` with `list-style: none`. Each `<li>` is a grid `56px 1fr`, `gap: 20px`, `padding: 28px 0`, `border-top: 1px solid rgba(29,69,51,.18)`.
- Number: Instrument Serif 40px, Cumin, zero-padded ("01", "02").
- Title: Manrope 22px, 600, line height 1.2. Body: 16px, line height 1.55, `gap: 8px` between them.

### 7.8 Checklist

- `<ul>` with `list-style: none`, column flex, `gap: 12px`, 16px text.
- Each item is a flex row, `gap: 12px`, `align-items: baseline`.
- Bullet: a 10px dot, `flex: none`, colored Cumin, Pistachio, Orchid in sequence.

### 7.9 Legend row

Horizontal tags with dots, used to list disciplines.

- Flex row, `gap: 28px`, `flex-wrap: wrap`, 14px text.
- Each tag: 10px dot, `gap: 8px`, label.

### 7.10 Text input and inline form

- Input: pill, padding `16px 20px`, `font: inherit`, 16px, `min-width: 0`, `flex: 1 1 240px`.
- On a dark surface: border `1.5px solid rgba(245,244,239,.5)`, background `rgba(245,244,239,.12)`, text Parchment, placeholder Parchment at 60%.
- On Parchment: border `1.5px solid` Pine, background transparent, text Pine.
- Focus: border becomes solid Parchment or Cumin respectively, plus the shared `focus-visible` outline. Do not remove the focus indicator.
- Form: flex row, `gap: 10px`, `flex-wrap: wrap`, `max-width: 520px`. Input first, primary button second.

### 7.11 Footer

- Container padding `32px` block. Flex row, `space-between`, `flex-wrap: wrap`, `gap: 16px`, 14px text.
- Left: wordmark at 26px. Middle: links with `gap: 24px`. Right: copyright in Pine at 70%.

---

## 8. Page rhythm

A HolPro page alternates surfaces in this order. Do not place two dark or two accent sections next to each other.

| Order | Section | Surface |
|---|---|---|
| 1 | Nav | Parchment |
| 2 | Hero | Parchment (editorial), Pine (bold) or Cumin + Orchid split |
| 3 | Audience cards | Parchment with Orchid, Pistachio and Pine cards |
| 4 | How it works | Parchment |
| 5 | Features | Pine |
| 6 | For coaches | Parchment |
| 7 | Final CTA | Cumin |
| 8 | Footer | Parchment |

Rules:

1. Parchment is the resting surface. Return to it after every colored section.
2. Use Pine for exactly one dense content section per page.
3. Use Cumin for exactly one section per page: the final call to action.
4. Every section has one eyebrow, one heading 2 and at most one lead paragraph before its content.

---

## 9. Motion

- Hover and focus transitions: `150ms` ease on `background-color`, `color`, `border-color`. No transform on hover.
- Decorative leaves may sway:

```css
@keyframes sway {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}
.leaf-decor { animation: sway 6s ease-in-out infinite; transform-origin: bottom center; }
```

- Use `sway` on at most one cluster per viewport.
- Respect reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

- No parallax, no scroll-triggered reveals, no auto-playing video.

---

## 10. Accessibility

1. Body text uses an AA or AAA pair from section 2.4.
2. Cumin text appears only at 14px bold uppercase (eyebrow) or in display sizes.
3. On the Cumin surface, keep text to headlines, one short lead line and buttons. Buttons on Cumin are Pine-filled with Parchment text, or have text at 19px bold or larger.
4. Every interactive element has a visible `:focus-visible` outline. Do not set `outline: none` without a replacement.
5. Decorative images have `alt=""` and `pointer-events: none`. Content photos have a descriptive `alt`.
6. Hit targets are at least 44px tall. Pill buttons at `16px` padding and 16px text meet this. Nav buttons at `11px` padding are 37px tall and need `min-height: 44px` on touch devices.
7. Never convey status with color alone. Pair a colored dot with a text label.

---

## 11. Tokens

### 11.1 CSS custom properties

```css
:root {
  /* brand */
  --parchment: #F5F4EF;
  --cumin: #CA6728;
  --pine: #1D4533;
  --pistachio: #C3B737;
  --orchid: #E3B7D6;

  /* tints: base + 25% Parchment, decorative only */
  --pine-tint: #537263;
  --cumin-tint: #D58A5A;
  --pistachio-tint: #D0C665;
  --orchid-tint: #E8C6DC;

  /* translucent */
  --pine-18: rgba(29, 69, 51, .18);
  --pine-70: rgba(29, 69, 51, .70);
  --parchment-12: rgba(245, 244, 239, .12);
  --parchment-22: rgba(245, 244, 239, .22);
  --parchment-50: rgba(245, 244, 239, .50);
  --parchment-55: rgba(245, 244, 239, .55);
  --parchment-60: rgba(245, 244, 239, .60);

  /* semantic */
  --bg: var(--parchment);
  --fg: var(--pine);
  --accent: var(--cumin);
  --hairline: var(--pine-18);
  --muted: var(--pine-70);

  /* type */
  --font-serif: var(--font-instrument-serif, 'Instrument Serif'), Georgia, serif;
  --font-sans: var(--font-manrope, 'Manrope'), system-ui, sans-serif;

  /* radius */
  --radius-pill: 999px;
  --radius-card: 24px;
  --radius-panel: 20px;
  --radius-leaf: 100% 0 100% 0;
  --radius-leaf-alt: 0 100% 0 100%;

  /* layout */
  --container: 1360px;
  --gutter: clamp(20px, 5vw, 64px);
  --section-y: clamp(40px, 6vw, 88px);
  --section-y-lg: clamp(48px, 7vw, 104px);
  --section-y-xl: clamp(64px, 10vw, 140px);
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }
a:hover { color: var(--accent); }
```

### 11.2 Tailwind CSS v4 theme

The landing package uses Tailwind v4. Put this in `globals.css` after `@import "tailwindcss";`. The block is `@theme inline` so that utilities resolve the `next/font` variables.

```css
@theme inline {
  --color-parchment: #F5F4EF;
  --color-cumin: #CA6728;
  --color-pine: #1D4533;
  --color-pistachio: #C3B737;
  --color-orchid: #E3B7D6;
  --color-pine-tint: #537263;
  --color-cumin-tint: #D58A5A;
  --color-pistachio-tint: #D0C665;
  --color-orchid-tint: #E8C6DC;

  --font-serif: var(--font-instrument-serif), Georgia, serif;
  --font-sans: var(--font-manrope), system-ui, sans-serif;

  --radius-card: 24px;
  --radius-panel: 20px;

  --text-display-xl: clamp(56px, 9vw, 136px);
  --text-display-xl--line-height: 0.92;
  --text-display-xl--letter-spacing: -0.02em;
  --text-display-l: clamp(52px, 7.5vw, 112px);
  --text-display-l--line-height: 0.95;
  --text-display-l--letter-spacing: -0.02em;
  --text-h2: clamp(40px, 4.5vw, 64px);
  --text-h2--line-height: 1;
  --text-h2--letter-spacing: -0.01em;
  --text-h3-serif: clamp(28px, 2.6vw, 38px);
  --text-h3-serif--line-height: 1.05;
  --text-lead: clamp(17px, 1.4vw, 21px);
  --text-lead--line-height: 1.55;

  --spacing-gutter: clamp(20px, 5vw, 64px);
  --spacing-section: clamp(40px, 6vw, 88px);
  --spacing-section-lg: clamp(48px, 7vw, 104px);
  --spacing-section-xl: clamp(64px, 10vw, 140px);
  --container-site: 1360px;
}

@utility leaf { border-radius: 100% 0 100% 0; }
@utility leaf-alt { border-radius: 0 100% 0 100%; }
```

Translucent values map to Tailwind opacity modifiers: `border-parchment/22`, `bg-parchment/12`, `text-pine/70`, `border-pine/18`.

Example primary button on Parchment:

```html
<a class="inline-flex items-center rounded-full bg-pine px-7 py-4 font-sans text-base font-semibold text-parchment transition-colors hover:bg-cumin focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
  Start free
</a>
```

---

## 12. Do and do not

**Do**

- Set Parchment as the page background and Pine as the text color.
- Use Instrument Serif 400 for every headline and Manrope for everything else.
- Make every button and input a pill.
- Use leaves, dots and rounded rectangles as the only shapes.
- Alternate Parchment with one Pine section and one Cumin CTA.
- Let `gap` and `clamp()` handle spacing and responsiveness.

**Do not**

- Do not use white, black or gray.
- Do not use bold serif, underlined links or all-caps body text.
- Do not add shadows, gradients or glass effects.
- Do not put paragraph text on Cumin, or any text on Orchid or Pistachio in a color other than Pine.
- Do not introduce a sixth brand color or a new tint.
- Do not use icon fonts or emoji as icons.
- Do not remove focus outlines.
