# High-Impact Improvements: Pailo Factory App

## Executive Summary

This document identifies concrete software improvements that will drive measurable monetary value for Pailo Shoes as it scales from 100 pairs/day (~₹900 cost/pair) toward 1,000 pairs/day. Each improvement includes implementation specification, estimated monetary impact, and priority.

**Current baseline assumptions:**
- Production: 100 pairs/day → scaling to 1,000 pairs/day
- Average cost per pair: ~NPR 900
- Average selling price per pair: ~NPR 1,200–1,500
- Working days/month: 26
- Monthly production value: 100 × 26 × 1,200 = NPR 3,120,000 (~$23,000 USD)
- At 1,000 pairs/day: NPR 31,200,000/month (~$230,000 USD)
- Workforce: ~20–30 workers scaling to 80–120
- Material inventory value: ~NPR 2,000,000–5,000,000 at any time

---

## Improvement 1: Real-Time Material Reservation & Auto-Purchase Alerts

### Problem

When a work order is created, the system does not reserve materials from inventory. Multiple work orders can claim the same stock, causing mid-production stockouts. Workers discover material shortages after they've already started cutting/stitching, creating idle time and rework.

### Monetary Impact

- **Idle time from stockouts:** 15–30 minutes per incident × 2–3 incidents/week × 5 workers affected = 2.5–7.5 hours/week lost
- **At NPR 150/hour labor cost:** NPR 375–1,125/week = **NPR 1,500–4,500/month saved**
- **Expedited material purchases at premium:** 10–20% markup on emergency buys, ~2 per month × NPR 20,000 average order = **NPR 4,000–8,000/month saved**
- **At 1,000 pairs/day scale:** multiply by 5–10x = **NPR 30,000–60,000/month saved**

### Implementation Specification

**Database changes:**

```sql
-- Add material_reservations table
CREATE TABLE material_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id),
    material_id UUID NOT NULL REFERENCES materials(id),
    quantity_reserved DECIMAL(12,3) NOT NULL,
    quantity_issued DECIMAL(12,3) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'reserved', -- reserved, partially_issued, fully_issued, cancelled
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reserved_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ, -- auto-release if WO not started within X days
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for checking available stock
CREATE INDEX idx_material_reservations_material_status 
    ON material_reservations(material_id, status) 
    WHERE status IN ('reserved', 'partially_issued');

-- Add reorder_point and reorder_quantity to materials
ALTER TABLE materials ADD COLUMN reorder_point DECIMAL(12,3);
ALTER TABLE materials ADD COLUMN reorder_quantity DECIMAL(12,3);
ALTER TABLE materials ADD COLUMN lead_time_days INTEGER DEFAULT 7;
```

**Backend service logic:**

```python
# app/modules/inventory/reservation_service.py

async def reserve_materials_for_work_order(
    db: AsyncSession, 
    work_order_id: UUID, 
    user_id: UUID
) -> ReservationResult:
    """
    When a work order is created/confirmed, calculate BOM requirements
    and attempt to reserve materials.
    
    Returns:
        ReservationResult with:
        - reserved: list of materials successfully reserved
        - shortfalls: list of materials with insufficient stock
        - purchase_alerts: list of materials below reorder point after reservation
    """
    # 1. Get work order with style and quantity
    work_order = await get_work_order(db, work_order_id)
    
    # 2. Get BOM for the style
    bom_items = await get_bom_for_style(db, work_order.style_id)
    
    # 3. For each BOM item, calculate required quantity
    #    required = bom_quantity × work_order_quantity × (1 + wastage_pct/100)
    
    # 4. Check available stock (on_hand - already_reserved)
    #    available = current_stock - SUM(reserved WHERE status IN ('reserved','partially_issued'))
    
    # 5. Reserve what's available, flag shortfalls
    
    # 6. Generate purchase alerts for materials below reorder_point
    
    # 7. Return result with actionable shortfall list

async def get_available_stock(db: AsyncSession, material_id: UUID) -> Decimal:
    """Returns on-hand stock minus all active reservations."""
    pass

async def auto_generate_purchase_suggestions(db: AsyncSession) -> list[PurchaseSuggestion]:
    """
    Runs daily or on-demand. For each material where:
    available_stock < reorder_point
    Generate a purchase suggestion with:
    - material_id, material_name
    - current_available (on_hand - reserved)
    - reorder_point
    - suggested_quantity (reorder_quantity or enough for next 2 weeks of WOs)
    - preferred_supplier_id (from supplier_materials or last purchase)
    - estimated_cost (last_price × quantity)
    - urgency: critical (stockout imminent), warning (below reorder), info (approaching)
    """
    pass
```

**Frontend changes:**

1. Work order creation page: after selecting style and quantity, show material availability check with green/yellow/red indicators per BOM line
2. Dashboard widget: "Materials to Order" card showing purchase suggestions sorted by urgency
3. Inventory page: show "Available" column (on_hand minus reserved) alongside "On Hand"
4. Notification: when a reservation fails (shortfall), show toast and optionally send WhatsApp to purchasing lead

**API endpoints:**

```
POST /api/v1/work-orders/{id}/reserve-materials
GET  /api/v1/inventory/purchase-suggestions
GET  /api/v1/inventory/materials/{id}/availability
```

---

## Improvement 2: BOM Cost Tracking with Actual vs Estimated Variance

### Problem

Without proper BOM versioning and cost snapshots, Pailo cannot tell if a style is profitable. Material prices change frequently in Nepal (import-dependent), and without cost snapshots at production time, there's no way to detect margin erosion until it's too late.

### Monetary Impact

- **Undetected margin erosion:** If a key material increases 15% and Pailo doesn't adjust pricing for 2 months at 100 pairs/day: 100 × 26 × 2 × (NPR 900 × 0.15 × 0.3 material share) = **NPR 210,600 lost margin over 2 months**
- **Better style decisions:** Knowing actual cost/pair per style lets Pailo drop unprofitable styles or adjust pricing. Even 5% improvement in style mix = **NPR 156,000/month at current scale**
- **Negotiation leverage:** Price history per supplier per material enables better negotiation. 3–5% better pricing on NPR 500,000/month materials spend = **NPR 15,000–25,000/month**

### Implementation Specification

**Database changes:**

```sql
-- BOM versions (immutable once approved)
CREATE TABLE bom_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    style_id UUID NOT NULL REFERENCES product_styles(id),
    version_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, approved, superseded
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(style_id, version_number)
);

-- BOM line items
CREATE TABLE bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_version_id UUID NOT NULL REFERENCES bom_versions(id),
    material_id UUID NOT NULL REFERENCES materials(id),
    quantity_per_pair DECIMAL(10,4) NOT NULL,
    wastage_pct DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    unit VARCHAR(20) NOT NULL,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Material price history
CREATE TABLE material_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id),
    supplier_id UUID REFERENCES suppliers(id),
    price_per_unit DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NPR',
    effective_from DATE NOT NULL,
    effective_to DATE,
    source VARCHAR(50), -- 'purchase_order', 'manual_entry', 'supplier_quote'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id)
);

-- Cost snapshot per work order (captured at WO creation/start)
CREATE TABLE work_order_cost_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id),
    bom_version_id UUID NOT NULL REFERENCES bom_versions(id),
    estimated_material_cost_per_pair DECIMAL(12,2) NOT NULL,
    estimated_labor_cost_per_pair DECIMAL(12,2),
    estimated_overhead_per_pair DECIMAL(12,2),
    estimated_total_per_pair DECIMAL(12,2) NOT NULL,
    actual_material_cost_per_pair DECIMAL(12,2), -- filled after WO completion
    actual_labor_cost_per_pair DECIMAL(12,2),
    actual_total_per_pair DECIMAL(12,2),
    variance_pct DECIMAL(5,2), -- ((actual - estimated) / estimated) × 100
    snapshot_prices JSONB NOT NULL, -- {material_id: {price, supplier, qty_needed}}
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Backend service logic:**

```python
# app/modules/costing/service.py

async def calculate_bom_cost(
    db: AsyncSession, 
    bom_version_id: UUID,
    quantity: int = 1
) -> BOMCostBreakdown:
    """
    Calculate current cost using latest material prices.
    Returns per-pair and total cost with per-material breakdown.
    """
    # Get BOM items
    # For each item, get latest price from material_price_history
    # Calculate: quantity_per_pair × (1 + wastage_pct/100) × latest_price
    # Sum all items
    pass

async def create_cost_snapshot(
    db: AsyncSession,
    work_order_id: UUID
) -> WorkOrderCostSnapshot:
    """
    Capture current prices at WO start time. This snapshot is immutable
    and serves as the baseline for variance analysis.
    """
    pass

async def calculate_actual_cost(
    db: AsyncSession,
    work_order_id: UUID
) -> ActualCostResult:
    """
    After WO completion, calculate actual cost from:
    - Actual materials issued (from inventory_movements WHERE work_order_id)
    - Actual labor (hours × rate from task time tracking)
    - Compare to snapshot estimated cost
    - Calculate variance percentage
    """
    pass

async def get_cost_variance_report(
    db: AsyncSession,
    date_from: date,
    date_to: date
) -> CostVarianceReport:
    """
    Show all completed WOs with cost variance.
    Flag any variance > 10% for manager attention.
    Sort by absolute NPR impact (variance × quantity).
    """
    pass

async def get_style_profitability(
    db: AsyncSession,
    style_id: UUID
) -> StyleProfitability:
    """
    Aggregate all WOs for a style:
    - Average actual cost/pair
    - Selling price (from style.target_price)
    - Gross margin NPR and %
    - Trend (last 3 months)
    - Material cost breakdown (pie chart data)
    """
    pass
```

**Frontend pages:**

1. `/styles/{id}/bom` - BOM editor with version history, approve button, cost calculation
2. `/reports/cost-variance` - Table of WOs with estimated vs actual, sortable by impact
3. `/reports/profitability` - Style-level profitability with margin trends
4. Dashboard: "Margin Alert" widget showing styles where actual cost > estimated by >10%

---

## Improvement 3: Production Stage Time Tracking & Bottleneck Detection

### Problem

Pailo cannot identify which production stage is the bottleneck. If stitching takes 2x longer than other stages, the entire line is limited by stitching throughput. Without data, managers guess at capacity allocation and over/under-staff stages.

### Monetary Impact

- **Identifying and fixing the bottleneck stage increases daily throughput by 10–20%** without adding workers
- At 100 pairs/day: 10–20 extra pairs × NPR 300 margin = **NPR 3,000–6,000/day = NPR 78,000–156,000/month**
- **Better worker allocation:** Moving 2 workers from an over-staffed stage to the bottleneck could increase throughput by 15–25%
- At 1,000 pairs/day scale: **NPR 780,000–1,560,000/month** additional revenue from throughput gains
- **Lead time reduction:** Knowing exact stage durations enables accurate delivery promises, reducing lost orders from missed deadlines

### Implementation Specification

**Database changes:**

```sql
-- Track time per stage per work order
CREATE TABLE stage_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id),
    stage VARCHAR(50) NOT NULL, -- cutting, stitching, lasting, sole_attachment, finishing, qc, packing
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    total_pause_duration_minutes INTEGER DEFAULT 0,
    worker_count INTEGER, -- how many workers on this stage for this WO
    pairs_input INTEGER, -- pairs entering this stage
    pairs_output INTEGER, -- pairs exiting this stage (good)
    pairs_defect INTEGER DEFAULT 0, -- pairs sent to rework from this stage
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_stage_time_logs_wo ON stage_time_logs(work_order_id);
CREATE INDEX idx_stage_time_logs_stage_date ON stage_time_logs(stage, started_at);

-- Bottleneck analysis view
CREATE VIEW v_stage_throughput AS
SELECT 
    stage,
    DATE(started_at) as production_date,
    COUNT(*) as batches_processed,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60 - total_pause_duration_minutes) as avg_minutes,
    SUM(pairs_output) as total_pairs_out,
    SUM(pairs_defect) as total_defects,
    AVG(pairs_output::float / NULLIF(worker_count, 0)) as pairs_per_worker
FROM stage_time_logs
WHERE completed_at IS NOT NULL
GROUP BY stage, DATE(started_at);
```

**Backend service logic:**

```python
# app/modules/production/bottleneck_service.py

async def get_bottleneck_analysis(
    db: AsyncSession,
    date_from: date,
    date_to: date
) -> BottleneckAnalysis:
    """
    Identify the production bottleneck by comparing stage throughput rates.
    
    Returns:
    - per_stage_metrics: {stage: avg_time_per_pair, throughput_per_hour, utilization_pct}
    - bottleneck_stage: the stage with lowest throughput
    - recommendation: "Add 2 workers to stitching to match cutting throughput"
    - potential_gain_pairs_per_day: estimated throughput increase if bottleneck resolved
    - potential_gain_npr_per_month: pairs × margin × 26 days
    """
    pass

async def get_stage_efficiency_trend(
    db: AsyncSession,
    stage: str,
    days: int = 30
) -> list[DailyStageMetric]:
    """
    Daily time-series of stage efficiency for trend detection.
    Useful for spotting degradation (machine issues, new workers, material problems).
    """
    pass

async def get_worker_productivity_by_stage(
    db: AsyncSession,
    date_from: date,
    date_to: date
) -> list[WorkerStageProductivity]:
    """
    Pairs per hour per worker per stage.
    Identifies top performers for training/mentoring programs.
    Identifies workers who may need retraining or reassignment.
    """
    pass
```

**Frontend:**

1. Work order detail: stage progress bar with elapsed time per stage, color-coded (green < target, yellow = near target, red = over target)
2. `/reports/bottleneck` - Visual diagram of stages with throughput rates, highlighting the slowest stage
3. Dashboard: "Bottleneck Today" indicator showing which stage has the most WIP queued
4. Manager action: "Suggest Reallocation" button that shows recommended worker moves based on current queue sizes

**Worker interaction (phone-first):**

- Large "Start Stage" / "Complete Stage" buttons on work order detail
- Auto-timestamps when worker marks stage start/complete
- Quick "Pause" button with reason dropdown (material wait, machine issue, break)

---

## Improvement 4: Defect-Driven Rework Automation

### Problem

When QC finds defects, the current flow requires manual task creation for rework. Defects are recorded but don't automatically trigger rework work orders or track the cost of rework. This delays rework, loses traceability, and hides the true cost of quality issues.

### Monetary Impact

- **Rework delay cost:** Average 1–2 day delay between defect detection and rework start. At 5% defect rate on 100 pairs/day = 5 pairs × 1.5 days delay × NPR 50 holding cost = **NPR 375/day = NPR 9,750/month**
- **Untracked rework cost:** Without data, Pailo doesn't know rework costs NPR 150–300/pair extra. At 5% defect rate: 5 pairs × 26 days × NPR 200 = **NPR 26,000/month in hidden costs now made visible and actionable**
- **Defect pattern detection:** Automated tracking reveals that 60% of defects come from one material batch or one stage. Fixing root cause reduces defect rate from 5% to 3% = 2 more good pairs/day × 26 × NPR 1,200 = **NPR 62,400/month revenue recovered**
- **At 1,000 pairs/day:** All above multiplied by 10x = **NPR 980,000/month impact**

### Implementation Specification

**Database changes:**

```sql
-- Link defects to rework tasks
ALTER TABLE quality_inspections ADD COLUMN rework_work_order_id UUID REFERENCES work_orders(id);
ALTER TABLE quality_inspections ADD COLUMN rework_cost_npr DECIMAL(12,2);
ALTER TABLE quality_inspections ADD COLUMN root_cause_category VARCHAR(50); 
-- material_defect, worker_error, machine_issue, design_flaw, supplier_quality

-- Defect analytics table (materialized or computed)
CREATE TABLE defect_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    style_id UUID REFERENCES product_styles(id),
    stage VARCHAR(50),
    defect_type VARCHAR(100),
    root_cause_category VARCHAR(50),
    total_defects INTEGER NOT NULL,
    total_rework_cost_npr DECIMAL(12,2),
    avg_rework_time_hours DECIMAL(6,2),
    material_batch_id UUID, -- if defect linked to a material batch
    supplier_id UUID REFERENCES suppliers(id), -- if material-related
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Backend service logic:**

```python
# app/modules/quality/rework_service.py

async def process_failed_inspection(
    db: AsyncSession,
    inspection_id: UUID,
    defects: list[DefectDetail],
    inspector_id: UUID
) -> ReworkResult:
    """
    When QC fails an inspection:
    1. Record defect details (type, quantity, severity, photos, root_cause)
    2. Auto-create a rework work order if defect is repairable
    3. Auto-create rework tasks assigned to the original stage workers
    4. Send WhatsApp notification to factory manager
    5. Link rework WO back to original WO for cost tracking
    6. If defect is material-related, flag the material batch
    
    Returns:
        ReworkResult with rework_work_order_id, tasks_created, notifications_sent
    """
    pass

async def get_defect_pareto(
    db: AsyncSession,
    date_from: date,
    date_to: date,
    group_by: str = "defect_type"  # or "stage", "style", "root_cause", "supplier"
) -> ParetoChart:
    """
    Pareto analysis: top defect causes ordered by frequency and cost impact.
    The top 20% of causes typically drive 80% of defect cost.
    Returns data ready for a Pareto chart (bars + cumulative line).
    """
    pass

async def get_supplier_quality_score(
    db: AsyncSession,
    supplier_id: UUID,
    months: int = 6
) -> SupplierQualityScore:
    """
    Score supplier based on:
    - Defect rate of their materials
    - On-time delivery rate
    - Price competitiveness
    - Consistency (standard deviation of quality)
    Returns 0-100 score with breakdown.
    """
    pass
```

**Frontend:**

1. QC inspection result page: "Fail" action opens rework form with defect type, count, severity, root cause, photo upload
2. Auto-generated rework task appears in task board immediately
3. `/reports/quality/pareto` - Pareto chart of defect causes with cost impact
4. `/reports/quality/suppliers` - Supplier quality scorecard
5. Dashboard: "Rework Cost This Week" counter with trend arrow

---

## Improvement 5: Worker Piece-Rate & Productivity Dashboard

### Problem

Pailo likely uses piece-rate or semi-piece-rate pay. Without tracking pairs completed per worker per day, there's no way to calculate accurate pay, identify training needs, or reward top performers. Managers currently estimate output manually.

### Monetary Impact

- **Accurate piece-rate calculation:** Eliminates disputes and manual counting errors. Time saved: 1 hour/day for manager × NPR 300/hour × 26 = **NPR 7,800/month**
- **Productivity visibility drives 5–15% improvement:** Workers who know their output is tracked produce more. 10% improvement on 100 pairs = 10 extra pairs × NPR 300 margin × 26 = **NPR 78,000/month**
- **Identify training opportunities:** Bottom 20% of workers trained to median level = significant throughput gain
- **Fair incentive structure:** Top performers retained (replacement cost: NPR 15,000–30,000 per worker in recruitment + training time)
- **At 1,000 pairs/day scale:** 10% productivity gain = **NPR 780,000/month**

### Implementation Specification

**Database changes:**

```sql
-- Worker daily production log (auto-populated from task completions)
CREATE TABLE worker_production_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    production_date DATE NOT NULL,
    stage VARCHAR(50) NOT NULL,
    work_order_id UUID REFERENCES work_orders(id),
    pairs_completed INTEGER NOT NULL,
    hours_worked DECIMAL(4,2),
    pairs_per_hour DECIMAL(6,2) GENERATED ALWAYS AS (
        CASE WHEN hours_worked > 0 THEN pairs_completed / hours_worked ELSE NULL END
    ) STORED,
    quality_pass_rate DECIMAL(5,2), -- % of their output that passed QC
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_worker_prod_employee_date ON worker_production_log(employee_id, production_date);
CREATE INDEX idx_worker_prod_date ON worker_production_log(production_date);

-- Piece rate configuration
CREATE TABLE piece_rate_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage VARCHAR(50) NOT NULL,
    style_category VARCHAR(50), -- NULL means default for all styles in this stage
    rate_per_pair DECIMAL(8,2) NOT NULL, -- NPR per pair
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Backend service logic:**

```python
# app/modules/people/productivity_service.py

async def calculate_daily_worker_output(
    db: AsyncSession,
    employee_id: UUID,
    date: date
) -> WorkerDailyOutput:
    """
    Aggregate from completed tasks for the day:
    - Total pairs completed
    - Hours worked (from task start/complete timestamps)
    - Pairs per hour
    - Stages worked
    - Quality rate (from QC inspections of their output)
    """
    pass

async def calculate_piece_rate_pay(
    db: AsyncSession,
    employee_id: UUID,
    period_start: date,
    period_end: date
) -> PieceRatePaySummary:
    """
    Calculate pay for a period:
    - For each day: pairs × rate_per_pair for that stage/style
    - Total earned
    - Bonus if above target threshold
    - Deductions for quality failures (if policy applies)
    """
    pass

async def get_team_productivity_ranking(
    db: AsyncSession,
    date_from: date,
    date_to: date,
    stage: str | None = None
) -> list[WorkerRanking]:
    """
    Rank workers by pairs/hour (adjusted for quality).
    Effective pairs = pairs_completed × quality_pass_rate
    """
    pass

async def get_productivity_trend(
    db: AsyncSession,
    employee_id: UUID,
    days: int = 30
) -> list[DailyProductivity]:
    """Daily time-series of worker output for trend analysis."""
    pass
```

**Frontend:**

1. `/people/employees/{id}/productivity` - Individual worker dashboard with daily output, trend chart, ranking percentile
2. `/reports/productivity` - Team leaderboard with pairs/hour, quality-adjusted output, and trends
3. Manager view: "Pay Calculator" that sums piece-rate earnings per worker per pay period
4. Worker's own task screen: show "Today: 12 pairs completed, NPR 360 earned" motivational counter

---

## Improvement 6: Purchase Order Management with Supplier Lead-Time Tracking

### Problem

Materials are ordered informally (phone calls, WhatsApp). There's no record of what was ordered, when it should arrive, or which supplier delivers on time. Late deliveries cause production stops. Duplicate orders waste cash.

### Monetary Impact

- **Production stops from late materials:** 1 day stoppage/month at 100 pairs = 100 × NPR 300 margin = **NPR 30,000/month lost**
- **Over-ordering due to no PO tracking:** Estimated 5–10% excess inventory carrying cost on NPR 3,000,000 inventory = **NPR 12,500–25,000/month**
- **Supplier negotiation:** Tracking delivery performance enables switching to better suppliers or negotiating penalties. 5% cost reduction on NPR 500,000/month materials = **NPR 25,000/month**
- **Cash flow:** Knowing when payments are due prevents cash crunches
- **At scale:** Production stops become 10x more expensive = **NPR 300,000/month avoided**

### Implementation Specification

**Database changes:**

```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(20) NOT NULL UNIQUE, -- PO-2026-000001
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'draft', 
    -- draft, sent, confirmed, partially_received, received, cancelled
    order_date DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    delivery_on_time BOOLEAN GENERATED ALWAYS AS (
        CASE WHEN actual_delivery_date IS NOT NULL AND expected_delivery_date IS NOT NULL 
        THEN actual_delivery_date <= expected_delivery_date ELSE NULL END
    ) STORED,
    subtotal_npr DECIMAL(12,2),
    tax_npr DECIMAL(12,2) DEFAULT 0,
    total_npr DECIMAL(12,2),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id),
    quantity_ordered DECIMAL(12,3) NOT NULL,
    quantity_received DECIMAL(12,3) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    unit_price_npr DECIMAL(12,2) NOT NULL,
    total_price_npr DECIMAL(12,2) NOT NULL,
    notes TEXT
);

-- Supplier performance tracking (auto-calculated)
CREATE TABLE supplier_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_orders INTEGER NOT NULL DEFAULT 0,
    on_time_deliveries INTEGER NOT NULL DEFAULT 0,
    on_time_rate DECIMAL(5,2),
    avg_delivery_days INTEGER,
    total_spend_npr DECIMAL(14,2),
    quality_score DECIMAL(5,2), -- from defect_analytics
    overall_score DECIMAL(5,2), -- weighted composite
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(supplier_id, period_start, period_end)
);
```

**Backend service logic:**

```python
# app/modules/purchasing/service.py

async def create_purchase_order(
    db: AsyncSession,
    supplier_id: UUID,
    items: list[POItemCreate],
    user_id: UUID,
    expected_delivery_date: date | None = None
) -> PurchaseOrder:
    """
    Create PO with auto-generated PO number.
    If no expected_delivery_date, use supplier.lead_time_days from today.
    Calculate totals from items.
    """
    pass

async def receive_purchase_order(
    db: AsyncSession,
    po_id: UUID,
    items_received: list[POItemReceive],
    user_id: UUID
) -> ReceiveResult:
    """
    Record receipt of materials:
    1. Update PO item quantities received
    2. Create inventory_movements (type: 'received')
    3. Update material_price_history with actual price paid
    4. Mark PO as partially_received or received
    5. Record actual_delivery_date
    6. Calculate delivery_on_time
    7. If over-delivery or under-delivery, flag for review
    """
    pass

async def get_supplier_scorecard(
    db: AsyncSession,
    supplier_id: UUID
) -> SupplierScorecard:
    """
    Composite score:
    - On-time delivery rate (40% weight)
    - Quality score from defect data (30% weight)
    - Price competitiveness vs alternatives (20% weight)
    - Communication/responsiveness (10% weight, manual rating)
    """
    pass

async def get_overdue_deliveries(db: AsyncSession) -> list[OverduePO]:
    """POs where today > expected_delivery_date and status not received/cancelled."""
    pass
```

**Frontend:**

1. `/purchasing` - PO list with status filters, overdue highlighted in red
2. `/purchasing/new` - Create PO: select supplier → add materials with quantities and prices → set expected date
3. `/purchasing/{id}` - PO detail with receive action (partial or full)
4. `/suppliers/{id}` - Add scorecard tab with performance metrics
5. Dashboard: "Overdue Deliveries" alert with count and oldest overdue days

---

## Improvement 7: Finished Goods Dispatch & Customer Order Tracking

### Problem

After production and QC, there's no system to track which finished goods go to which customer, when they were dispatched, or what's pending. Orders and dispatch are tracked in WhatsApp/notebooks. This causes missed deliveries, double-shipments, and inability to promise delivery dates.

### Monetary Impact

- **Missed deliveries → lost customers:** Even 1 lost wholesale customer/quarter at NPR 200,000/order = **NPR 66,000/month lost revenue**
- **Double-shipments or wrong items:** 1 incident/month at NPR 30,000 average = **NPR 30,000/month**
- **Faster dispatch = faster payment:** Reducing dispatch-to-invoice time by 3 days on NPR 3,000,000 monthly revenue = **NPR 7,500/month in cash flow benefit** (at 10% cost of capital)
- **Accurate delivery promises:** Knowing exact finished goods stock by style/size/color enables instant order confirmation
- **At scale:** 5 wholesale customers lost/year at NPR 500,000 each = **NPR 2,500,000/year = NPR 208,000/month**

### Implementation Specification

**Database changes:**

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(20) NOT NULL UNIQUE, -- CUST-0001
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'wholesale', -- wholesale, retail, agent
    phone VARCHAR(20),
    email VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    credit_limit_npr DECIMAL(12,2),
    payment_terms_days INTEGER DEFAULT 30,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) NOT NULL UNIQUE, -- SO-2026-000001
    customer_id UUID NOT NULL REFERENCES customers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, confirmed, partially_dispatched, dispatched, delivered, cancelled
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    requested_delivery_date DATE,
    promised_delivery_date DATE,
    actual_dispatch_date DATE,
    subtotal_npr DECIMAL(12,2) NOT NULL,
    discount_npr DECIMAL(12,2) DEFAULT 0,
    tax_npr DECIMAL(12,2) DEFAULT 0,
    total_npr DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    style_id UUID NOT NULL REFERENCES product_styles(id),
    color VARCHAR(50),
    size VARCHAR(10),
    quantity_ordered INTEGER NOT NULL,
    quantity_dispatched INTEGER NOT NULL DEFAULT 0,
    unit_price_npr DECIMAL(10,2) NOT NULL,
    total_price_npr DECIMAL(12,2) NOT NULL
);

CREATE TABLE dispatch_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_number VARCHAR(20) NOT NULL UNIQUE, -- DSP-2026-000001
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id),
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dispatched_by UUID NOT NULL REFERENCES users(id),
    transport_method VARCHAR(50),
    tracking_number VARCHAR(100),
    notes TEXT,
    -- Items dispatched stored in dispatch_items
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES dispatch_records(id) ON DELETE CASCADE,
    sales_order_item_id UUID NOT NULL REFERENCES sales_order_items(id),
    style_id UUID NOT NULL REFERENCES product_styles(id),
    color VARCHAR(50),
    size VARCHAR(10),
    quantity INTEGER NOT NULL,
    -- Deducts from finished_goods_stock
    inventory_movement_id UUID REFERENCES inventory_movements(id)
);
```

**Backend service logic:**

```python
# app/modules/sales/service.py

async def create_sales_order(
    db: AsyncSession,
    customer_id: UUID,
    items: list[SOItemCreate],
    requested_delivery_date: date | None,
    user_id: UUID
) -> SalesOrder:
    """
    Create sales order and check finished goods availability.
    Flag items that don't have enough stock (need production).
    Auto-calculate promised delivery based on:
    - If in stock: 1-2 days
    - If needs production: average_lead_time + 2 days buffer
    """
    pass

async def dispatch_order(
    db: AsyncSession,
    sales_order_id: UUID,
    items: list[DispatchItemCreate],
    user_id: UUID
) -> DispatchRecord:
    """
    1. Verify finished goods stock available
    2. Create inventory_movements (type: 'dispatched') to deduct stock
    3. Create dispatch_record and dispatch_items
    4. Update sales_order_items.quantity_dispatched
    5. Update sales_order status
    6. Print packing slip / labels if needed
    """
    pass

async def get_pending_orders_summary(db: AsyncSession) -> PendingOrdersSummary:
    """
    Summary for dashboard:
    - Total pending orders count and value
    - Orders due this week
    - Overdue orders (past promised_delivery_date)
    - Stock availability for pending items
    """
    pass

async def get_customer_order_history(
    db: AsyncSession,
    customer_id: UUID
) -> CustomerHistory:
    """
    All orders with total spend, average order value, last order date,
    delivery satisfaction rate.
    """
    pass
```

**Frontend:**

1. `/customers` - Customer list with CRUD, total spend, last order
2. `/sales` - Sales orders list with status filters
3. `/sales/new` - Create order: select customer → add items (style/color/size/qty) → check stock → set delivery date
4. `/sales/{id}` - Order detail with dispatch action
5. `/dispatch` - Today's dispatch queue: orders to ship today
6. Dashboard: "Orders to Ship" widget, "Overdue Orders" alert

---

## Improvement 8: Daily Production Planning Board

### Problem

Managers create work orders but there's no visual "today's production plan" that shows: what styles to make, how many, what's the priority, and are materials ready? Planning happens in the manager's head or on paper.

### Monetary Impact

- **Changeover reduction:** Grouping same-style production reduces changeover time by 15–30 minutes/day. At 100 pairs/day, that's 2–4 extra pairs = **NPR 600–1,200/day = NPR 15,600–31,200/month**
- **Priority alignment:** Ensuring urgent customer orders are produced first avoids late penalties and lost customers
- **Worker clarity:** Workers waste 10–15 minutes/day waiting for instructions or doing wrong priority. 25 workers × 12 min × NPR 2.5/min = **NPR 750/day = NPR 19,500/month**
- **Material preparation:** Knowing tomorrow's plan today allows pre-staging materials, avoiding morning delays
- **At scale:** **NPR 500,000+/month** from efficiency gains

### Implementation Specification

**Database changes:**

```sql
CREATE TABLE daily_production_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_date DATE NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, confirmed, in_progress, completed
    target_pairs INTEGER NOT NULL,
    actual_pairs INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES daily_production_plans(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id),
    priority INTEGER NOT NULL DEFAULT 0, -- 1 = highest priority
    target_pairs INTEGER NOT NULL,
    actual_pairs INTEGER DEFAULT 0,
    materials_ready BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);
```

**Backend service logic:**

```python
# app/modules/production/planning_service.py

async def create_daily_plan(
    db: AsyncSession,
    plan_date: date,
    work_order_ids: list[UUID],
    user_id: UUID
) -> DailyProductionPlan:
    """
    Create plan for a date with ordered work orders.
    Auto-check material availability for each WO.
    Flag WOs where materials are not ready.
    """
    pass

async def get_today_plan(db: AsyncSession) -> DailyPlanView:
    """
    Today's plan with:
    - Target pairs total
    - Per-WO progress (actual vs target)
    - Material readiness per WO
    - Priority order
    - Current stage of each WO
    - Estimated completion time based on stage throughput data
    """
    pass

async def suggest_tomorrow_plan(db: AsyncSession) -> PlanSuggestion:
    """
    AI-assisted planning:
    - Pending sales orders by delivery date (priority)
    - Available finished goods (avoid overproduction)
    - Material availability (only plan what can be made)
    - Production capacity (based on historical throughput)
    - Changeover optimization (group same-style/same-material WOs)
    """
    pass

async def update_plan_progress(
    db: AsyncSession,
    plan_id: UUID,
    work_order_id: UUID,
    actual_pairs: int
) -> None:
    """Update actual pairs for a plan item. Called when WO stages complete."""
    pass
```

**Frontend:**

1. `/production/plan` - Visual plan board for today showing WOs in priority order with progress bars
2. `/production/plan/tomorrow` - Create/edit tomorrow's plan with drag-and-drop reordering
3. Each plan item shows: style name, target qty, materials status (green/red), current stage, progress %
4. Dashboard: "Today's Plan" prominent widget showing target vs actual with time-of-day progress curve
5. Mobile: Large touch-friendly cards that workers can tap to see their assigned WO details

---

## Improvement 9: Inventory Cycle Count & Accuracy Tracking

### Problem

Physical stock and system stock drift apart over time. Without regular cycle counts, Pailo discovers discrepancies only during production (stockout) or annual count (shock). Inventory accuracy directly impacts production planning reliability.

### Monetary Impact

- **Phantom stock causing production stops:** If system says 500 meters of leather available but actual is 350, a work order starts and stalls = 1 day lost production/month = **NPR 30,000/month**
- **Shrinkage/theft detection:** Regular counting detects losses early. Reducing shrinkage from 3% to 1% on NPR 3,000,000 inventory = **NPR 60,000/month saved**
- **Obsolescence prevention:** Identifying dead stock early for clearance vs full write-off. NPR 200,000 dead stock identified 3 months earlier × 50% recovery = **NPR 100,000 one-time + ongoing prevention**
- **Audit compliance:** Accurate records reduce year-end adjustment surprises
- **At scale:** Inventory value 5x higher = **NPR 450,000+/month impact**

### Implementation Specification

**Database changes:**

```sql
CREATE TABLE cycle_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    count_number VARCHAR(20) NOT NULL UNIQUE, -- CC-2026-000001
    count_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, approved
    count_type VARCHAR(20) NOT NULL, -- full, category, abc_class_a, random_sample
    category_filter VARCHAR(50), -- if counting specific category
    counted_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    total_items_counted INTEGER DEFAULT 0,
    discrepancies_found INTEGER DEFAULT 0,
    total_variance_npr DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cycle_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_count_id UUID NOT NULL REFERENCES cycle_counts(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id),
    system_quantity DECIMAL(12,3) NOT NULL, -- what system says
    counted_quantity DECIMAL(12,3), -- what was actually counted
    variance DECIMAL(12,3) GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
    variance_pct DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN system_quantity > 0 
        THEN ((counted_quantity - system_quantity) / system_quantity) * 100 
        ELSE NULL END
    ) STORED,
    unit_cost_npr DECIMAL(10,2), -- for calculating NPR impact
    variance_value_npr DECIMAL(12,2) GENERATED ALWAYS AS (
        (counted_quantity - system_quantity) * unit_cost_npr
    ) STORED,
    adjustment_approved BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- Inventory accuracy metric (tracked over time)
CREATE TABLE inventory_accuracy_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    measured_date DATE NOT NULL,
    items_counted INTEGER NOT NULL,
    items_accurate INTEGER NOT NULL, -- within acceptable tolerance (e.g., ±2%)
    accuracy_rate DECIMAL(5,2) NOT NULL, -- items_accurate / items_counted × 100
    total_variance_npr DECIMAL(12,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Backend service logic:**

```python
# app/modules/inventory/cycle_count_service.py

async def start_cycle_count(
    db: AsyncSession,
    count_type: str,
    category_filter: str | None,
    user_id: UUID
) -> CycleCount:
    """
    Create new cycle count and populate items to count.
    - full: all materials
    - category: materials in specific category
    - abc_class_a: top 20% materials by value (80% of inventory value)
    - random_sample: random 10-20% of materials
    
    Capture system_quantity at start time (snapshot).
    """
    pass

async def record_count(
    db: AsyncSession,
    count_id: UUID,
    item_id: UUID,
    counted_quantity: Decimal,
    notes: str | None
) -> CycleCountItem:
    """Record actual counted quantity for one item."""
    pass

async def approve_adjustments(
    db: AsyncSession,
    count_id: UUID,
    approved_items: list[UUID],
    approver_id: UUID
) -> AdjustmentResult:
    """
    Manager approves inventory adjustments:
    1. For each approved item, create inventory_movement (type: 'adjustment')
    2. Require reason (damage, theft, measurement_error, system_error)
    3. Update material on-hand quantities
    4. Log in audit trail
    5. Update inventory_accuracy_log
    """
    pass

async def get_inventory_accuracy_trend(
    db: AsyncSession,
    months: int = 6
) -> list[AccuracyDataPoint]:
    """Monthly accuracy rate trend. Target: >95% accuracy."""
    pass

async def suggest_count_schedule(db: AsyncSession) -> CountSchedule:
    """
    ABC analysis-based counting schedule:
    - Class A (top 20% by value): count monthly
    - Class B (next 30%): count quarterly  
    - Class C (bottom 50%): count semi-annually
    Returns list of materials due for counting this week.
    """
    pass
```

**Frontend:**

1. `/inventory/cycle-count` - Start new count, view history
2. `/inventory/cycle-count/{id}` - Mobile-optimized counting screen: show material name, unit, bin location → large number input for counted qty
3. `/inventory/cycle-count/{id}/review` - Manager review with variances highlighted, approve/reject per item
4. `/reports/inventory-accuracy` - Accuracy trend chart, items with frequent variances
5. Dashboard: "Inventory Accuracy" gauge (target >95%) and "Counts Due" reminder

---

## Improvement 10: WhatsApp-Integrated Daily Reports & Alerts

### Problem

The WhatsApp module exists but only sends task notifications. Managers and owners often check WhatsApp before opening the app. Key business alerts (stockouts, overdue orders, production behind schedule, large cost variances) should proactively reach decision-makers.

### Monetary Impact

- **Faster response to stockouts:** 2-hour earlier alert = production continues instead of stopping = **NPR 5,000–15,000/incident saved** (multiple/month)
- **Overdue delivery catch:** Alert when an order is approaching due date without dispatch = prevents customer complaints
- **Daily summary reduces app dependency:** Owner stays informed even when not opening app, makes better decisions faster
- **End-of-day automatic report:** Eliminates 15 min/day of manual reporting by manager = **NPR 5,850/month**
- **Critical alerts (machine down, QC fail rate spike, material shortage):** Each early intervention saves NPR 10,000–50,000

### Implementation Specification

**Backend service logic:**

```python
# app/modules/whatsapp/report_service.py

async def send_daily_morning_brief(db: AsyncSession) -> None:
    """
    Send to owner/manager at 7:00 AM:
    
    📊 *Pailo Daily Brief - {date}*
    
    Yesterday: {pairs_completed}/{pairs_planned} pairs ({pct}%)
    Today's Plan: {today_target} pairs, {wo_count} work orders
    
    ⚠️ Alerts:
    - Low stock: {material_name} ({days_remaining} days left)
    - Overdue order: {order_number} for {customer} (due {date})
    - {blocked_tasks} tasks blocked
    
    📈 Week trend: {weekly_output} pairs ({trend_direction})
    """
    pass

async def send_daily_evening_summary(db: AsyncSession) -> None:
    """
    Send to owner/manager at 6:30 PM:
    
    📋 *End of Day Report - {date}*
    
    ✅ Completed: {pairs_completed}/{pairs_planned} pairs
    🔧 Rework: {rework_pairs} pairs
    ❌ Rejected: {rejected_pairs} pairs
    📦 Dispatched: {dispatched_pairs} pairs to {customer_count} customers
    
    💰 Est. revenue today: NPR {daily_revenue}
    📊 Defect rate: {defect_pct}%
    
    Tomorrow: {tomorrow_target} pairs planned
    Materials needed: {materials_to_issue}
    """
    pass

async def send_critical_alert(
    db: AsyncSession,
    alert_type: str,
    details: dict
) -> None:
    """
    Immediate alerts for:
    - stockout_imminent: material will run out within today's production
    - qc_fail_spike: defect rate > 10% in last hour
    - machine_down: production stage stopped (from task blocked with machine reason)
    - large_cost_variance: WO actual cost > 20% over estimate
    - order_deadline_tomorrow: unshipped order due tomorrow
    """
    pass

# Scheduled job configuration
SCHEDULED_REPORTS = {
    "daily_morning_brief": {"cron": "0 7 * * 1-6", "recipients": ["owner", "factory_manager"]},
    "daily_evening_summary": {"cron": "30 18 * * 1-6", "recipients": ["owner", "factory_manager"]},
    "weekly_summary": {"cron": "0 9 * * 0", "recipients": ["owner"]},
}
```

**Implementation notes:**

- Use existing WhatsApp module infrastructure (`app/modules/whatsapp/`)
- Add a simple scheduler (APScheduler or background task on startup)
- Template messages must be pre-approved in WhatsApp Business API
- Fallback: store reports in-app if WhatsApp delivery fails
- Owner should be able to toggle which alerts they receive in Settings

---

## Summary: Prioritized Improvement Roadmap

| # | Improvement | Monthly Impact (NPR) | Monthly Impact (USD) | Effort | Priority |
|---|---|---|---|---|---|
| 1 | Material Reservation & Auto-Purchase Alerts | 30,000–60,000 | $220–440 | Medium | 🔴 Critical |
| 2 | BOM Cost Tracking & Variance Analysis | 150,000–400,000 | $1,100–2,900 | Medium | 🔴 Critical |
| 3 | Stage Time Tracking & Bottleneck Detection | 78,000–156,000 | $570–1,150 | Medium | 🔴 Critical |
| 4 | Defect-Driven Rework Automation | 62,000–98,000 | $450–720 | Low | 🟡 High |
| 5 | Worker Piece-Rate & Productivity | 78,000–97,000 | $570–710 | Medium | 🟡 High |
| 6 | Purchase Order Management | 55,000–85,000 | $400–620 | Medium | 🟡 High |
| 7 | Sales Orders & Dispatch Tracking | 96,000–238,000 | $700–1,750 | High | 🟡 High |
| 8 | Daily Production Planning Board | 35,000–50,000 | $260–370 | Low | 🟢 Medium |
| 9 | Inventory Cycle Count & Accuracy | 90,000–160,000 | $660–1,170 | Medium | 🟢 Medium |
| 10 | WhatsApp Daily Reports & Alerts | 20,000–50,000 | $150–370 | Low | 🟢 Medium |

**Total estimated monthly impact at current scale (100 pairs/day): NPR 694,000–1,394,000 ($5,100–10,200 USD)**

**At target scale (1,000 pairs/day): NPR 5,000,000–12,000,000/month ($37,000–88,000 USD)**

---

## Implementation Order Recommendation

### Phase A: Foundation (Weeks 1–4)
1. **Material Reservation** (#1) - Prevents production stops immediately
2. **Purchase Orders** (#6) - Formalizes ordering, enables tracking
3. **WhatsApp Reports** (#10) - Quick win, uses existing infrastructure

### Phase B: Cost Control (Weeks 5–8)
4. **BOM Cost Tracking** (#2) - Reveals margin erosion
5. **Defect Rework Automation** (#4) - Reduces quality cost
6. **Stage Time Tracking** (#3) - Identifies bottlenecks

### Phase C: Revenue & Productivity (Weeks 9–14)
7. **Daily Production Planning** (#8) - Optimizes daily execution
8. **Worker Productivity** (#5) - Drives output per worker
9. **Cycle Counts** (#9) - Ensures inventory accuracy

### Phase D: Sales Growth (Weeks 15–20)
10. **Sales & Dispatch** (#7) - Captures revenue side, enables customer tracking

---

## Cross-Cutting Implementation Notes

### Shared Patterns

All improvements should follow these patterns already established in the codebase:

1. **Database:** Alembic migrations, UUID PKs, human-readable codes, UTC timestamps, soft-delete where appropriate, `version` field for optimistic concurrency
2. **Backend:** FastAPI routes under `/api/v1/`, Pydantic v2 schemas, async SQLAlchemy service functions, role-based permissions, audit logging for important mutations
3. **Frontend:** Next.js App Router pages, TanStack Query for data fetching (migrate from raw fetch), shadcn/ui components, Sonner toasts, mobile-first responsive design, loading/error/empty states
4. **Mobile UX:** Large touch targets (48px minimum), big number inputs for quantities, dropdown selectors over free text where possible, offline-tolerant form submission with retry
5. **Reporting:** Recharts for visualizations, CSV export option, date range filters, comparison periods

### Integration Points

- Material reservation hooks into work order creation (existing module)
- Stage time tracking hooks into task status updates (existing module)
- Defect rework hooks into quality inspection flow (existing module)
- Purchase orders extend supplier module (existing)
- Dispatch extends inventory movements (existing)
- WhatsApp reports query all reporting endpoints (existing)
- Production planning combines work orders + inventory + sales data

### Data Flow

```
Sales Orders → Production Planning → Work Orders → Material Reservation
     ↓                                    ↓              ↓
Customer         Stage Time          Inventory    Purchase Orders
Dispatch ←       Tracking ←         Movements ←      ↓
     ↓              ↓                   ↓         Supplier
Revenue         Bottleneck          Cycle Count   Performance
Reports         Reports             & Accuracy    Scorecard
     ↓              ↓                   ↓              ↓
            Cost Variance Report (BOM actual vs estimated)
                         ↓
              Owner Dashboard & WhatsApp Reports
```

### Success Metrics

After implementing all improvements, measure:

1. **Production efficiency:** Pairs/day per worker increases >15%
2. **Material stockout incidents:** Drops from ~3/week to <1/month
3. **Defect rate:** Drops from ~5% to <3%
4. **Cost variance:** Actual within 5% of estimated for 90% of WOs
5. **Delivery on-time rate:** >95% of customer orders shipped on/before promised date
6. **Inventory accuracy:** >97% accuracy in cycle counts
7. **Supplier on-time rate:** Tracked and improving quarter-over-quarter
8. **Cash cycle:** Order-to-cash time reduced by 3–5 days
9. **Manager decision time:** Critical alerts acted on within 1 hour vs next morning
10. **Scaling readiness:** Can handle 500 pairs/day without adding admin overhead
