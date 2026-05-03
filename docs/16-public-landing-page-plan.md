# Public Landing Page Plan

## Goal

Create a modern, futuristic public landing page for `pailoshoes.com` that advertises Pailo's factory, brand, and quality standards to retail shoe shops, supermarkets, and direct buyers while keeping the MVP factory app on `app.pailoshoes.com`.

The landing page should be visually impressive and customer-facing. It must not turn the internal MVP into the main story or present staff tools as the public conversion action. Employee portal access should exist only as a quiet footer utility link.

## Research Notes

- Context7 Next.js 16 docs: use App Router `metadata`, `Link`, public-folder images through `next/image`, and the Next 16 `proxy.ts` convention for host/path rewrites.
- Context7 Tailwind docs: use responsive, dark-mode, hover, focus-visible, and reduced-motion patterns as design guidance even though the current scaffold stores most styles in `globals.css`.
- Web.dev responsive design guidance: design across macro layout, micro layout, typography, images, accessibility, interaction, and screen configurations.
- Web.dev LCP guidance: keep the largest hero asset discoverable early, avoid lazy-loading the LCP image, keep render-blocking work small, and target a good LCP experience.
- Nielsen Norman Group usability heuristics: keep system status visible, use real-world terms, follow consistency standards, support recognition over recall, and keep visual design focused on the primary goal.

## Domain And Routing Decision

- `pailoshoes.com`: public landing page.
- `www.pailoshoes.com`: future redirect to the public landing page.
- `app.pailoshoes.com`: internal MVP factory cockpit.
- Local development: expose the current MVP dashboard at `/portal` so the landing page can be previewed at `/` without losing existing work.
- Next.js proxy: when a request comes to `app.pailoshoes.com/`, rewrite it to `/portal` so the app subdomain opens the MVP directly.
- Local staff access links should use `/portal` so `localhost` opens the local employee portal. On public hosts, `/portal` redirects to `https://app.pailoshoes.com`.

## Creative Direction

- Use a full-bleed generated bitmap hero image as the first viewport signal, with overlay text directly on the image.
- Visual language: futuristic factory control, luminous production lines, precision manufacturing, Pailo green/cyan accents, and warm amber production energy.
- Avoid competitor marks, external shoe brand references, ecommerce language, and generic SaaS hero-card composition.
- Keep the first viewport rich but practical: Pailo brand, sharp headline, concise supporting copy, customer-facing CTAs, and production-quality proof points.
- Keep at least a hint of the next section visible on common desktop and mobile viewports.

## Page Structure

1. Full-bleed hero with `Pailo Shoes` as the first visual brand signal.
2. Primary customer CTA for the factory standard and a secondary CTA for product lines.
3. Audience cards for retail shoe shops, supermarkets, and direct buyers.
4. Secondary proof points for retail readiness, shelf handling, and daily-wear value.
5. Futuristic craft band for material selection, cutting, stitching, sole bonding, QC, and packing.
6. Product and partner sections grounded in daily footwear, school-ready runs, retail packing, and factory quality.

## Implementation Steps

1. Preserve the existing root MVP dashboard by moving it behind `/portal`.
2. Add a Next.js `proxy.ts` host rewrite for `app.pailoshoes.com/` to `/portal`.
3. Generate and commit a same-origin bitmap hero asset under `apps/frontend/public/landing/`.
4. Replace the public root route with the landing page, using existing `Button`, `ThemeToggle`, and lucide icons.
5. Add responsive landing styles to `globals.css`, including keyboard focus and reduced-motion handling.
6. Update metadata so the public page reads as Pailo Shoes while the portal route still presents the factory cockpit.
7. Verify with frontend typecheck, lint, build, and a browser preview across desktop and mobile widths.

## Acceptance Criteria

- `/` shows the public futuristic landing page.
- `/portal` shows the MVP factory cockpit work already built.
- `app.pailoshoes.com/` rewrites to `/portal`.
- Employee portal access is available but visually secondary to the customer-facing content.
- On localhost, staff access opens `/portal`; on public hosts, `/portal` redirects to `https://app.pailoshoes.com`.
- The hero uses a real bitmap asset from the app, not a purely CSS/SVG hero.
- The page remains usable around 390px width without horizontal page scroll.
- No competitor trademarks, logos, or ecommerce-first assumptions are introduced.