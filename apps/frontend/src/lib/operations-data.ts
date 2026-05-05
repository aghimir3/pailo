import {
  getOperationsCatalog,
  listSavedLabels,
  listMyTasks,
  listQualityInspections,
  listTasks,
  previewLabelSheet,
  type LabelPreviewResponse,
  type OperationsCatalogResponse,
  type QualityInspectionRecord,
  type SavedLabelRecord,
  type TaskRecord,
} from "@pailo/api-client";

export type Tone = "neutral" | "green" | "amber" | "red" | "cyan";

export type OperationsData = {
  catalog: OperationsCatalogResponse;
  tasks: TaskRecord[];
  myTasks: TaskRecord[];
  qualityInspections: QualityInspectionRecord[];
  labelPreview: LabelPreviewResponse;
  savedLabels: SavedLabelRecord[];
};

const fallbackTemplateId = "a0000000-0000-4000-8000-000000000001";
const defaultLabelArtNo = "AFL 02";

const fallbackLabelTemplate: OperationsCatalogResponse["label_templates"][number] = {
  id: fallbackTemplateId,
  template_code: "A4-24-LABEL",
  name: "24-up A4 label template",
  version: 1,
  status: "approved",
  page_width_mm: "210",
  page_height_mm: "297",
  label_width_mm: "63.50",
  label_height_mm: "33.87",
  margin_top_mm: "13.09",
  margin_left_mm: "7.20",
  gap_x_mm: "2.54",
  gap_y_mm: "0.00",
  slots_per_page: 24,
  columns: 3,
  rows: 8,
  fill_order: "row_major",
  design_json: {
    measured_geometry_mm: {
      border_left: 7.2,
      border_top: 13.09,
      text_table_left: 8.73,
      text_table_top: 13.41,
      text_table_inset_x: 1.53,
      text_table_inset_y: 0.32,
      horizontal_gutter: 2.54,
      vertical_gutter: 0,
      border_line_weight_pt: 0.25,
      border_color: "#BFBFBF",
    },
  },
};

const fallbackLabelSlots: LabelPreviewResponse["slots"] = Array.from({ length: fallbackLabelTemplate.slots_per_page }).map(
  (_, index) => {
    const rowIndex = Math.floor(index / fallbackLabelTemplate.columns);
    const columnIndex = index % fallbackLabelTemplate.columns;
    const xPosition = fallbackMm(fallbackLabelTemplate.margin_left_mm)
      + (columnIndex * (fallbackMm(fallbackLabelTemplate.label_width_mm) + fallbackMm(fallbackLabelTemplate.gap_x_mm)));
    const yPosition = fallbackMm(fallbackLabelTemplate.margin_top_mm)
      + (rowIndex * (fallbackMm(fallbackLabelTemplate.label_height_mm) + fallbackMm(fallbackLabelTemplate.gap_y_mm)));
    return {
      page: 1,
      slot: index + 1,
      row: rowIndex + 1,
      column: columnIndex + 1,
      x_mm: formatFallbackMm(xPosition),
      y_mm: formatFallbackMm(yPosition),
      width_mm: fallbackLabelTemplate.label_width_mm,
      height_mm: fallbackLabelTemplate.label_height_mm,
    };
  },
);

export async function loadOperationsData(): Promise<OperationsData> {
  try {
    const catalog = await getOperationsCatalog();
    const [tasks, myTasks, qualityInspections, savedLabels] = await Promise.all([
      listTasks(),
      listMyTasks(),
      listQualityInspections(),
      listSavedLabels(),
    ]);
    const labelPreview = await previewLabelSheet(fallbackTemplateId, {
      quantity: 24,
      art_no: defaultLabelArtNo,
      colour: "White",
      size: "39",
      mrp_npr: "1899",
      manufactured_by: "AB Fashion & Wears",
      origin_text: "Made in Nepal",
    }).catch(() => fallbackData.labelPreview);
    return { catalog, tasks, myTasks, qualityInspections, labelPreview, savedLabels };
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
    users: [],
    employees: [],
    styles: [],
    suppliers: [],
    materials: [],
    work_orders: [],
    label_templates: [
      fallbackLabelTemplate,
    ],
  },
  tasks: [],
  myTasks: [],
  qualityInspections: [],
  savedLabels: [],
  labelPreview: {
    template: fallbackLabelTemplate,
    page_count: 1,
    slots: fallbackLabelSlots,
    values: { quantity: 24, art_no: defaultLabelArtNo, colour: "White", size: "39", mrp_npr: "1899", manufactured_by: "AB Fashion & Wears", origin_text: "Made in Nepal" },
  },
};

function fallbackMm(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatFallbackMm(value: number) {
  return value.toFixed(2);
}