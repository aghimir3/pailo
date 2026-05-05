# Full App Implementation Plan

> **Purpose**: A single-shot implementation guide for an AI agent to build all remaining Pailo features. Every section contains exact file paths, API contracts, component structures, database changes, and acceptance criteria. No ambiguity.

## Current State Summary

### What Works (Do Not Rebuild)
- Auth: Cognito login/callback/logout, session, user resolution, role guards
- Tasks: Full CRUD, status updates, blocked reasons, review gates, comments, optimistic concurrency, WhatsApp notifications
- Labels: Saved labels, templates, preview geometry, print jobs, 24-up A4 layout
- Users: Invite, edit, role/status management, Cognito integration
- Employees: Full CRUD with all fields
- Dashboard: Real KPI data, throughput chart, owner insights
- Operations hub: Aggregated view with navigation
- Landing page: Dynamic public page with settings editor
- Catalog: Public product catalog with image upload
- Partner inquiries: Public form + admin list
- Settings: Landing page + catalog editor

### What Needs Building
1. **Product Styles & BOM** — Full CRUD + costing
2. **Suppliers** — Full CRUD
3. **Work Orders** — Create/edit + task generation + stage transitions
4. **Inventory Movements** — Receive/issue/adjust/wastage forms
5. **QC Inspections** — Create/defect entry/rework/photo upload
6. **Reports** — Real reports with filtering and on-page tables
7. **Admin Settings** — Factory configuration screens
8. **Audit Logging** — Write audit records on mutations
9. **PDF Label Generation** — Server-side PDF output
10. **S3 File Upload** — Photos and documents via signed URLs

---

## Architecture Decisions

### Frontend Stack (already installed, use as-is)
- Next.js 16.2 App Router (React 19.2, Turbopack)
- TypeScript 6.0 strict
- TanStack Query 5.x (installed but NOT currently used — **activate it**)
- TanStack Table 8.x (installed but NOT currently used — **activate it**)
- Recharts 3.x
- Zod 4.x (installed but NOT currently used for client validation — **activate it**)
- shadcn-style CVA components + Tailwind CSS
- Sonner for toasts
- Lucide React for icons
- Generated API client from `@pailo/api-client`

### Frontend Patterns To Adopt
1. **TanStack Query for ALL data fetching** — Replace raw `useEffect` + `fetch` in client components with `useQuery`/`useMutation`. Keep server components for initial page loads where appropriate.
2. **Zod schemas for form validation** — Define client-side schemas that mirror backend Pydantic models.
3. **React Hook Form is NOT installed** — Use controlled forms with Zod `.safeParse()` directly. Keep current pattern of `useState` per form but add Zod validation before submit.
4. **Reusable form components** — Create `FormField`, `FormSelect`, `FormTextarea` components.
5. **Optimistic updates** — Use TanStack Query mutation `onMutate` for instant UI feedback.
6. **Mobile-first slide-up sheets** — Use bottom sheets for mobile create/edit instead of centered modals.

### Backend Stack (already installed, use as-is)
- Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2 async ORM
- Alembic migrations, asyncpg
- structlog for logging
- httpx for external API calls

### Backend Patterns To Follow
1. Every new module gets: `schemas.py`, `service.py`, route registration in `api/routes.py`
2. All mutations write to `audit_logs` table
3. All list endpoints support `?page=1&page_size=25` pagination
4. All mutations use optimistic concurrency (`version` field)
5. Permission checks happen in the service layer using role from resolved user
6. Inventory changes ONLY through `InventoryMovement` records

---

## Phase 1: Foundation Improvements

### 1.1 TanStack Query Provider Setup

**File**: `apps/frontend/src/components/query-provider.tsx`

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Integration**: Wrap in `apps/frontend/src/app/layout.tsx` inside `AuthProvider` and `ThemeProvider`.

### 1.2 API Hook Factory

**File**: `apps/frontend/src/lib/api.ts`

```tsx
import { getAccessToken } from "./auth";

const API_BASE = "/api/v1";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const token = getAccessToken();
  const url = new URL(path, window.location.origin);
  url.pathname = `${API_BASE}${path}`;
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }
  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
```

### 1.3 Reusable Form Components

**File**: `apps/frontend/src/components/ui/form-field.tsx`

```tsx
"use client";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export function FormField({ label, error, required, children, hint }: FormFieldProps) {
  return (
    <div className="form-field">
      <label className="form-label">
        {label}
        {required && <span className="form-required">*</span>}
      </label>
      {children}
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
```

Create matching components: `FormInput`, `FormSelect`, `FormTextarea`, `FormNumberInput`.

### 1.4 Bottom Sheet Component (Mobile-First)

**File**: `apps/frontend/src/components/ui/bottom-sheet.tsx`

A slide-up sheet for mobile that becomes a dialog on desktop (>768px). Uses CSS `@starting-style` for entry animation and `dialog` element for accessibility.

### 1.5 Confirmation Dialog

**File**: `apps/frontend/src/components/ui/confirm-dialog.tsx`

Reusable "Are you sure?" dialog for destructive actions.

---

## Phase 2: Product Styles & BOM

### 2.1 Backend — Product Styles API

**File**: `apps/backend/app/modules/factory/service.py` (extend existing)

Add to the factory service:

```python
# --- Product Styles ---
async def list_product_styles(db: AsyncSession, page: int = 1, page_size: int = 25):
    """List all product styles with pagination."""

async def get_product_style(db: AsyncSession, style_id: UUID):
    """Get style with variants, active BOM, and gallery images."""

async def create_product_style(db: AsyncSession, data: ProductStyleCreate, actor: User):
    """Create style with auto-generated style_code (PAI-YYYY-CAT-NNN)."""

async def update_product_style(db: AsyncSession, style_id: UUID, data: ProductStyleUpdate, actor: User):
    """Update style fields. Optimistic concurrency via version."""

async def archive_product_style(db: AsyncSession, style_id: UUID, actor: User):
    """Soft-archive a style (set status=archived)."""
```

**Schemas** (`apps/backend/app/modules/factory/schemas.py` — extend):

```python
class ProductStyleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=50)  # sneaker, sandal, boot, formal, casual
    description: str | None = None
    size_range: str | None = None  # e.g. "38-44"
    target_cost_npr: Decimal | None = None
    target_mrp_npr: Decimal | None = None
    notes: str | None = None

class ProductStyleUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    size_range: str | None = None
    sample_status: str | None = None  # concept, sampling, approved, discontinued
    target_cost_npr: Decimal | None = None
    target_mrp_npr: Decimal | None = None
    notes: str | None = None
    version: int  # optimistic concurrency

class ProductStyleResponse(BaseModel):
    id: UUID
    style_code: str
    name: str
    category: str
    description: str | None
    size_range: str | None
    sample_status: str
    target_cost_npr: Decimal | None
    target_mrp_npr: Decimal | None
    notes: str | None
    created_at: datetime
    version: int
```

**Routes** — Add to `apps/backend/app/api/routes.py`:

```
GET    /api/v1/styles              → list_product_styles
GET    /api/v1/styles/{style_id}   → get_product_style
POST   /api/v1/styles              → create_product_style (manager+)
PATCH  /api/v1/styles/{style_id}   → update_product_style (manager+)
DELETE /api/v1/styles/{style_id}   → archive_product_style (manager+)
```

### 2.2 Backend — BOM API

```
GET    /api/v1/styles/{style_id}/bom                    → get_active_bom
GET    /api/v1/styles/{style_id}/bom/versions           → list_bom_versions
POST   /api/v1/styles/{style_id}/bom                    → create_bom_version (manager+)
POST   /api/v1/styles/{style_id}/bom/{bom_id}/approve   → approve_bom (admin only)
PUT    /api/v1/styles/{style_id}/bom/{bom_id}/items     → replace_bom_items (manager+, draft only)
```

**BOM Logic**:
- New BOM is always `status=draft`
- Only one `status=approved` BOM per style at a time
- Approving a new BOM sets the previous approved one to `superseded`
- BOM items reference `material_id` and include `quantity_per_pair`, `wastage_percent`, `cost_snapshot_npr`
- `cost_snapshot_npr` is captured from `material.average_cost_npr` at time of BOM creation, NOT live-updated
- Work orders snapshot the approved BOM's total cost at creation time

**Schemas**:

```python
class BomItemInput(BaseModel):
    material_id: UUID
    quantity_per_pair: Decimal = Field(gt=0)
    wastage_percent: Decimal = Field(ge=0, le=100, default=Decimal("5"))

class BomVersionCreate(BaseModel):
    notes: str | None = None
    items: list[BomItemInput] = Field(min_length=1)

class BomVersionResponse(BaseModel):
    id: UUID
    version: int
    status: str  # draft, approved, superseded
    total_cost_per_pair_npr: Decimal
    items: list[BomItemResponse]
    approved_at: datetime | None
    created_at: datetime
```

### 2.3 Frontend — Styles Page

**Route**: `apps/frontend/src/app/styles/page.tsx`

**Layout**: 
- Grid of style cards (mobile: 1 col, tablet: 2 col, desktop: 3 col)
- Each card shows: style_code, name, category badge, sample_status badge, target_cost, thumbnail
- FAB button "New Style" on mobile, button in header on desktop
- Click card → style detail page

**Route**: `apps/frontend/src/app/styles/[id]/page.tsx`

**Layout** (tabbed on mobile):
- **Overview tab**: Name, code, category, status, costs, notes, photo gallery
- **BOM tab**: Materials table with qty/wastage/cost columns, total cost per pair, "New BOM Version" action
- **Variants tab**: Size/color grid with SKU codes
- **History tab**: Audit log entries for this style

**Components**:
- `apps/frontend/src/components/styles/style-card.tsx`
- `apps/frontend/src/components/styles/style-form.tsx` (bottom sheet for create/edit)
- `apps/frontend/src/components/styles/bom-editor.tsx` (inline table editor)
- `apps/frontend/src/components/styles/variant-grid.tsx`

**Mobile UX**:
- Style form is a full-screen bottom sheet on phones
- BOM editor uses swipeable rows with material search dropdown
- Category selector is a segmented control, not a dropdown
- Photo upload with camera capture option (`accept="image/*" capture="environment"`)

---

## Phase 3: Suppliers

### 3.1 Backend — Suppliers API

**Routes**:
```
GET    /api/v1/suppliers              → list (pagination, search by name/category)
GET    /api/v1/suppliers/{id}         → detail with materials list and price history
POST   /api/v1/suppliers              → create (manager+)
PATCH  /api/v1/suppliers/{id}         → update (manager+)
DELETE /api/v1/suppliers/{id}         → soft-archive (admin)
```

**Schemas**:
```python
class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    material_categories: list[str] = []
    payment_terms: str | None = None
    usual_lead_time_days: int | None = None
    notes: str | None = None

class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    material_categories: list[str] | None = None
    payment_terms: str | None = None
    usual_lead_time_days: int | None = None
    rating: int | None = Field(None, ge=1, le=5)
    notes: str | None = None
    version: int

class SupplierResponse(BaseModel):
    id: UUID
    supplier_code: str  # SUP-0001
    name: str
    contact_person: str | None
    phone: str | None
    email: str | None
    address: str | None
    material_categories: list[str]
    payment_terms: str | None
    usual_lead_time_days: int | None
    rating: int | None
    notes: str | None
    created_at: datetime
    version: int
```

### 3.2 Frontend — Suppliers Page

**Route**: `apps/frontend/src/app/suppliers/page.tsx`

**Layout**:
- Table view with columns: Code, Name, Contact, Phone, Categories, Lead Time, Rating
- On mobile: card list with name, phone (tap to call), categories as tags
- Search/filter bar
- Create form in bottom sheet
- Tap row → edit in bottom sheet (not separate page, suppliers are simple)

**Phone-friendly touches**:
- Phone numbers as `tel:` links
- "Call Supplier" quick action
- Star rating as tap-to-rate component

---

## Phase 4: Work Orders (Create/Edit + Task Generation)

### 4.1 Backend — Work Order Mutations

**Routes** (extend existing read-only):
```
POST   /api/v1/work-orders                         → create_work_order (manager+)
PATCH  /api/v1/work-orders/{id}                    → update_work_order (manager+)
POST   /api/v1/work-orders/{id}/generate-tasks     → auto-generate tasks (manager+)
POST   /api/v1/work-orders/{id}/advance-stage      → move to next production stage (manager+)
POST   /api/v1/work-orders/{id}/complete           → mark complete (manager+, requires QC pass)
DELETE /api/v1/work-orders/{id}                    → cancel (admin, only if status=planning)
GET    /api/v1/work-orders/{id}/material-requirements → BOM × qty material needs
```

**Schemas**:
```python
class WorkOrderCreate(BaseModel):
    product_style_id: UUID
    size_lines: list[WorkOrderSizeLineInput]
    priority: str = "normal"  # low, normal, high, urgent
    planned_start_date: date | None = None
    due_date: date | None = None
    notes: str | None = None

class WorkOrderSizeLineInput(BaseModel):
    color: str
    size: str
    planned_pairs: int = Field(gt=0)

class WorkOrderUpdate(BaseModel):
    priority: str | None = None
    status: str | None = None  # planning, in_progress, on_hold, completed, cancelled
    planned_start_date: date | None = None
    due_date: date | None = None
    notes: str | None = None
    version: int
```

**Business Logic for `generate-tasks`**:
1. Look up the product style's production stages (from `production_stages` table)
2. For each stage, create a Task with:
   - `title`: "{stage_name} - {style_name} - WO-{code}"
   - `board_id`: production board
   - `work_order_id`: linked
   - `status`: "backlog"
   - `estimated_quantity`: total planned pairs
   - `requires_review`: true for QC stage
3. Return the created tasks

**Business Logic for `material-requirements`**:
1. Get the approved BOM for the style
2. Multiply each BOM item quantity × total planned pairs × (1 + wastage%)
3. Compare with current stock
4. Return list: material, required qty, available stock, shortfall

### 4.2 Frontend — Work Orders Page (Enhanced)

**Route**: `apps/frontend/src/app/work-orders/page.tsx` (replace existing read-only)

**List View**:
- Kanban columns by status (Planning → In Progress → On Hold → Completed)
- Or table view toggle
- Each card: WO code, style name, progress bar (completed/planned), priority badge, due date
- FAB "New Work Order"

**Create Flow** (`apps/frontend/src/components/work-orders/create-work-order.tsx`):
1. Step 1: Select product style (searchable dropdown showing style_code + name)
2. Step 2: Add size lines (color picker, sizes from style's size_range, quantity inputs)
3. Step 3: Set priority, dates, notes
4. Step 4: Review material requirements (shows shortfalls in red)
5. Submit → shows success with "Generate Tasks" CTA

**Detail View** (`apps/frontend/src/app/work-orders/[id]/page.tsx`):
- Header: WO code, style, status badge, priority, dates
- Progress section: completed/planned pairs by size
- Stage progress: horizontal stepper showing current stage
- Material requirements section
- Linked tasks section (filterable by status)
- Actions: Advance Stage, Generate Tasks, Complete, Cancel

**Mobile UX**:
- Create flow is a multi-step wizard with back/next navigation
- Size line entry: grid of size buttons with quantity below each
- Material shortfalls highlight with "Create Purchase Task" quick action
- Stage stepper is horizontal-scrollable on narrow screens

---

## Phase 5: Inventory Movements

### 5.1 Backend — Inventory API Enhancements

**Routes** (extend existing):
```
GET    /api/v1/inventory/materials                → list materials with current stock
GET    /api/v1/inventory/materials/{id}           → material detail + recent movements
POST   /api/v1/inventory/materials                → create material (manager+)
PATCH  /api/v1/inventory/materials/{id}           → update material (manager+)
GET    /api/v1/inventory/movements                → list movements (filtered by material, type, date)
POST   /api/v1/inventory/receive                  → receive stock from supplier
POST   /api/v1/inventory/issue                    → issue to work order
POST   /api/v1/inventory/adjust                   → manual adjustment (requires reason + manager)
POST   /api/v1/inventory/wastage                  → record wastage
POST   /api/v1/inventory/finished-goods-receive   → receive from completed WO (requires QC pass)
GET    /api/v1/inventory/finished-goods           → list finished goods stock
```

**Schemas**:
```python
class MaterialCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str
    unit_of_measure: str  # meters, kg, pairs, sheets, liters, pieces
    supplier_id: UUID | None = None
    minimum_stock: Decimal = Field(ge=0, default=Decimal("0"))
    reorder_quantity: Decimal | None = None
    average_cost_npr: Decimal | None = None
    location: str | None = None

class ReceiveStockInput(BaseModel):
    material_id: UUID
    quantity: Decimal = Field(gt=0)
    unit_cost_npr: Decimal = Field(ge=0)
    supplier_id: UUID | None = None
    lot_number: str | None = None
    notes: str | None = None

class IssueStockInput(BaseModel):
    material_id: UUID
    quantity: Decimal = Field(gt=0)
    work_order_id: UUID
    notes: str | None = None

class AdjustStockInput(BaseModel):
    material_id: UUID
    quantity_delta: Decimal  # positive = add, negative = remove
    reason: str = Field(min_length=5, max_length=500)
    notes: str | None = None

class WastageInput(BaseModel):
    material_id: UUID
    quantity: Decimal = Field(gt=0)
    work_order_id: UUID | None = None
    reason: str = Field(min_length=5, max_length=500)

class FinishedGoodsReceiveInput(BaseModel):
    work_order_id: UUID
    size_lines: list[FinishedGoodsSizeLine]

class FinishedGoodsSizeLine(BaseModel):
    color: str
    size: str
    quantity: int = Field(gt=0)
```

**Business Logic**:
- `receive`: Creates `InventoryMovement(movement_type="receive")`, updates `inventory_stock.quantity += qty`, updates `material.last_purchase_cost_npr` and recalculates `average_cost_npr`
- `issue`: Creates movement `"issue_to_work_order"`, decreases stock. **Fails if stock < qty** unless user has override permission.
- `adjust`: Creates movement `"adjustment"`, requires non-empty `reason`. Only managers/admins.
- `wastage`: Creates movement `"wastage"`, decreases stock.
- `finished-goods-receive`: Validates QC inspection with `status=passed` exists for this WO. Creates `inventory_stock` entries for `ProductVariant`s with `qc_status=approved`.

### 5.2 Frontend — Inventory Page (Enhanced)

**Route**: `apps/frontend/src/app/inventory/page.tsx` (replace existing read-only)

**Tabs** (mobile: swipeable tabs):
1. **Materials** — list with stock level, risk badge, supplier
2. **Low Stock** — filtered to materials below minimum
3. **Movements** — recent movement log with filters
4. **Finished Goods** — by style/color/size with QC and label status

**Quick Actions** (command ribbon on mobile):
- "Receive Material" → bottom sheet form
- "Issue to WO" → bottom sheet with WO picker + material + qty
- "Record Wastage" → bottom sheet form
- "Adjust Stock" → bottom sheet with reason field (required)

**Material Detail** (`apps/frontend/src/app/inventory/[id]/page.tsx`):
- Current stock level with visual gauge
- Recent movements table
- Supplier info + reorder point
- Cost history chart

**Mobile UX**:
- Receive form: large quantity input (numeric keyboard), material searchable select
- Barcode scan button (camera) to identify material by code
- Risk badges: 🔴 Critical (stock=0), 🟠 Low (below minimum), 🟢 OK
- Pull-to-refresh on stock list
- "Call Supplier" link on low-stock items

---

## Phase 6: QC Inspections & Rework

### 6.1 Backend — QC API

**Routes** (extend existing read-only):
```
GET    /api/v1/quality/inspections                      → list (filtered by WO, status, date)
GET    /api/v1/quality/inspections/{id}                 → detail with defects
POST   /api/v1/quality/inspections                      → create inspection (QC role+)
PATCH  /api/v1/quality/inspections/{id}                 → update (add defects, change status)
POST   /api/v1/quality/inspections/{id}/defects         → add defect line
POST   /api/v1/quality/inspections/{id}/approve         → mark as passed (QC/manager)
POST   /api/v1/quality/inspections/{id}/fail            → mark as failed, optionally create rework task
GET    /api/v1/quality/defect-types                     → list defect type enum values
GET    /api/v1/quality/stats                            → defect rate, rework rate, pass rate over time
```

**Schemas**:
```python
class InspectionCreate(BaseModel):
    work_order_id: UUID
    inspected_quantity: int = Field(gt=0)
    notes: str | None = None

class DefectInput(BaseModel):
    defect_type: str  # stitching, sole_bond, color, shape, material, finish, sizing, other
    quantity: int = Field(gt=0)
    severity: str = "minor"  # minor, major, critical
    notes: str | None = None
    photo_attachment_id: UUID | None = None

class InspectionApprove(BaseModel):
    passed_quantity: int = Field(gt=0)
    notes: str | None = None

class InspectionFail(BaseModel):
    failed_quantity: int = Field(gt=0)
    rework_quantity: int = Field(ge=0, default=0)
    create_rework_task: bool = True
    rework_notes: str | None = None
```

**Business Logic**:
- `create`: Creates inspection record linked to work order. Sets `status=in_progress`.
- `add defect`: Appends defect line to inspection. Increments `defect_quantity` on parent.
- `approve`: Sets `status=passed`. Calculates `passed_quantity`. This unblocks `finished-goods-receive`.
- `fail`: Sets `status=failed`. If `create_rework_task=true`, creates a Task with `title: "Rework - {defect_type} - WO-{code}"`, `status: "ready"`, `requires_review: true`.

### 6.2 Frontend — Quality Page (Enhanced)

**Route**: `apps/frontend/src/app/quality/page.tsx` (replace existing read-only)

**Layout**:
- Summary cards: Pass Rate %, Defect Rate %, Rework Count, Pending Inspections
- List of inspections: WO code, date, status badge, qty inspected, defects found
- "New Inspection" FAB

**Create Inspection Flow** (`apps/frontend/src/components/quality/inspection-form.tsx`):
1. Select Work Order (shows only WOs in QC stage or completed)
2. Enter quantity inspected
3. Add defects (repeatable section): type dropdown, quantity, severity, optional photo
4. Decision: "Pass" or "Fail"
   - Pass: enter passed quantity → auto-enables finished goods receipt
   - Fail: enter failed/rework quantities → optionally creates rework task

**Mobile UX**:
- Defect entry is card-based, swipe to delete
- Photo upload per defect with camera capture
- Large pass/fail buttons at bottom (green/red, full width)
- Defect type selector: icon grid (stitching needle icon, sole icon, etc.)
- Quick "Inspect & Pass All" shortcut for batches with no issues

---

## Phase 7: Reports & Analytics

### 7.1 Backend — Reports API

**Routes**:
```
GET    /api/v1/reports/dashboard                → main dashboard (already exists, enhance)
GET    /api/v1/reports/production               → daily/weekly production report
GET    /api/v1/reports/tasks                    → task completion report
GET    /api/v1/reports/inventory                → stock levels and movement summary
GET    /api/v1/reports/quality                  → defect and rework analysis
GET    /api/v1/reports/costs                    → cost per pair by style/WO
GET    /api/v1/reports/export/{report_type}.csv → CSV export for any report
```

**Query Parameters** (common to all reports):
```
?start_date=2026-01-01&end_date=2026-01-31&style_id=...&work_order_id=...
```

**Report Payloads**:

```python
class ProductionReport(BaseModel):
    period: str
    total_planned_pairs: int
    total_completed_pairs: int
    completion_rate: Decimal
    by_style: list[StyleProductionSummary]
    by_day: list[DailyProduction]
    blocked_count: int
    average_cycle_time_hours: Decimal | None

class TaskReport(BaseModel):
    total_tasks: int
    completed: int
    in_progress: int
    blocked: int
    overdue: int
    by_status: dict[str, int]
    by_assignee: list[AssigneeTaskSummary]
    average_completion_hours: Decimal | None

class QualityReport(BaseModel):
    total_inspected: int
    total_passed: int
    total_failed: int
    pass_rate: Decimal
    defect_rate: Decimal
    top_defect_types: list[DefectTypeSummary]
    rework_count: int
    by_work_order: list[WoQualitySummary]

class CostReport(BaseModel):
    by_style: list[StyleCostSummary]
    total_material_cost_npr: Decimal
    average_cost_per_pair_npr: Decimal
    styles_above_target: list[StyleCostAlert]
```

### 7.2 Frontend — Reports Page (Enhanced)

**Route**: `apps/frontend/src/app/reports/page.tsx`

**Layout** (tabbed navigation):
1. **Production** — Pairs produced chart (line), completion rate, by-style breakdown table
2. **Tasks** — Task velocity chart, blocked reasons pie chart, by-assignee bar chart
3. **Quality** — Pass rate trend, defect type distribution, rework timeline
4. **Costs** — Cost per pair by style (bar chart), styles above target (highlighted)
5. **Inventory** — Stock levels heatmap, movement volume by type

**Common Features**:
- Date range picker (preset: Today, This Week, This Month, Last 30 Days, Custom)
- Filter by style, work order
- "Export CSV" button on every tab
- On-page data tables with TanStack Table (sortable, paginated)
- Charts use Recharts with responsive containers

**Mobile UX**:
- Tabs are scrollable horizontal pills
- Charts scale to full width with touch-friendly tooltips
- Date range uses native date inputs (not custom calendar)
- Tables become scrollable cards on mobile
- CSV download triggers native share sheet on mobile

---

## Phase 8: Admin Settings

### 8.1 Backend — Settings API

**Routes**:
```
GET    /api/v1/admin/production-stages          → list stages
POST   /api/v1/admin/production-stages          → create stage (admin)
PATCH  /api/v1/admin/production-stages/{id}     → update (admin)
DELETE /api/v1/admin/production-stages/{id}     → deactivate (admin)

GET    /api/v1/admin/task-statuses              → list configured statuses
PUT    /api/v1/admin/task-statuses              → replace status config (admin)

GET    /api/v1/admin/material-categories        → list categories
PUT    /api/v1/admin/material-categories        → replace category list (admin)

GET    /api/v1/admin/units-of-measure           → list UoM options
PUT    /api/v1/admin/units-of-measure           → replace UoM list (admin)

GET    /api/v1/admin/costing-settings           → wastage defaults, target thresholds
PUT    /api/v1/admin/costing-settings           → update costing config (admin)

GET    /api/v1/admin/audit-log                  → paginated audit log (admin only)
```

### 8.2 Frontend — Settings Page (Enhanced)

**Route**: `apps/frontend/src/app/settings/page.tsx` (extend existing)

Add tabs beyond "Landing Page" and "Catalog":
- **Production Stages** — Drag-to-reorder list of stages, add/remove/rename
- **Materials Config** — Categories and units of measure management
- **Costing** — Default wastage %, target cost thresholds, currency display
- **Audit Log** — Searchable table of all changes (who, what, when, before/after)
- **System** — App version, deployment info, health status

**Mobile UX**:
- Settings are collapsible sections, not tabs (easier to navigate on phone)
- Audit log is a timeline feed (card per entry) with expand for diff view
- Drag-to-reorder uses long-press + drag (touch-friendly)

---

## Phase 9: Audit Logging

### 9.1 Implementation

**Add to every mutation in `service.py`**:

```python
async def write_audit_log(
    db: AsyncSession,
    actor: User,
    action: str,
    entity_type: str,
    entity_id: UUID,
    before_data: dict | None = None,
    after_data: dict | None = None,
):
    log = AuditLog(
        actor_user_id=actor.id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_data=before_data,
        after_data=after_data,
    )
    db.add(log)
```

**Actions to audit**:
- `style.create`, `style.update`, `style.archive`
- `bom.create`, `bom.approve`
- `supplier.create`, `supplier.update`
- `work_order.create`, `work_order.update`, `work_order.advance_stage`, `work_order.complete`
- `inventory.receive`, `inventory.issue`, `inventory.adjust`, `inventory.wastage`
- `inspection.create`, `inspection.approve`, `inspection.fail`
- `task.create`, `task.update`, `task.status_change`
- `user.create`, `user.update`, `user.disable`
- `employee.create`, `employee.update`
- `settings.update`

---

## Phase 10: PDF Label Generation

### 10.1 Backend — PDF Service

**File**: `apps/backend/app/modules/labels/pdf_service.py`

**Implementation**: Use `reportlab` (add to `pyproject.toml` dependencies).

```python
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from io import BytesIO

async def generate_label_pdf(
    template: LabelTemplate,
    field_values: dict,
    quantity: int,
) -> bytes:
    """Generate PDF with labels laid out per template geometry."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    
    slots_per_page = template.slots_per_page  # 24 for 3x8
    pages_needed = math.ceil(quantity / slots_per_page)
    
    for page in range(pages_needed):
        if page > 0:
            c.showPage()
        for slot in range(min(slots_per_page, quantity - page * slots_per_page)):
            col = slot % template.columns
            row = slot // template.columns
            x = template.page_margin_left_mm * mm + col * (template.label_width_mm + template.gap_horizontal_mm) * mm
            y = A4[1] - (template.page_margin_top_mm * mm + row * (template.label_height_mm + template.gap_vertical_mm) * mm) - template.label_height_mm * mm
            _draw_single_label(c, x, y, template, field_values)
    
    c.save()
    return buffer.getvalue()
```

**Route**:
```
POST   /api/v1/labels/saved/{id}/generate-pdf   → generate + return PDF (also creates print job)
```

Response: `application/pdf` stream with `Content-Disposition: attachment`.

**Storage**: For now, return directly without S3 storage (MVP). When S3 is configured, upload and store `pdf_s3_key` on the print job record.

### 10.2 Frontend — PDF Download Integration

In the labels workflow, after preview, add "Download PDF" button that:
1. Calls `POST /api/v1/labels/saved/{id}/generate-pdf` with quantity
2. Receives PDF blob
3. Opens in new tab or triggers download
4. Shows success toast with print job reference

---

## Phase 11: S3 File Upload (Photos & Documents)

### 11.1 Backend — Upload API

**Routes**:
```
POST   /api/v1/uploads/request-url              → get pre-signed upload URL
POST   /api/v1/uploads/confirm                  → confirm upload + create Attachment record
GET    /api/v1/uploads/{attachment_id}/url       → get pre-signed download URL
```

**Logic**:
1. Frontend requests upload URL with `{ filename, content_type, entity_type, entity_id }`
2. Backend generates S3 pre-signed PUT URL (expires 5 min) and returns `{ upload_url, attachment_id, key }`
3. Frontend uploads directly to S3 using the pre-signed URL
4. Frontend calls confirm endpoint to mark attachment as uploaded
5. Backend verifies object exists in S3 and activates the attachment record

**For local dev**: Use local file storage (existing `uploads/` directory) with a simple multipart upload endpoint as fallback when S3 is not configured.

### 11.2 Frontend — Upload Component

**File**: `apps/frontend/src/components/ui/file-upload.tsx`

```tsx
interface FileUploadProps {
  accept?: string;
  capture?: "user" | "environment";
  maxSizeMB?: number;
  onUpload: (attachmentId: string) => void;
  entityType: string;
  entityId: string;
}
```

Features:
- Drag and drop zone (desktop)
- Camera capture button (mobile)
- Progress bar during upload
- Preview thumbnail after upload
- Error state with retry

---

## Phase 12: Navigation & Polish

### 12.1 Updated Navigation Structure

**FactoryShell sidebar** (update `apps/frontend/src/components/factory/factory-shell.tsx`):

```
Dashboard          /dashboard
Operations         /operations
├─ Tasks           /tasks
├─ Work Orders     /work-orders
├─ Inventory       /inventory
├─ Quality         /quality
Products           /styles
├─ Styles          /styles
├─ Suppliers       /suppliers
Labels             /labels
People             /people
├─ Users           /people/users
├─ Employees       /people/employees
Reports            /reports
Settings           /settings
```

**Mobile bottom nav** (5 items max):
- Dashboard, Tasks, Work Orders, Labels, More (hub sheet)

### 12.2 Global Search (Stretch)

**File**: `apps/frontend/src/components/factory/global-search.tsx`

Command-K palette that searches across:
- Styles by code/name
- Work orders by code
- Tasks by code/title
- Materials by code/name
- Employees by name

Backend: `GET /api/v1/search?q=...` — searches across entities with pg `ILIKE` or `to_tsvector`.

---

## Database Migration

### New Migration: `apps/backend/alembic/versions/XXXXX_add_remaining_apis.py`

**No new tables needed** — all tables already exist in the schema. The migration should only add:

1. Index on `product_styles.style_code` (unique)
2. Index on `suppliers.supplier_code` (unique)  
3. Index on `materials.material_code` (unique)
4. Index on `inventory_movements.created_at` for time-range queries
5. Index on `audit_logs.entity_type, entity_id` for entity history lookup
6. Index on `audit_logs.created_at` for time-range queries
7. Add `version` column to `product_styles` (default 1) if not exists
8. Add `version` column to `suppliers` (default 1) if not exists
9. Add `version` column to `materials` (default 1) if not exists

---

## Testing Strategy

### Backend Tests (add to `apps/backend/tests/`)

```
test_styles_api.py          — CRUD, code generation, archive, BOM versioning
test_suppliers_api.py       — CRUD, code generation, search
test_work_orders_api.py     — Create, size lines, task generation, stage advance, complete
test_inventory_api.py       — Receive, issue (stock check), adjust (reason required), wastage, negative stock prevention
test_quality_api.py         — Create inspection, add defects, approve, fail, rework task creation
test_reports_api.py         — Date filtering, aggregation correctness
test_audit_log.py           — Verify audit records written on mutations
test_pdf_generation.py      — PDF output valid, correct page count for quantity
test_permissions.py         — Workers can't create WOs, only managers can adjust stock, etc.
```

### Frontend Tests (when Playwright is set up)

Priority smoke tests:
1. Login → dashboard loads with KPIs
2. Create style → appears in list
3. Create work order → generates tasks
4. Receive material → stock updates
5. Create QC inspection → approve → enables finished goods
6. Print labels → PDF downloads

---

## Implementation Order (For AI Agent)

Execute in this exact order. Each phase should be committed separately.

### Commit 1: Foundation (Phase 1)
1. Create `query-provider.tsx`, wire into layout
2. Create `lib/api.ts` with `apiFetch` helper
3. Create `components/ui/form-field.tsx`, `form-input.tsx`, `form-select.tsx`, `form-textarea.tsx`, `form-number-input.tsx`
4. Create `components/ui/bottom-sheet.tsx`
5. Create `components/ui/confirm-dialog.tsx`
6. Add CSS for new components in `globals.css`
7. Lint + typecheck

### Commit 2: Product Styles Backend (Phase 2.1, 2.2)
1. Add style CRUD + BOM endpoints to service.py
2. Add schemas
3. Register routes
4. Write tests
5. Run ruff + mypy + tests

### Commit 3: Product Styles Frontend (Phase 2.3)
1. Create `/styles` page with list
2. Create `/styles/[id]` detail page
3. Create style-card, style-form, bom-editor components
4. Wire to API with TanStack Query
5. Lint + typecheck

### Commit 4: Suppliers (Phase 3)
1. Backend: CRUD endpoints, schemas, route registration, tests
2. Frontend: `/suppliers` page, form, list
3. Lint + typecheck + tests

### Commit 5: Work Orders Mutations (Phase 4)
1. Backend: Create/update/generate-tasks/advance-stage/complete endpoints
2. Backend: Material requirements calculation
3. Tests for task generation and stage transitions
4. Frontend: Enhanced work-orders page with create flow
5. Frontend: Work order detail page
6. Lint + typecheck + tests

### Commit 6: Inventory Movements (Phase 5)
1. Backend: All movement endpoints with stock validation
2. Backend: Negative stock prevention, adjustment reason enforcement
3. Tests for stock math, permission checks
4. Frontend: Enhanced inventory page with tabs
5. Frontend: Receive/issue/adjust/wastage bottom sheets
6. Frontend: Material detail page
7. Lint + typecheck + tests

### Commit 7: QC & Rework (Phase 6)
1. Backend: Inspection CRUD, defect entry, approve/fail/rework endpoints
2. Backend: Finished goods gate (QC pass required)
3. Tests
4. Frontend: Enhanced quality page
5. Frontend: Inspection form with defect entry
6. Lint + typecheck + tests

### Commit 8: Reports (Phase 7)
1. Backend: All report endpoints with date filtering
2. Backend: CSV export for each report type
3. Frontend: Reports page with tabs, charts, tables
4. Fix existing hardcoded localhost URLs in report downloads
5. Lint + typecheck

### Commit 9: Admin Settings & Audit Log (Phase 8, 9)
1. Backend: Admin settings endpoints + audit log read endpoint
2. Backend: Add audit logging to all existing mutations
3. Frontend: Enhanced settings page with all config sections
4. Frontend: Audit log viewer
5. Lint + typecheck

### Commit 10: PDF Labels + File Upload (Phase 10, 11)
1. Add `reportlab` to backend dependencies
2. Implement PDF generation service
3. Add PDF endpoint + print job recording
4. Implement upload endpoints (S3 or local fallback)
5. Frontend: Upload component + PDF download button in labels
6. Lint + typecheck + tests

### Commit 11: Navigation & Polish (Phase 12)
1. Update FactoryShell navigation structure
2. Add global search (if time permits)
3. Ensure all pages linked from nav
4. Mobile bottom nav update
5. Final lint + typecheck + build

---

## CSS & Design Tokens

All new components should use the existing design system defined in `globals.css`. Key patterns:

- Glass cards: `.glass-card` class
- Panel headers: `.panel-heading`
- Badges: `.ui-badge-{color}` variants
- Forms: `.form-field`, `.form-label`, `.form-error`, `.form-hint`
- Buttons: Use the CVA `Button` component with existing variants

**New CSS to add for form components**:
```css
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}
.form-required {
  color: var(--color-danger);
  margin-left: 0.125rem;
}
.form-error {
  font-size: 0.75rem;
  color: var(--color-danger);
}
.form-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
.form-input {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  background: var(--color-surface);
  min-height: 44px; /* touch target */
  transition: border-color 0.15s;
}
.form-input:focus {
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-accent-faint);
}
.form-input-error {
  border-color: var(--color-danger);
}
```

**Bottom sheet CSS**:
```css
.bottom-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 50;
  animation: fade-in 0.2s ease;
}
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 92vh;
  background: var(--color-surface);
  border-radius: 1rem 1rem 0 0;
  z-index: 51;
  animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  overflow-y: auto;
  overscroll-behavior-y: contain;
}
@media (min-width: 768px) {
  .bottom-sheet {
    position: fixed;
    top: 50%;
    left: 50%;
    bottom: auto;
    right: auto;
    transform: translate(-50%, -50%);
    max-width: 32rem;
    width: calc(100% - 2rem);
    max-height: 85vh;
    border-radius: 1rem;
    animation: scale-in 0.2s ease;
  }
}
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

---

## API Client Regeneration

After each backend commit that adds new endpoints:
1. Start backend locally or use the export script
2. Run `corepack pnpm generate:api` to regenerate TypeScript client
3. Import new typed functions in frontend components

The generated client lives in `packages/api-client/src/generated/` and exports typed functions for every endpoint.

---

## Package Versions (Current — No New Packages Needed for Frontend)

Frontend (already in package.json):
- `next`: 16.2.4
- `react`: 19.2.5
- `@tanstack/react-query`: 5.100.8
- `@tanstack/react-table`: 8.21.3
- `zod`: 4.4.2
- `recharts`: 3.8.1
- `sonner`: 2.0.7
- `lucide-react`: 1.14.0

Backend (add to pyproject.toml):
- `reportlab` >= 4.3 (for PDF generation)
- Everything else already installed

---

## Mobile UX Principles (Apply Everywhere)

1. **44px minimum touch targets** — All buttons, inputs, interactive elements
2. **Bottom-heavy actions** — Primary actions in thumb zone (bottom of screen)
3. **No hover-dependent UI** — Everything accessible via tap
4. **Numeric keyboard for numbers** — Use `inputMode="numeric"` on quantity fields
5. **Tel links for phone numbers** — `<a href="tel:...">`
6. **Camera capture for photos** — `accept="image/*" capture="environment"`
7. **Swipe gestures sparingly** — Only for dismiss/delete where obvious
8. **Loading skeletons** — Never show blank screens
9. **Optimistic UI** — Show changes immediately, revert on error
10. **Connection-aware** — Show offline indicator, queue mutations when possible
11. **No horizontal scroll** — Everything wraps or scrolls vertically at 390px
12. **Large clear typography** — 16px base minimum for form inputs (prevents iOS zoom)

---

## Error Handling Pattern

**Backend**: Every endpoint returns structured errors:
```json
{
  "detail": "Human-readable message",
  "code": "MACHINE_CODE",
  "field": "optional_field_name"
}
```

**Frontend**: 
- Network errors → Sonner toast with retry action
- Validation errors (422) → Show inline field errors
- Permission errors (403) → Show "insufficient permissions" state
- Not found (404) → Show empty state with back navigation
- Conflict (409) → "Data was modified, please refresh" with refresh button
- Server errors (500) → Generic error card with "Contact admin" message

---

## Definition of Done

When all phases are complete:
- [ ] A manager can create a product style with BOM and cost estimate
- [ ] A manager can create a work order from a style and auto-generate tasks
- [ ] Workers can update assigned tasks from their phone
- [ ] Inventory clerk can receive materials and issue to work orders
- [ ] Stock cannot go negative without override permission
- [ ] QC inspector can create inspections with defects and approve/fail
- [ ] Finished goods cannot be received without QC pass
- [ ] Labels can be generated as PDF and print jobs are tracked
- [ ] Owner can see production, quality, cost, and inventory reports
- [ ] All mutations create audit log entries
- [ ] Admin can configure production stages, material categories, and costing
- [ ] Every page works on 390px mobile without horizontal scroll
- [ ] All forms have client-side validation with clear error messages
- [ ] Backend lint (ruff), type check (mypy), and tests pass
- [ ] Frontend lint (eslint), type check (tsc), and build pass
