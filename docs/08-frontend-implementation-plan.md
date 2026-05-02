# Pailo Frontend Implementation Plan

## Goal

Build a futuristic, fast, practical factory command center for Pailo using Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui.

The UI should feel modern and high-confidence, but it must remain dense enough for daily factory use. This is not a marketing landing page. The first screen after login should be the operating dashboard.

## Target Stack

Use these package targets as of 2026-05-02:

- `next@16.2.4`
- `react@19.2.5`
- `react-dom@19.2.5`
- `typescript@6.0.3`
- `tailwindcss@4.2.4`
- `shadcn@4.6.0`
- `lucide-react@1.14.0`
- `@tanstack/react-query@5.100.8`
- `@tanstack/react-table@8.21.3`
- `zod@4.4.2`
- `react-hook-form@7.75.0`
- `next-themes@0.4.6`
- `sonner@2.0.7`
- `recharts@3.8.1`
- `@zxing/browser@0.2.0`
- `konva@10.3.0`
- `react-konva@19.2.3`
- `date-fns@4.1.0`
- `@dnd-kit/core@6.3.1`
- `@dnd-kit/sortable@10.0.0`
- `@tanstack/react-virtual@3.13.24`
- `dexie@4.4.2` or `idb-keyval@6.2.2`
- `nuqs@2.8.9`
- `vaul@1.1.2`
- `browser-image-compression@2.0.2`
- `embla-carousel-react@8.6.0`
- `react-day-picker@9.14.0`
- `class-variance-authority@0.7.1`
- `tailwind-merge@3.5.0`
- `clsx@2.1.1`
- `@hey-api/openapi-ts@0.97.0` or `openapi-typescript@7.13.0`
- `playwright@1.59.1`
- `vitest@4.1.5`
- `msw@2.14.2`
- `eslint@10.3.0`
- `prettier@3.8.3`

## Library Choices

Use mature, typed, composable libraries that work well on mobile and desktop.

- UI primitives: shadcn/ui + Radix UI, because the components are accessible, open code, and easy to customize into Pailo's design system.
- Icons: lucide-react, because it has clear operational symbols for factory actions.
- Server state: TanStack Query, because task boards, inventory, work orders, and dashboards need caching, retries, optimistic updates, and refetch-on-reconnect.
- Tables: TanStack Table, because factory data needs dense sorting, filtering, column visibility, and server-side pagination.
- Virtualization: TanStack Virtual, because inventory movements, task history, and finished-goods matrices can grow quickly.
- Drag and drop: dnd kit, because Kanban/task movement must work with pointer and keyboard interactions and can be adapted for touch.
- Forms: React Hook Form + Zod, because forms must be fast, typed, and validated without heavy rerenders.
- URL state: nuqs, because filters/search/sort state should be shareable and restorable without a custom router layer.
- Offline queue: Dexie for richer IndexedDB workflows, or idb-keyval for a very small MVP queue.
- Mobile drawers: Vaul through shadcn drawer patterns, because mobile task details should open as bottom sheets instead of cramped modals.
- Images: browser-image-compression before upload, because product/QC photos should be fast and cheap to store.
- Carousels: Embla only for product-photo angle review, not for core navigation.
- Charts: Recharts for operational dashboards; keep charts simple and readable on small screens.
- QR/barcode scanning: @zxing/browser for camera-based material, batch, and label scans.

Avoid adding heavy global state libraries at launch. TanStack Query should own server state, React state should own local UI state, and small context providers can handle theme/sidebar/session UI.

## App Responsibilities

The frontend owns:

- User experience and navigation.
- Forms, validation feedback, and optimistic UI.
- Kanban/task boards.
- Dashboards and operational tables.
- Product gallery presentation.
- Label template editing UI.
- QR/barcode scanning from device camera.
- Offline-tolerant UI queue for selected factory-floor actions.

The frontend does not own:

- Authorization decisions.
- Cost calculations as the source of truth.
- Inventory mutation rules.
- Label PDF final rendering rules.
- Audit log writes.

Those belong to the backend.

## Recommended Frontend Structure

```text
apps/frontend/
  src/
    app/
      (auth)/
        login/
      (app)/
        layout.tsx
        dashboard/
        tasks/
        work-orders/
        products/
        inventory/
        suppliers/
        employees/
        labels/
        quality/
        reports/
        settings/
      api-health/
    components/
      ui/                 # shadcn/ui copied components
      shell/
      dashboard/
      tasks/
      labels/
      inventory/
      products/
    features/
      tasks/
      work-orders/
      products/
      inventory/
      labels/
      employees/
      suppliers/
    lib/
      api/
      auth/
      query/
      permissions/
      formatting/
      offline/
    styles/
      globals.css
```

Use Next.js route groups for auth and app layouts. Use server components for static shells and navigation data when possible, and client components for interactive boards, forms, scanners, and editors.

## Mobile-First Architecture

Design every workflow for a phone first, then enhance it for tablets and desktops. The factory floor will likely use phones more often than laptops.

Target viewports:

- Small phone: 360px to 390px wide.
- Large phone: 390px to 430px wide.
- Tablet: 768px to 1024px wide.
- Desktop manager view: 1280px and wider.

Mobile-first rules:

- Default layouts are single-column and thumb-friendly.
- Main navigation uses bottom tabs on phones and a sidebar on tablets/desktops.
- Primary actions are reachable near the bottom of the screen on phones.
- Task details, filters, and quick forms open in bottom sheets on phones and side sheets/dialogs on larger screens.
- Touch targets should be at least 44px tall, with clear spacing between destructive and primary actions.
- Tables become card lists, summary rows, or horizontal matrices on phones; full data tables appear on tablet/desktop.
- Kanban boards become segmented column views on phones instead of forcing a tiny multi-column board.
- Do not depend on hover states. Every hover-only action also needs a visible button or long-press/menu equivalent.
- Use sticky mobile headers for context and sticky bottom action bars for task/work-order updates.
- Respect safe-area insets for modern phones.
- Use correct mobile input modes: numeric keypad for quantities, tel keypad for phone numbers, date pickers for dates.
- Keep mobile route payloads small; load details on demand.
- Let workers complete the common task update flow in under 10 seconds.

Recommended app shell:

- Phone: top status bar + compact title/search + bottom navigation.
- Tablet: left rail + split panes where useful.
- Desktop: full sidebar + dense tables + multi-panel dashboards.

Recommended mobile nav tabs:

- Today.
- Tasks.
- Scan.
- Work Orders.
- More.

## Dominant Browser Support

Chrome, Safari, and Brave are the primary browser targets. Every important factory workflow should be designed, built, and release-tested against these browsers before production.

Primary browser matrix:

- Chrome: primary Chromium baseline on desktop and Android, including Samsung Galaxy devices.
- Safari: primary WebKit baseline on iPhone 15 and newer models, plus macOS Safari where owner/admin users may use Apple laptops.
- Brave: primary privacy-focused browser on desktop and Android, with iOS Brave included in iPhone smoke testing where practical.

Compatibility principles:

- Build with standards-based browser APIs and progressive enhancement.
- Avoid operational dependency on browser extensions, third-party cookies, tracker-like scripts, advertising scripts, hosted social embeds, or vendor-only native services.
- Self-host fonts and critical UI assets.
- Keep same-origin `/api/*` as the launch default to reduce CORS, auth, and privacy-browser issues.
- Verify camera access, file upload, IndexedDB/offline queueing, PDF preview/download, drag/touch interactions, date inputs, and keyboard behavior across Chrome, Safari, and Brave.
- Treat Huawei Browser and Samsung Internet as additional device-specific checks, not replacements for Chrome/Safari/Brave coverage.

## Huawei Phone Compatibility

The app must work well on current Huawei phones, including devices that may not include Google Mobile Services. Treat Huawei support as normal production support, not an afterthought.

Requirements:

- Build as a standards-based responsive web app/PWA that works in modern Chromium-based mobile browsers, including Huawei Browser where possible.
- Do not require Google Play Services, Firebase Cloud Messaging, Google Sign-In, Google Maps, Google Fonts from remote Google domains, or reCAPTCHA for core factory workflows.
- Use Amazon Cognito email/phone login or username/password flows that work in any modern browser.
- Self-host fonts through Next.js/font or local assets instead of depending on Google-hosted font files.
- Use standard browser APIs for camera access, file upload, IndexedDB, and offline queueing.
- For QR/barcode scanning with `@zxing/browser`, always provide manual code entry and photo upload fallback in case a specific Huawei browser blocks or limits camera access.
- Test upload flows with Huawei camera photos, including large images and HEIC/JPEG variations if encountered.
- Avoid push notifications as an MVP dependency. If notifications are needed later, support in-app notifications first and evaluate Web Push/Huawei-specific constraints separately.
- Keep the PWA install prompt optional. The app must remain fully usable from the browser.
- Verify safe-area, viewport height, keyboard, date input, camera permission, and file-picker behavior on Huawei devices.

Minimum Huawei acceptance target:

- Login works.
- Dashboard loads.
- My Tasks works.
- Task update bottom sheet works.
- Camera scan works or manual fallback is obvious.
- Photo upload works.
- Offline queued task update works.
- Label PDF preview/download works.

## Samsung Galaxy S24 Ultra And Newer Compatibility

The app must also feel excellent on Samsung Galaxy S24 Ultra and newer flagship Android phones. Treat these devices as primary production targets because managers and factory owners are likely to use large, high-density Android phones for daily operations.

Requirements:

- Support current Chrome for Android and Samsung Internet using standards-based responsive web behavior.
- Do not hard-code layouts to one Samsung viewport size. Use fluid grids, container queries where useful, safe-area handling, and tested breakpoints for large phones, folded browser UI, landscape mode, and desktop-style high-density screens.
- Keep factory-floor touch targets comfortable even on high-resolution screens where visual elements can appear small.
- Ensure bottom sheets, dialogs, date pickers, tables, and kanban/task boards work with Samsung keyboard behavior, gesture navigation, split-screen mode, and browser toolbar resizing.
- Test QR/barcode scanning with the rear camera at close range, including low-light shop-floor conditions and reflective label material where possible.
- Keep camera scan fallback, manual code entry, and photo upload available on Samsung devices too.
- Avoid depending on Samsung-only services for core workflows. The app should continue working on future Galaxy S/Ultra models through normal browser APIs.
- Verify image upload and compression with large Samsung camera photos before production release.

Minimum Samsung acceptance target:

- Login works in Chrome for Android and Samsung Internet.
- Dashboard and My Tasks stay readable without horizontal page scrolling.
- Task board drag, status update, comments, and file upload work with touch.
- QR/barcode scanning works or manual fallback is obvious.
- Label PDF preview/download works.
- Offline queued task update works after reconnect.

## iPhone 15 And Newer Compatibility

The app must work well on iPhone 15 and newer iPhone models. Treat iOS Safari as a primary production browser, with Chrome on iOS included in smoke testing where practical because it uses the same WebKit browser engine constraints.

Requirements:

- Support current iOS Safari using standards-based responsive web behavior and progressive enhancement.
- Design around notches, Dynamic Island, safe-area insets, browser toolbar resizing, orientation changes, and iOS keyboard viewport behavior.
- Use modern viewport units such as `svh`, `lvh`, and `dvh` where useful, with fallbacks for stable full-height screens.
- Ensure bottom sheets, dialogs, date pickers, tables, kanban/task boards, and scan screens remain usable with iOS gesture navigation and one-handed use.
- Test camera permission prompts, QR/barcode scanning, photo upload, and file picker behavior in iOS Safari.
- Keep manual code entry and photo upload fallback available if camera scanning is blocked, slow, or denied.
- Test upload and compression with iPhone camera photos, especially large HEIC/JPEG images.
- Avoid depending on Apple-only native services for core workflows. The app should remain a normal browser app and not require an App Store install.
- Keep offline queued task updates resilient to iOS storage limits and browser tab refresh behavior.

Minimum iPhone acceptance target:

- Login works in iOS Safari.
- Dashboard and My Tasks stay readable on iPhone 15-size and larger screens.
- Task update bottom sheet works with the iOS keyboard open.
- Task board touch interactions work without accidental page scrolling.
- QR/barcode scanning works or manual fallback is obvious.
- Photo upload works with iPhone camera photos.
- Offline queued task update works after reconnect.
- Label PDF preview/download works in iOS Safari.

## Brave Browser Compatibility

Many users may choose Brave Browser for privacy. Treat Brave as a supported production browser on desktop and Android, and include iOS Brave in the iPhone smoke test where practical because it uses WebKit constraints like other iOS browsers.

Requirements:

- Core workflows must work with default Brave Shields enabled.
- Keep authentication first-party and same-origin where possible. Avoid flows that require third-party cookies, hidden cross-site iframes, or tracker-like redirect chains.
- Do not rely on analytics, advertising, tracking pixels, social embeds, or blocked third-party scripts for any operational workflow.
- Self-host fonts and critical assets so Brave privacy blocking cannot break the UI.
- Use same-origin `/api/*` calls at launch to reduce CORS, cookie, and shield-related issues.
- Ensure PDF preview/download, S3 signed downloads, image upload, camera scan, offline queueing, and optimistic task updates work in Brave.
- If optional analytics are added later, they must fail silently and never block login, tasks, inventory, labels, or reports.

Minimum Brave acceptance target:

- Login works with default Brave Shields enabled.
- Dashboard, My Tasks, task board, inventory, and label workflows load without blocked-script errors.
- QR/barcode scanning works or manual fallback is obvious.
- Photo upload and signed PDF download work.
- Offline queued task update works after reconnect.

## Futuristic Pailo Theme

Design direction: `factory cockpit`, not sci-fi decoration.

Visual qualities:

- Dark-first operational theme with excellent light mode support.
- Graphite, zinc, deep navy, electric cyan, signal green, amber, and red status accents.
- Subtle grid lines, precision borders, and compact density.
- Clear status colors for production, blocked work, low stock, QC failure, and completed tasks.
- Smooth but restrained transitions.
- Big touch targets on factory-floor screens.
- Dense desktop tables for managers.

Do not make the app one-color purple/blue. Keep the palette operational and status-rich.

Suggested design tokens:

```css
:root {
  --pailo-bg: 220 18% 98%;
  --pailo-panel: 0 0% 100%;
  --pailo-ink: 222 34% 10%;
  --pailo-cyan: 190 95% 43%;
  --pailo-green: 144 70% 38%;
  --pailo-amber: 38 92% 50%;
  --pailo-red: 0 78% 56%;
}

.dark {
  --pailo-bg: 222 32% 7%;
  --pailo-panel: 222 24% 10%;
  --pailo-ink: 210 40% 96%;
}
```

Use Tailwind CSS v4 CSS variables and shadcn/ui theming. Tailwind current docs emphasize CSS-variable driven theming and custom dark variants, which fits this app well.

## shadcn/ui Component Strategy

shadcn/ui is open code, not a black-box component library. Use it as Pailo's internal design system.

Start with these components:

- `button`
- `input`
- `textarea`
- `select`
- `checkbox`
- `switch`
- `badge`
- `tabs`
- `table`
- `dialog`
- `sheet`
- `dropdown-menu`
- `command`
- `popover`
- `calendar`
- `toast/sonner`
- `tooltip`
- `separator`
- `scroll-area`
- `avatar`
- `progress`
- `skeleton`

Build Pailo-specific components on top:

- `StatusBadge`
- `PriorityPill`
- `TaskCard`
- `WorkOrderHeader`
- `SizeRunMatrix`
- `InventoryHealthMeter`
- `LowStockBadge`
- `QCDefectMarker`
- `LabelPreview`
- `PhotoAngleGrid`
- `MoneyNpr`
- `NepalDateDisplay` later if needed.

Use lucide-react icons for actions: add, edit, complete, block, scan, print, upload, download, filter, settings, search, calendar, package, factory, user, truck, alert.

## Primary Screens

### Dashboard

First screen after login.

Sections:

- Today planned pairs vs completed pairs.
- Active work orders.
- Task board summary: in progress, blocked, review, done today.
- Low stock materials.
- QC issues today.
- Upcoming supplier deliveries.
- Quick actions: create task, create work order, receive material, print labels.

Mobile layout:

- Show one top KPI strip: planned, completed, blocked, low stock.
- Use stacked panels, not a dense grid.
- Put `Scan`, `My Tasks`, and `Create Task` in a sticky quick-action row.
- Defer heavier charts until the user opens Reports.

### My Tasks

For workers and employees.

UX:

- Large mobile-friendly task rows.
- Start, block, update, complete/request review actions.
- Quantity completed input.
- Photo upload.
- Blocker reason select.
- Offline queue for status updates if network is weak.

Mobile layout:

- This is the most important phone screen.
- Use large cards with status color, due time, work order, size/color, and next action.
- Use swipe or overflow menu only as secondary shortcuts; primary actions must remain visible.
- Open task update as a bottom sheet with quantity, note, photo, and status buttons.
- Keep the complete/request-review action fixed at the bottom of the sheet.

### Manufacturing Board

Kanban-style board tuned for factory language.

Columns:

- Ready.
- In Progress.
- Blocked.
- Waiting For Review.
- Done.

Views:

- By task status.
- By production stage.
- By employee.
- By work order.

Use optimistic updates, then reconcile from backend. If the backend rejects a move because of permissions or required fields, show a clear correction state.

Mobile layout:

- Replace multi-column Kanban with segmented tabs for Ready, In Progress, Blocked, Review, and Done.
- Let managers drag cards on tablet/desktop using dnd kit.
- On phones, prefer explicit `Move to...` actions because drag/drop can be awkward in a busy factory.
- Show blocked count badges on the segment control.

### Product Gallery

For the initial 15 shoe styles.

Features:

- Grid/list toggle.
- Photo angles: side, top, sole, heel, packaging.
- Style code, category, status, target cost, target price.
- Colorways and size range.
- BOM/cost summary.
- Sample approval status.

Mobile layout:

- Use image-led cards for 15 starting styles.
- Product detail opens as a full-screen mobile route with tabs for Overview, Photos, BOM, Tasks, Labels.
- Use Embla only inside the photo angle viewer.

### Inventory

Features:

- Raw materials table.
- Finished goods matrix by style/color/size.
- Low-stock filters.
- Movement history.
- Receive, issue, adjust flows.
- Barcode/QR scanner for material and batch lookup.

Mobile layout:

- Default to scan/search first.
- Show inventory items as compact stock cards with low-stock status.
- Keep manual stock adjustment behind manager permission and a confirmation step.
- Use full tables only on tablet/desktop.

### Work Orders

Features:

- Work order list.
- Size-run matrix.
- Materials requirement view.
- Stage progress timeline.
- Linked tasks.
- QC summary.
- Label print action.

Mobile layout:

- Show a work-order summary card first: style, color, total pairs, stage, blockers.
- Size-run matrix can scroll horizontally but must keep the size column sticky.
- Stage updates should be large buttons, not tiny table cells.

### Label Studio

MVP:

- Template list.
- Fixed-size template editor with fields and dimensions.
- Live preview from sample data.
- PDF preview generated by backend.
- Batch print by work order size lines.

Later:

- Drag-and-drop visual editor using `react-konva`.
- Snap-to-grid.
- Template version comparison.
- QR/barcode placement.

Mobile layout:

- Mobile users can select templates, preview labels, and trigger print jobs.
- Advanced drag-and-drop template editing should be tablet/desktop-first.
- Phone editing should be limited to safe fields like text values, dimensions, and print quantity.

## Data Fetching

Use generated API types and clients from backend OpenAPI.

Recommended flow:

1. Backend exposes `/openapi.json`.
2. CI generates `packages/api-client`.
3. Frontend imports typed request/response models.
4. TanStack Query wraps API calls.

Do not hand-maintain duplicate TypeScript interfaces for backend models.

Query practices:

- Use short stale times for task boards and dashboards.
- Use longer stale times for style categories and settings.
- Invalidate precise query keys after mutations.
- Use optimistic updates for task status moves.
- Use cursor pagination for large history tables.
- Refetch on reconnect for factory-floor devices.
- Use `nuqs` for URL-backed filters on manager screens so views are shareable and reload-safe.
- Use mobile-specific query limits for history-heavy screens and load more on demand.

## Forms

Use React Hook Form + Zod.

Form rules:

- Keep product/BOM/admin forms detailed.
- Keep worker/task forms short.
- Use defaults from work order context.
- Use explicit units for quantities.
- Validate on client for speed, then backend validates again.

Important forms:

- Product style form.
- BOM editor.
- Task create/update.
- Work order create.
- Material receive.
- Inventory adjustment.
- Supplier create/edit.
- Employee create/edit.
- Label template settings.

Mobile form rules:

- One primary field group per screen.
- Sticky bottom submit button on long mobile forms.
- Use steppers or quick chips for common quantities.
- Use camera upload directly for QC/product photos.
- Avoid side-by-side fields on phones.

## Snappy UI Plan

- Keep the app shell persistent across routes.
- Use skeleton loading for dashboard panels.
- Use optimistic updates for task status and quantity updates.
- Split heavy components with dynamic import, especially label editor and charts.
- Compress uploaded images before S3 upload.
- Use Next image optimization where deployment supports it.
- Keep dashboard API payloads pre-aggregated by backend.
- Use table pagination and server-side filtering.
- Use TanStack Virtual for large task, stock, movement, and audit lists.
- Use route-level loading states for mobile screens so navigation feels immediate.
- Preload the next likely worker action: task detail after opening My Tasks, scan result after opening Scan.
- Use CloudFront for static assets and cacheable frontend responses.
- Avoid giant client state stores; server state belongs in TanStack Query.

## Offline-Tolerant Factory Floor

Full offline mode can wait, but the first version should prepare for weak internet.

MVP offline queue:

- Store task status updates temporarily in IndexedDB.
- Use Dexie if the queue needs indexes, retries, and conflict metadata; use idb-keyval only for the simplest MVP.
- Show pending sync state.
- Retry when online.
- Resolve conflicts by backend timestamp and task version.

Do not allow offline inventory adjustments in MVP unless conflict rules are fully designed.

## Accessibility And Usability

- Use semantic shadcn/Radix primitives.
- Support keyboard navigation for office users.
- Use high contrast status colors and text labels.
- Do not rely on color alone.
- Make touch targets large in worker screens.
- Support Nepali phone numbers and local date/time display.
- Plan Nepali/English language toggle later.

## Frontend Testing

- Unit tests with Vitest for utilities and pure components.
- Component tests for forms and task cards.
- MSW for API mocks.
- Playwright E2E for login, create task, move task, create product, create work order, print label preview.
- Visual checks for the futuristic theme at 390px, 768px, 1280px, and 1440px widths.
- Accessibility checks in Playwright for critical flows.
- Mobile E2E for My Tasks, task update bottom sheet, scanner fallback, offline queued update, and work-order stage update.
- Manual device smoke test on at least one modern Huawei phone or Huawei Browser before production release.

## Mobile Acceptance Criteria

- The app is fully usable at 390px width without horizontal page scroll.
- The worker can open My Tasks, start a task, add quantity, add a blocker, upload a photo, and request review on a phone.
- The manager can review blocked tasks and today's work orders on a phone.
- Tables never shrink into unreadable text on phones; they become cards, segmented views, or horizontal matrices with stable dimensions.
- Buttons and interactive rows meet 44px touch target guidance.
- The app does not rely on hover for core actions.
- Task status updates feel instant through optimistic UI and reconcile with the backend.
- Slow network states show pending/syncing feedback instead of appearing broken.
- Product photos and QC uploads are compressed before upload.
- Lighthouse/mobile performance and Playwright mobile smoke tests are part of release checks.
- Core workflows do not depend on Google Mobile Services and pass the Huawei phone smoke test.

## Frontend Deliverables

- Pailo app shell.
- shadcn/ui design system.
- Futuristic dark/light theme.
- Dashboard.
- Task board and My Tasks.
- Product gallery for 15 styles.
- Inventory screens.
- Work order screens.
- Label studio MVP.
- Generated API client.
- Mobile-first responsive app shell.
- Offline task-update queue.
- Playwright test suite.
