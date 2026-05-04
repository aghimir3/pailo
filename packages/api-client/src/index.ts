import type { components } from "./generated/schema";

export type { components, paths } from "./generated/schema";

export type DashboardResponse = components["schemas"]["DashboardResponse"];
export type InventoryAlert = components["schemas"]["InventoryAlert"];
export type LabelPrintJobCreateRequest = components["schemas"]["LabelPrintJobCreateRequest"];
export type LabelPrintJobRecord = components["schemas"]["LabelPrintJobRecord"];
export type LabelPreviewRequest = components["schemas"]["LabelPreviewRequest-Input"];
export type LabelPreviewResponse = components["schemas"]["LabelPreviewResponse"];
export type LabelTemplateRecord = components["schemas"]["LabelTemplateRecord"];
export type MaterialStockRecord = components["schemas"]["MaterialStockRecord"];
export type OperationsCatalogResponse = components["schemas"]["OperationsCatalogResponse"];
export type QualityInspectionRecord = components["schemas"]["QualityInspectionRecord"];
export type QualitySignal = components["schemas"]["QualitySignal"];
export type SavedLabelCreateRequest = components["schemas"]["SavedLabelCreateRequest"];
export type SavedLabelDuplicateRequest = components["schemas"]["SavedLabelDuplicateRequest"];
export type SavedLabelPatchRequest = components["schemas"]["SavedLabelPatchRequest"];
export type SavedLabelPreviewRequest = components["schemas"]["SavedLabelPreviewRequest"];
export type SavedLabelRecord = components["schemas"]["SavedLabelRecord"];
export type TaskCommentCreateRequest = components["schemas"]["TaskCommentCreateRequest"];
export type TaskCommentRecord = components["schemas"]["TaskCommentRecord"];
export type TaskCommentUpdateRequest = components["schemas"]["TaskCommentUpdateRequest"];
export type TaskCreateRequest = components["schemas"]["TaskCreateRequest"];
export type TaskPatchRequest = components["schemas"]["TaskPatchRequest"];
export type TaskRecord = components["schemas"]["TaskRecord"];
export type TaskStatusUpdateRequest = components["schemas"]["TaskStatusUpdateRequest"];
export type ThroughputPoint = components["schemas"]["ThroughputPoint"];
export type WorkOrderRecord = components["schemas"]["WorkOrderRecord"];

// Server-side: use internal URL (sidecar in same ECS task). Client-side: use relative URL (ALB routes /api/* to backend).
const DEFAULT_BASE_URL = typeof window === "undefined"
  ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000")
  : "";
const DEFAULT_TASK_MANAGER_EMAIL = process.env.NEXT_PUBLIC_PAILO_TASK_MANAGER_EMAIL ?? "milan@pailoshoes.com";
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? "";

type ApiActorOptions = {
  baseUrl?: string;
  userEmail?: string;
  userId?: string;
};

export async function getDashboard(baseUrl = DEFAULT_BASE_URL): Promise<DashboardResponse> {
  return getJson<DashboardResponse>("/api/v1/reports/dashboard", baseUrl);
}

export async function getOperationsCatalog(baseUrl = DEFAULT_BASE_URL): Promise<OperationsCatalogResponse> {
  return getJson<OperationsCatalogResponse>("/api/v1/operations/catalog", baseUrl);
}

export async function listTasks(baseUrl = DEFAULT_BASE_URL): Promise<TaskRecord[]> {
  return getJson<TaskRecord[]>("/api/v1/tasks", baseUrl);
}

export async function listMyTasks(baseUrl = DEFAULT_BASE_URL): Promise<TaskRecord[]> {
  return getJson<TaskRecord[]>("/api/v1/tasks/my-tasks", baseUrl);
}

export async function createTask(
  payload: TaskCreateRequest,
  options: ApiActorOptions = {},
): Promise<TaskRecord> {
  return sendJson<TaskRecord>(
    "/api/v1/tasks",
    "POST",
    payload,
    options.baseUrl,
    actorHeaders({ userEmail: DEFAULT_TASK_MANAGER_EMAIL, ...options }),
  );
}

export async function patchTask(
  taskId: string,
  payload: TaskPatchRequest,
  options: ApiActorOptions = {},
): Promise<TaskRecord> {
  return sendJson<TaskRecord>(
    `/api/v1/tasks/${taskId}`,
    "PATCH",
    payload,
    options.baseUrl,
    actorHeaders({ userEmail: DEFAULT_TASK_MANAGER_EMAIL, ...options }),
  );
}

export async function updateTaskStatus(
  taskId: string,
  payload: TaskStatusUpdateRequest,
  options: ApiActorOptions = {},
): Promise<TaskRecord> {
  return sendJson<TaskRecord>(
    `/api/v1/tasks/${taskId}/updates`,
    "POST",
    payload,
    options.baseUrl,
    actorHeaders({ userEmail: DEFAULT_TASK_MANAGER_EMAIL, ...options }),
  );
}

export async function createTaskComment(
  taskId: string,
  payload: TaskCommentCreateRequest,
  options: ApiActorOptions = {},
): Promise<TaskCommentRecord> {
  return sendJson<TaskCommentRecord>(
    `/api/v1/tasks/${taskId}/comments`,
    "POST",
    payload,
    options.baseUrl,
    actorHeaders(options),
  );
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

export async function listSavedLabels(
  includeArchived = false,
  baseUrl = DEFAULT_BASE_URL,
): Promise<SavedLabelRecord[]> {
  return getJson<SavedLabelRecord[]>(`/api/v1/labels/saved?include_archived=${includeArchived}`, baseUrl);
}

export async function createSavedLabel(
  payload: SavedLabelCreateRequest,
  baseUrl = DEFAULT_BASE_URL,
): Promise<SavedLabelRecord> {
  return sendJson<SavedLabelRecord>("/api/v1/labels/saved", "POST", payload, baseUrl);
}

export async function patchSavedLabel(
  savedLabelId: string,
  payload: SavedLabelPatchRequest,
  baseUrl = DEFAULT_BASE_URL,
): Promise<SavedLabelRecord> {
  return sendJson<SavedLabelRecord>(`/api/v1/labels/saved/${savedLabelId}`, "PATCH", payload, baseUrl);
}

export async function archiveSavedLabel(
  savedLabelId: string,
  version: number,
  baseUrl = DEFAULT_BASE_URL,
): Promise<SavedLabelRecord> {
  return deleteJson<SavedLabelRecord>(`/api/v1/labels/saved/${savedLabelId}?version=${version}`, baseUrl);
}

export async function duplicateSavedLabel(
  savedLabelId: string,
  payload: SavedLabelDuplicateRequest = {},
  baseUrl = DEFAULT_BASE_URL,
): Promise<SavedLabelRecord> {
  return sendJson<SavedLabelRecord>(`/api/v1/labels/saved/${savedLabelId}/duplicate`, "POST", payload, baseUrl);
}

export async function previewSavedLabel(
  savedLabelId: string,
  payload: SavedLabelPreviewRequest,
  baseUrl = DEFAULT_BASE_URL,
): Promise<LabelPreviewResponse> {
  return sendJson<LabelPreviewResponse>(`/api/v1/labels/saved/${savedLabelId}/preview`, "POST", payload, baseUrl);
}

export async function listLabelPrintJobs(
  savedLabelId?: string,
  baseUrl = DEFAULT_BASE_URL,
): Promise<LabelPrintJobRecord[]> {
  const query = savedLabelId ? `?saved_label_id=${savedLabelId}` : "";
  return getJson<LabelPrintJobRecord[]>(`/api/v1/labels/print-jobs${query}`, baseUrl);
}

export async function createLabelPrintJob(
  savedLabelId: string,
  payload: LabelPrintJobCreateRequest,
  baseUrl = DEFAULT_BASE_URL,
): Promise<LabelPrintJobRecord> {
  return sendJson<LabelPrintJobRecord>(`/api/v1/labels/saved/${savedLabelId}/print-jobs`, "POST", payload, baseUrl);
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

async function sendJson<TResponse>(
  path: string,
  method: "PATCH" | "POST",
  payload: unknown,
  baseUrl = DEFAULT_BASE_URL,
  headers: Record<string, string> = {},
): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...headers,
    },
    method,
  });

  if (!response.ok) {
    throw await apiError(response, path);
  }

  return response.json() as Promise<TResponse>;
}

async function deleteJson<TResponse>(path: string, baseUrl = DEFAULT_BASE_URL): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
    method: "DELETE",
  });

  if (!response.ok) {
    throw await apiError(response, path);
  }

  return response.json() as Promise<TResponse>;
}

async function getJson<TResponse>(path: string, baseUrl = DEFAULT_BASE_URL): Promise<TResponse> {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  // For server-side rendering: use internal service token if available
  if (INTERNAL_SERVICE_TOKEN) {
    headers["X-Internal-Token"] = INTERNAL_SERVICE_TOKEN;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    throw await apiError(response, path);
  }

  return response.json() as Promise<TResponse>;
}

function actorHeaders(options: ApiActorOptions): Record<string, string> {
  return {
    ...(options.userEmail ? { "X-Pailo-User-Email": options.userEmail } : {}),
    ...(options.userId ? { "X-Pailo-User-Id": options.userId } : {}),
  };
}

async function apiError(response: Response, path: string) {
  let detail = `${path} request failed with ${response.status}`;
  try {
    const payload = await response.json() as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      detail = payload.detail;
    }
  } catch {
    // Keep the status-based fallback when the response is not JSON.
  }
  return new Error(detail);
}
