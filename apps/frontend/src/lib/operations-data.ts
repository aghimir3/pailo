import {
  getOperationsCatalog,
  listMyTasks,
  listQualityInspections,
  listTasks,
  previewLabelSheet,
  type LabelPreviewResponse,
  type OperationsCatalogResponse,
  type QualityInspectionRecord,
  type TaskRecord,
} from "@pailo/api-client";

export type Tone = "neutral" | "green" | "amber" | "red" | "cyan";

export type OperationsData = {
  catalog: OperationsCatalogResponse;
  tasks: TaskRecord[];
  myTasks: TaskRecord[];
  qualityInspections: QualityInspectionRecord[];
  labelPreview: LabelPreviewResponse;
};

const fallbackTemplateId = "a0000000-0000-4000-8000-000000000001";

export async function loadOperationsData(): Promise<OperationsData> {
  try {
    const catalog = await getOperationsCatalog();
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

export function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export function taskTone(status: string): Tone {
  if (status === "blocked") return "red";
  if (status === "waiting_for_review") return "cyan";
  if (status === "ready") return "amber";
  if (status === "done") return "green";
  return "neutral";
}

export function priorityTone(priority: string): Tone {
  if (priority === "urgent" || priority === "high") return "red";
  if (priority === "medium") return "amber";
  return "neutral";
}

export function riskTone(risk: string): Tone {
  if (risk === "Healthy") return "green";
  if (risk.startsWith("Near")) return "amber";
  return "red";
}

export function percent(completed: number, planned: number) {
  if (planned === 0) return 0;
  return Math.round((completed / planned) * 100);
}

export function numberLabel(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "0";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return new Intl.NumberFormat("en-NP").format(numeric);
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export function groupTasks(tasks: TaskRecord[]) {
  const statuses = ["ready", "in_progress", "blocked", "waiting_for_review", "done"];
  return statuses.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status),
  }));
}

export function operationsTotals(data: OperationsData) {
  const plannedPairs = data.catalog.work_orders.reduce((total, order) => total + order.planned_pairs, 0);
  const completedPairs = data.catalog.work_orders.reduce((total, order) => total + order.completed_pairs, 0);
  const blockedCount = data.tasks.filter((task) => task.status === "blocked").length;
  const reviewCount = data.tasks.filter((task) => task.status === "waiting_for_review").length;
  const lowStockCount = data.catalog.materials.filter((material) => material.risk !== "Healthy").length;
  return { plannedPairs, completedPairs, blockedCount, reviewCount, lowStockCount };
}

export function taskProgressWidth(task: TaskRecord) {
  return `${Math.min(100, percent(Number(task.completed_quantity), Number(task.estimated_quantity ?? 0)))}%`;
}

const fallbackData: OperationsData = {
  catalog: {
    users: [
      { id: "20000000-0000-4000-8000-000000000001", display_name: "Asha", email: "owner@pailoshoes.com", role: "owner_admin" },
      { id: "20000000-0000-4000-8000-000000000002", display_name: "Milan", email: "milan@pailoshoes.com", role: "factory_manager" },
      { id: "20000000-0000-4000-8000-000000000003", display_name: "Ram", email: "ram.pailo@gmail.com", role: "worker" },
    ],
    employees: [
      { id: "10000000-0000-4000-8000-000000000001", employee_code: "EMP-0001", full_name: "Asha Gurung", department: "Management", job_title: "Owner Admin" },
      { id: "10000000-0000-4000-8000-000000000002", employee_code: "EMP-0002", full_name: "Milan Shrestha", department: "Production", job_title: "Factory Manager" },
      { id: "10000000-0000-4000-8000-000000000003", employee_code: "EMP-0003", full_name: "Ram BK", department: "Cutting", job_title: "Cutting Worker" },
    ],
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