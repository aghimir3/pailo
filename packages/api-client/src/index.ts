import type { components } from "./generated/schema";

export type { components, paths } from "./generated/schema";

export type DashboardResponse = components["schemas"]["DashboardResponse"];
export type InventoryAlert = components["schemas"]["InventoryAlert"];
export type LabelPreviewRequest = components["schemas"]["LabelPreviewRequest-Input"];
export type LabelPreviewResponse = components["schemas"]["LabelPreviewResponse"];
export type LabelTemplateRecord = components["schemas"]["LabelTemplateRecord"];
export type MaterialStockRecord = components["schemas"]["MaterialStockRecord"];
export type MvpCatalogResponse = components["schemas"]["MvpCatalogResponse"];
export type QualityInspectionRecord = components["schemas"]["QualityInspectionRecord"];
export type QualitySignal = components["schemas"]["QualitySignal"];
export type TaskCommentCreateRequest = components["schemas"]["TaskCommentCreateRequest"];
export type TaskCommentRecord = components["schemas"]["TaskCommentRecord"];
export type TaskCommentUpdateRequest = components["schemas"]["TaskCommentUpdateRequest"];
export type TaskCreateRequest = components["schemas"]["TaskCreateRequest"];
export type TaskPatchRequest = components["schemas"]["TaskPatchRequest"];
export type TaskRecord = components["schemas"]["TaskRecord"];
export type TaskStatusUpdateRequest = components["schemas"]["TaskStatusUpdateRequest"];
export type ThroughputPoint = components["schemas"]["ThroughputPoint"];
export type WorkOrderRecord = components["schemas"]["WorkOrderRecord"];

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function getDashboard(baseUrl = DEFAULT_BASE_URL): Promise<DashboardResponse> {
  return getJson<DashboardResponse>("/api/v1/reports/dashboard", baseUrl);
}

export async function getMvpCatalog(baseUrl = DEFAULT_BASE_URL): Promise<MvpCatalogResponse> {
  return getJson<MvpCatalogResponse>("/api/v1/catalog/mvp", baseUrl);
}

export async function listTasks(baseUrl = DEFAULT_BASE_URL): Promise<TaskRecord[]> {
  return getJson<TaskRecord[]>("/api/v1/tasks", baseUrl);
}

export async function listMyTasks(baseUrl = DEFAULT_BASE_URL): Promise<TaskRecord[]> {
  return getJson<TaskRecord[]>("/api/v1/tasks/my-tasks", baseUrl);
}

export async function listWorkOrders(baseUrl = DEFAULT_BASE_URL): Promise<WorkOrderRecord[]> {
  return getJson<WorkOrderRecord[]>("/api/v1/work-orders", baseUrl);
}

export async function listMaterials(baseUrl = DEFAULT_BASE_URL): Promise<MaterialStockRecord[]> {
  return getJson<MaterialStockRecord[]>("/api/v1/inventory/materials", baseUrl);
}

export async function listLowStock(baseUrl = DEFAULT_BASE_URL): Promise<InventoryAlert[]> {
  return getJson<InventoryAlert[]>("/api/v1/inventory/low-stock", baseUrl);
}

export async function listQualityInspections(
  baseUrl = DEFAULT_BASE_URL,
): Promise<QualityInspectionRecord[]> {
  return getJson<QualityInspectionRecord[]>("/api/v1/quality/inspections", baseUrl);
}

export async function listQualitySignals(baseUrl = DEFAULT_BASE_URL): Promise<QualitySignal[]> {
  return getJson<QualitySignal[]>("/api/v1/quality/signals", baseUrl);
}

export async function listLabelTemplates(baseUrl = DEFAULT_BASE_URL): Promise<LabelTemplateRecord[]> {
  return getJson<LabelTemplateRecord[]>("/api/v1/labels/templates", baseUrl);
}

export async function previewLabelSheet(
  templateId: string,
  payload: LabelPreviewRequest,
  baseUrl = DEFAULT_BASE_URL,
): Promise<LabelPreviewResponse> {
  const response = await fetch(`${baseUrl}/api/v1/labels/templates/${templateId}/preview`, {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Label preview request failed with ${response.status}`);
  }

  return response.json() as Promise<LabelPreviewResponse>;
}

async function getJson<TResponse>(path: string, baseUrl = DEFAULT_BASE_URL): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${path} request failed with ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}
