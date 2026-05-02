import type { components } from "./generated/schema";

export type { components, paths } from "./generated/schema";

export type DashboardResponse = components["schemas"]["DashboardResponse"];
export type ThroughputPoint = components["schemas"]["ThroughputPoint"];

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function getDashboard(baseUrl = DEFAULT_BASE_URL): Promise<DashboardResponse> {
  const response = await fetch(`${baseUrl}/api/v1/reports/dashboard`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Dashboard request failed with ${response.status}`);
  }

  return response.json() as Promise<DashboardResponse>;
}
