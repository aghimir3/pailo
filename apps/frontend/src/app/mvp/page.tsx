import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileDown,
  MessageSquare,
  PackageCheck,
  Printer,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import {
  getMvpCatalog,
  listMyTasks,
  listQualityInspections,
  listTasks,
  previewLabelSheet,
  type LabelPreviewResponse,
  type MvpCatalogResponse,
  type QualityInspectionRecord,
  type TaskRecord,
} from "@pailo/api-client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";

type MvpData = {
  catalog: MvpCatalogResponse;
  tasks: TaskRecord[];
  myTasks: TaskRecord[];
  qualityInspections: QualityInspectionRecord[];
  labelPreview: LabelPreviewResponse;
};

const fallbackTemplateId = "a0000000-0000-4000-8000-000000000001";
const jumpItems = [
  { href: "#tasks", label: "Tasks", icon: ClipboardList },
  { href: "#work-orders", label: "Work orders", icon: Factory },
  { href: "#inventory", label: "Inventory", icon: Boxes },
  { href: "#qc", label: "QC", icon: ShieldCheck },
  { href: "#labels", label: "Labels", icon: Printer },
  { href: "#admin", label: "Admin", icon: Users },
];

async function loadMvpData(): Promise<MvpData> {
  try {
    const catalog = await getMvpCatalog();
    const [tasks, myTasks, qualityInspections] = await Promise.all([
      listTasks(),
      listMyTasks(),
      listQualityInspections(),
    ]);
    const template = catalog.label_templates[0];
    const labelPreview = template
      ? await previewLabelSheet(template.id, {
          quantity: 25,
          art_no: catalog.styles[1]?.style_code ?? "PAI-2026-SCH-001",
          colour: "White",
          size: "39",
          mrp_npr: "1899",
          manufactured_by: "Pailo Shoes",
          origin_text: "Made in Nepal",
        })
      : fallbackData.labelPreview;
    return { catalog, tasks, myTasks, qualityInspections, labelPreview };
  } catch {
    return fallbackData;
  }
}

function taskTone(status: string) {
  if (status === "blocked") return "red";
  if (status === "waiting_for_review") return "cyan";
  if (status === "ready") return "amber";
  if (status === "done") return "green";
  return "neutral";
}

function priorityTone(priority: string) {
  if (priority === "urgent" || priority === "high") return "red";
  if (priority === "medium") return "amber";
  return "neutral";
}

function percent(completed: number, planned: number) {
  if (planned === 0) return 0;
  return Math.round((completed / planned) * 100);
}

function numberLabel(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "0";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return new Intl.NumberFormat("en-NP").format(numeric);
}

function shortDate(value: string | null | undefined) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function groupTasks(tasks: TaskRecord[]) {
  const statuses = ["ready", "in_progress", "blocked", "waiting_for_review", "done"];
  return statuses.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status),
  }));
}

export default async function MvpConsole() {
  const data = await loadMvpData();
  const activePairs = data.catalog.work_orders.reduce((total, order) => total + order.planned_pairs, 0);
  const completedPairs = data.catalog.work_orders.reduce((total, order) => total + order.completed_pairs, 0);
  const blockedCount = data.tasks.filter((task) => task.status === "blocked").length;
  const reviewCount = data.tasks.filter((task) => task.status === "waiting_for_review").length;

  return (
    <main className="mvp-shell">
      <header className="mvp-topbar">
        <div className="mvp-title-block">
          <Button asChild size="sm" variant="glass">
            <Link href="/">
              <ArrowLeft aria-hidden="true" size={16} />
              Dashboard
            </Link>
          </Button>
          <div>
            <p className="eyebrow">Pailo MVP</p>
            <h1>Factory operating system</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <Button asChild>
            <a href="http://127.0.0.1:8000/docs">
              <Sparkles aria-hidden="true" size={18} />
              API docs
            </a>
          </Button>
        </div>
      </header>

      <nav className="mvp-jumpbar" aria-label="MVP workflow navigation">
        {jumpItems.map(({ href, icon: Icon, label }) => (
          <a href={href} key={href}>
            <Icon aria-hidden="true" size={17} />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <section className="mvp-hero">
        <GlassCard className="mvp-hero-card">
          <div>
            <p className="eyebrow">Live batch control</p>
            <h2>Run the first production batch end to end</h2>
            <p>
              Style setup, work orders, task assignment, comments, inventory risk, QC, Sticker 42 labels,
              people, suppliers, and owner exports are now in one operating console.
            </p>
          </div>
          <div className="mvp-hero-meter" aria-label={`${percent(completedPairs, activePairs)} percent complete`}>
            <strong>{percent(completedPairs, activePairs)}%</strong>
            <span>{completedPairs} of {activePairs} pairs complete</span>
          </div>
        </GlassCard>

        <section className="mvp-stat-grid" aria-label="MVP status">
          <div className="mvp-stat tone-cyan"><span>Styles</span><strong>{data.catalog.styles.length}</strong></div>
          <div className="mvp-stat tone-green"><span>Work orders</span><strong>{data.catalog.work_orders.length}</strong></div>
          <div className="mvp-stat tone-amber"><span>Review queue</span><strong>{reviewCount}</strong></div>
          <div className="mvp-stat tone-red"><span>Blocked</span><strong>{blockedCount}</strong></div>
        </section>
      </section>

      <section className="mvp-grid" id="tasks">
        <GlassCard className="mvp-panel mvp-panel-wide">
          <PanelHeader>
            <div>
              <p className="eyebrow">Task board</p>
              <h2>Production, inventory, and QC work</h2>
            </div>
            <ClipboardList aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="task-board-grid">
            {groupTasks(data.tasks).map((column) => (
              <section className="task-column" key={column.status}>
                <div className="task-column-head">
                  <span>{column.status.replaceAll("_", " ")}</span>
                  <Badge tone={column.tasks.length ? taskTone(column.status) : "neutral"}>{column.tasks.length}</Badge>
                </div>
                {column.tasks.map((task) => (
                  <article className="mvp-task-row" key={task.id}>
                    <div className="mvp-row-head">
                      <Badge tone={taskTone(task.status)}>{task.status.replaceAll("_", " ")}</Badge>
                      <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                    </div>
                    <h3>{task.title}</h3>
                    <p>{task.work_order_code ?? "General"} / {task.assignee?.display_name ?? "Unassigned"}</p>
                    <div className="quantity-track">
                      <span style={{ width: `${Math.min(100, percent(Number(task.completed_quantity), Number(task.estimated_quantity ?? 0)))}%` }} />
                    </div>
                    <div className="compact-meta">
                      <span>{numberLabel(task.completed_quantity)} / {numberLabel(task.estimated_quantity)} {task.unit_of_measure ?? ""}</span>
                      <span>{shortDate(task.due_at)}</span>
                    </div>
                    {task.blocked_reason ? <p className="mvp-warning"><AlertTriangle aria-hidden="true" size={15} />{task.blocked_reason}</p> : null}
                    <div className="comment-stack">
                      {task.comments?.slice(0, 2).map((comment) => (
                        <p key={comment.id}><MessageSquare aria-hidden="true" size={14} />{comment.author_name}: {comment.comment_text}</p>
                      ))}
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="mvp-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Worker phone view</p>
              <h2>My Tasks</h2>
            </div>
            <CheckCircle2 aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="phone-task-list">
            {data.myTasks.map((task) => (
              <section className="phone-task" key={task.id}>
                <div className="mvp-row-head">
                  <Badge tone={taskTone(task.status)}>{task.status.replaceAll("_", " ")}</Badge>
                  <span>{task.work_order_code}</span>
                </div>
                <h3>{task.title}</h3>
                <div className="quick-form-grid">
                  <select aria-label="Task status" defaultValue={task.status}>
                    <option value="ready">Ready</option>
                    <option value="in_progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="waiting_for_review">Review</option>
                  </select>
                  <input aria-label="Completed quantity" defaultValue={task.completed_quantity} inputMode="decimal" />
                </div>
                <textarea aria-label="Task note" defaultValue={task.comments?.[0]?.comment_text ?? ""} rows={3} />
                <div className="mvp-button-row">
                  <Button size="sm" type="button" variant="glass">Start</Button>
                  <Button size="sm" type="button" variant="glass">Block</Button>
                  <Button size="sm" type="button">Send</Button>
                </div>
              </section>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="mvp-grid" id="work-orders">
        <GlassCard className="mvp-panel mvp-panel-wide">
          <PanelHeader>
            <div>
              <p className="eyebrow">Work orders</p>
              <h2>Batch progress and size lines</h2>
            </div>
            <PackageCheck aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="work-order-matrix">
            {data.catalog.work_orders.map((order) => (
              <section className="mvp-order" key={order.id}>
                <div className="mvp-row-head">
                  <strong>{order.work_order_code}</strong>
                  <Badge tone={order.blocker ? "red" : "green"}>{order.status}</Badge>
                </div>
                <h3>{order.style_name}</h3>
                <p>{order.current_stage ?? "Planning"} / Due {shortDate(order.due_date)}</p>
                <div className="quantity-track"><span style={{ width: `${percent(order.completed_pairs, order.planned_pairs)}%` }} /></div>
                <div className="size-line-grid">
                  {order.size_lines?.map((line) => (
                    <div key={line.id}>
                      <span>{line.color} {line.size}</span>
                      <strong>{line.completed_pairs}/{line.planned_pairs}</strong>
                    </div>
                  ))}
                </div>
                {order.blocker ? <p className="mvp-warning"><AlertTriangle aria-hidden="true" size={15} />{order.blocker}</p> : null}
              </section>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="mvp-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Styles and BOM</p>
              <h2>Approved factory products</h2>
            </div>
            <Factory aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="simple-list">
            {data.catalog.styles.map((style) => (
              <div className="simple-row" key={style.id}>
                <div><strong>{style.style_code}</strong><span>{style.name}</span></div>
                <Badge tone="cyan">NPR {numberLabel(style.target_cost_npr)}</Badge>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="mvp-grid" id="inventory">
        <GlassCard className="mvp-panel mvp-panel-wide">
          <PanelHeader>
            <div>
              <p className="eyebrow">Inventory truth</p>
              <h2>Materials, stock risk, and movement actions</h2>
            </div>
            <Boxes aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="inventory-table">
            {data.catalog.materials.map((material) => (
              <div className="inventory-line" key={material.id}>
                <div><strong>{material.name}</strong><span>{material.material_code} / {material.supplier ?? "No supplier"}</span></div>
                <div><strong>{numberLabel(material.current_quantity)} {material.unit_of_measure}</strong><span>Min {numberLabel(material.minimum_stock)}</span></div>
                <Badge tone={material.risk === "Healthy" ? "green" : "red"}>{material.risk}</Badge>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="mvp-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Purchasing</p>
              <h2>Supplier follow-up</h2>
            </div>
            <Truck aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="simple-list">
            {data.catalog.suppliers.map((supplier) => (
              <div className="simple-row" key={supplier.id}>
                <div><strong>{supplier.name}</strong><span>{supplier.phone ?? "No phone"}</span></div>
                <Badge tone="neutral">{supplier.usual_lead_time_days ?? 0}d</Badge>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="mvp-grid" id="qc">
        <GlassCard className="mvp-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Quality gate</p>
              <h2>Inspections and rework</h2>
            </div>
            <ShieldCheck aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="simple-list">
            {data.qualityInspections.map((inspection) => (
              <div className="qc-row" key={inspection.id}>
                <div className="mvp-row-head">
                  <strong>{inspection.inspection_code}</strong>
                  <Badge tone={inspection.defect_quantity ? "amber" : "green"}>{inspection.status}</Badge>
                </div>
                <p>{inspection.work_order_code} / {inspection.style_code}</p>
                <div className="compact-meta"><span>{inspection.inspected_quantity} inspected</span><span>{inspection.defect_quantity} defects</span></div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="mvp-panel" id="labels">
          <PanelHeader>
            <div>
              <p className="eyebrow">Sticker 42</p>
              <h2>24-up A4 label preview</h2>
            </div>
            <Printer aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="label-editor-grid">
            <label>Art No.<input defaultValue={data.labelPreview.values.art_no} /></label>
            <label>Colour<input defaultValue={data.labelPreview.values.colour} /></label>
            <label>Size<input defaultValue={data.labelPreview.values.size} /></label>
            <label>MRP<input defaultValue={String(data.labelPreview.values.mrp_npr)} /></label>
          </div>
          <div className="label-sheet" aria-label="Sticker 42 sheet preview">
            {Array.from({ length: data.labelPreview.template.slots_per_page }).map((_, index) => {
              const filled = index < data.labelPreview.slots.length;
              return (
                <div className={filled ? "label-slot filled" : "label-slot"} key={index}>
                  {filled ? <><strong>Pailo</strong><span>{data.labelPreview.values.art_no}</span><span>{data.labelPreview.values.size}</span></> : null}
                </div>
              );
            })}
          </div>
          <p className="sheet-meta">{data.labelPreview.page_count} pages for {data.labelPreview.slots.length} labels</p>
        </GlassCard>
      </section>

      <section className="mvp-grid" id="admin">
        <GlassCard className="mvp-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">People and roles</p>
              <h2>Invite-only app users</h2>
            </div>
            <Users aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="people-grid">
            {data.catalog.users.map((user) => (
              <div className="person-row" key={user.id}>
                <div><strong>{user.display_name}</strong><span>{user.email ?? "No email"}</span></div>
                <Badge tone={user.role === "owner_admin" ? "cyan" : "neutral"}>{user.role.replaceAll("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="mvp-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Reports</p>
              <h2>Owner exports</h2>
            </div>
            <FileDown aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="report-actions">
            <Button asChild variant="glass"><a href="http://127.0.0.1:8000/api/v1/reports/tasks.csv">Task CSV</a></Button>
            <Button asChild variant="glass"><a href="http://127.0.0.1:8000/api/v1/reports/low-stock.csv">Low-stock CSV</a></Button>
            <Button asChild><a href="http://127.0.0.1:8000/api/v1/reports/dashboard">Dashboard JSON</a></Button>
          </div>
        </GlassCard>
      </section>
    </main>
  );
}

const fallbackData: MvpData = {
  catalog: {
    users: [
      { id: "20000000-0000-4000-8000-000000000001", display_name: "Asha", email: "owner@pailoshoes.com", role: "owner_admin" },
      { id: "20000000-0000-4000-8000-000000000002", display_name: "Milan", email: "milan@pailoshoes.com", role: "factory_manager" },
      { id: "20000000-0000-4000-8000-000000000003", display_name: "Ram", email: "ram.pailo@gmail.com", role: "worker" },
    ],
    employees: [],
    styles: [
      { id: "40000000-0000-4000-8000-000000000001", style_code: "PAI-2026-SNK-001", name: "Pailo City Runner", category: "Sneaker", sample_status: "approved", target_cost_npr: "900", target_mrp_npr: "2499", notes: null },
      { id: "40000000-0000-4000-8000-000000000002", style_code: "PAI-2026-SCH-001", name: "Pailo School Classic", category: "School shoe", sample_status: "approved", target_cost_npr: "760", target_mrp_npr: "1899", notes: null },
    ],
    suppliers: [
      { id: "30000000-0000-4000-8000-000000000001", supplier_code: "SUP-0001", name: "Kathmandu Threads", contact_person: "Bikash", phone: "+977-9811111111", material_categories: ["thread"], usual_lead_time_days: 2, notes: null },
      { id: "30000000-0000-4000-8000-000000000002", supplier_code: "SUP-0002", name: "Birat Sole Works", contact_person: "Prakash", phone: "+977-9822222222", material_categories: ["outsole"], usual_lead_time_days: 5, notes: null },
    ],
    materials: [
      { id: "50000000-0000-4000-8000-000000000001", material_code: "MAT-THR-BLK", name: "Black thread", category: "thread", unit_of_measure: "rolls", supplier: "Kathmandu Threads", current_quantity: "2", minimum_stock: "8", average_cost_npr: "120", location: "Rack B2", risk: "Below minimum and can block production" },
      { id: "50000000-0000-4000-8000-000000000002", material_code: "MAT-OUT-TR42", name: "TR outsole size 42", category: "outsole", unit_of_measure: "pairs", supplier: "Birat Sole Works", current_quantity: "18", minimum_stock: "40", average_cost_npr: "330", location: "Rack C4", risk: "Below minimum and can block production" },
    ],
    work_orders: [
      { id: "60000000-0000-4000-8000-000000000001", work_order_code: "WO-2026-000001", style_code: "PAI-2026-SNK-001", style_name: "Pailo City Runner", status: "in_progress", priority: "high", planned_pairs: 120, completed_pairs: 86, current_stage: "Stitching", due_date: "2026-05-02", cost_snapshot_npr: "934", version: 1, blocker: "Delivery not confirmed", size_lines: [{ id: "61000000-0000-4000-8000-000000000001", color: "Black", size: "40", planned_pairs: 60, completed_pairs: 44 }] },
    ],
    label_templates: [
      { id: fallbackTemplateId, template_code: "STICKER-42", name: "Sticker 42 24-up A4", version: 1, status: "approved", page_width_mm: "210", page_height_mm: "297", label_width_mm: "63.5", label_height_mm: "33.9", margin_top_mm: "12.5", margin_left_mm: "7.25", gap_x_mm: "3.2", gap_y_mm: "1.6", slots_per_page: 24, columns: 3, rows: 8, fill_order: "row_major", design_json: {} },
    ],
  },
  tasks: [
    { id: "80000000-0000-4000-8000-000000000001", task_code: "TASK-2026-000041", title: "Cut upper material for City Runner", description: null, status: "in_progress", priority: "high", assignee: { id: "20000000-0000-4000-8000-000000000003", display_name: "Ram", email: "ram.pailo@gmail.com", role: "worker" }, assigned_employee: null, assigned_team: "Cutting", work_order_id: "60000000-0000-4000-8000-000000000001", work_order_code: "WO-2026-000001", product_style_code: "PAI-2026-SNK-001", due_at: "2026-05-02T13:00:00Z", estimated_quantity: "120", completed_quantity: "86", unit_of_measure: "pairs", blocked_reason: null, requires_review: false, started_at: null, completed_at: null, reviewed_at: null, version: 1, comments: [{ id: "82000000-0000-4000-8000-000000000001", task_id: "80000000-0000-4000-8000-000000000001", author_user_id: "20000000-0000-4000-8000-000000000003", author_name: "Ram", comment_text: "Cutting is moving, but thread stock needs attention before stitching.", client_message_id: "seed-ram-001", created_at: "2026-05-02T09:30:00Z", updated_at: "2026-05-02T09:30:00Z", edited_at: null, version: 1 }] },
    { id: "80000000-0000-4000-8000-000000000003", task_code: "TASK-2026-000043", title: "Call outsole supplier", description: null, status: "blocked", priority: "urgent", assignee: { id: "20000000-0000-4000-8000-000000000002", display_name: "Milan", email: "milan@pailoshoes.com", role: "factory_manager" }, assigned_employee: null, assigned_team: "Management", work_order_id: "60000000-0000-4000-8000-000000000001", work_order_code: "WO-2026-000001", product_style_code: "PAI-2026-SNK-001", due_at: "2026-05-02T09:30:00Z", estimated_quantity: "40", completed_quantity: "0", unit_of_measure: "pairs", blocked_reason: "Delivery not confirmed", requires_review: false, started_at: null, completed_at: null, reviewed_at: null, version: 1, comments: [] },
  ],
  myTasks: [],
  qualityInspections: [
    { id: "90000000-0000-4000-8000-000000000001", inspection_code: "QC-2026-000001", work_order_code: "WO-2026-000002", style_code: "PAI-2026-SCH-001", inspected_by: "Sita", inspected_at: "2026-05-02T10:00:00Z", inspected_quantity: 40, defect_quantity: 7, status: "rework_required", notes: "Glue marks found." },
  ],
  labelPreview: {
    template: { id: fallbackTemplateId, template_code: "STICKER-42", name: "Sticker 42 24-up A4", version: 1, status: "approved", page_width_mm: "210", page_height_mm: "297", label_width_mm: "63.5", label_height_mm: "33.9", margin_top_mm: "12.5", margin_left_mm: "7.25", gap_x_mm: "3.2", gap_y_mm: "1.6", slots_per_page: 24, columns: 3, rows: 8, fill_order: "row_major", design_json: {} },
    page_count: 2,
    slots: Array.from({ length: 25 }).map((_, index) => ({ page: index < 24 ? 1 : 2, slot: (index % 24) + 1, row: Math.floor((index % 24) / 3) + 1, column: (index % 3) + 1, x_mm: "0", y_mm: "0", width_mm: "63.5", height_mm: "33.9" })),
    values: { quantity: 25, art_no: "PAI-2026-SCH-001", colour: "White", size: "39", mrp_npr: "1899", manufactured_by: "Pailo Shoes", origin_text: "Made in Nepal" },
  },
};

fallbackData.myTasks = fallbackData.tasks.filter((task) => task.assignee?.display_name === "Ram");