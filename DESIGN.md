---
version: alpha
name: MVA Coworking
colors:
  primary: '#b84613'
  navy: '#102840'
  copper: '#b84613'
  copper-hover: '#97370d'
  on-navy: '#ffffff'
  inverse-accent: '#ffad78'
  page: '#f6f7f9'
  surface: '#ffffff'
  ink: '#172840'
  muted: '#5d6b7e'
  line: '#dce3eb'
typography:
  display:
    fontFamily: 'Manrope, Inter, system-ui, sans-serif'
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
rounded:
  panel: '20px'
  control: '10px'
spacing:
  section-desktop: '88px'
  section-mobile: '60px'
---

## Overview

MVA serves professionals booking workspaces, companies seeking a fiscal address,
and coworking owners listing rooms. Its headquarters is Rua Dom José Thomaz, 565,
São José, Aracaju/SE. Business evidence: README.md, existing HomeView content,
Footer contact details and the shared public-listing visibility predicate.

The homepage is a brand surface. Booking, fiscal checkout and internal dashboards
remain product surfaces with their existing controls and business rules. This
revision changes public presentation only; no payment, auth or database policy changes.

The visual reference is the physical meeting room: precise architectural lines,
warm wood, dark structure and a calm place to work. The signature is an unobscured
room photograph with a navy location caption and a single copper corner. Avoid
generic stock-office collages, repetitive numbered service cards, fake reviews,
artificial availability and decorative gradients.

## Colors

Runtime ownership is Model B: existing `src/theme.css` owns semantic light/dark
surface tokens. `src/home.css` owns public presentation tokens and consumes the
existing semantic variables. This document mirrors accepted runtime values; it
does not generate CSS. Existing Tailwind colors in admin views are unchanged.

| Role | Runtime owner / consumer |
| --- | --- |
| navy / on-navy / inverse-accent | home.css: --home-navy / --home-on-navy / --home-orange → photo caption, location and contact |
| copper / copper-hover | home.css: --home-copper / --home-copper-hover → primary links |
| page / surface / ink / muted / line | theme.css RGB variables → home.css semantic references |
| panel / control | home.css: --home-radius / .home-button → public cards and links |

Dark mode remaps page, surface, text and border colors through theme.css. Navy
panels keep white text in both themes. White text uses copper #b84613 for primary
links; pale orange is reserved for accents on navy, never body copy on white.

## Typography

Manrope is used on homepage headings and room prices, with Inter for paragraphs,
controls and all existing product areas. Both support Portuguese accents, English
and Spanish. Fonts are requested together from Google Fonts with display=swap;
all images have explicit aspect ratios to reserve their layout.

Headings are medium to semibold, with tightly controlled tracking. Body copy uses
comfortable line height. No typewriter, letter-by-letter or blur entrance effects
are introduced. Primary body text remains readable without web fonts.

## Layout

Use the existing 1280px app container. Desktop hero: copy and a distinct photograph
in two columns. Below 768px: copy first, then photo, then stacked service cards.
Sections have 88px separation, reduced to 60px on mobile. Services are parallel
choices; only the actual three-step process is numbered.

Actual approved/available listings may appear on the homepage, at most three,
with headquarters listed first. Do not synthesize rooms, capacity, price or
customer claims. When none are public, omit this optional section.

The mobile bottom navigation remains accessible above safe-area padding. The
cookie preference panel sits above it and scrolls when expanded on short screens.

## Elevation & Depth

Favor surface and border separation. The photograph supplies depth. Avoid
unnecessary card shadows and hover transforms. Keep scrollbars visible and
consistent in both themes, with standards-based and WebKit fallbacks.

## Shapes

20px panels, 10px controls. Only the hero photograph has an asymmetric lower
corner. The corner signals the brand without repeating across every card.

## Components

Public navigation links use anchors with real destinations. Normal clicks use
the existing SPA routing; modified clicks retain native open-in-new-tab behavior.
Public room links carry a `space` ID to the existing detail view. Use the same
`isSpacePubliclyVisible` predicate as the marketplace.

Native details/summary elements own the FAQ disclosure and keyboard behavior.
Category filters are toggle buttons with aria-pressed, rather than partial tabs.
The native select is deliberately retained for platform-owned filter popups.

Use meaningful photo alt text, decorative icon aria-hidden, visible keyboard
focus, at least 44px primary touch controls and reduced-motion overrides.

## Do's and Don'ts

- Keep the established MVA branding and verified contact details.
- Keep prices and capacity sourced from the real public catalog.
- Translate new homepage copy in Portuguese, English and Spanish.
- Do not add invented promotions, testimonials or guarantees about fiscal approval.
- Preserve fiscal eligibility, payments, authorization and intern-room rules.
- Do not publish secret environment values, private data or test customer records.
