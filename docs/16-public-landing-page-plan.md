# Public Landing Page Plan

## Goal

Create a modern, futuristic public landing page for `pailoshoes.com` that introduces Pailo as a high-capability Nepal shoe factory brand while keeping the MVP factory app on `app.pailoshoes.com`.

The landing page should be visually impressive, but it must not turn the internal MVP into a public ecommerce site. The primary action is an `Employee Portal Login` button that sends staff to the MVP factory app.

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

## Creative Direction

- Use a full-bleed generated bitmap hero image as the first viewport signal, with overlay text directly on the image.
- Visual language: futuristic factory control, luminous production lines, precision manufacturing, Pailo green/cyan accents, and warm amber production energy.
- Avoid competitor marks, external shoe brand references, ecommerce language, and generic SaaS hero-card composition.
- Keep the first viewport rich but practical: Pailo brand, sharp headline, concise supporting copy, employee portal CTA, and live-operational proof points.
- Keep at least a hint of the next section visible on common desktop and mobile viewports.

## Page Structure

1. Full-bleed hero with `Pailo Shoes` as the first visual brand signal.
2. Primary `Employee Portal Login` CTA linking to `https://app.pailoshoes.com`.
3. Secondary operational stats: pairs/day target, factory workflows, label/stock/work-order control.
4. Futuristic capability band for production planning, inventory truth, QC gates, labels, and reporting.
5. Short trust section grounded in Nepal factory operations and private internal tooling.

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
- The landing page has an obvious `Employee Portal Login` button for the MVP subdomain.
- The hero uses a real bitmap asset from the app, not a purely CSS/SVG hero.
- The page remains usable around 390px width without horizontal page scroll.
- No competitor trademarks, logos, or ecommerce-first assumptions are introduced.