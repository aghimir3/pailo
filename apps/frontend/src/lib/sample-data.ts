import type { DashboardResponse } from "@pailo/api-client";

export type Tone = "neutral" | "green" | "amber" | "red" | "cyan";

export const dashboardFallback = {
  production_date: new Date().toISOString().slice(0, 10),
  target_cost_npr: 0,
  kpis: [],
  throughput: [],
  work_orders: [],
  my_tasks: [],
  inventory_alerts: [],
  quality_signals: [],
  owner_insights: [],
} satisfies DashboardResponse;
