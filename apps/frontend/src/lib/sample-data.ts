import type { DashboardResponse } from "@pailo/api-client";

export type Tone = "neutral" | "green" | "amber" | "red" | "cyan";

export const dashboardFallback = {
  production_date: "2026-05-02",
  target_cost_npr: 900,
  kpis: [
    { label: "Planned pairs", value: "120", detail: "Today across 3 work orders", tone: "cyan", trend: "+20 vs yesterday" },
    { label: "Completed", value: "86", detail: "72% of daily target", tone: "green", trend: "On pace by 17:30" },
    { label: "Blocked tasks", value: "5", detail: "Thread, outsole, label review", tone: "amber", trend: "2 need owner help" },
    { label: "Cost pressure", value: "NPR 934", detail: "Avg estimated cost per pair", tone: "red", trend: "34 over target" },
  ],
  throughput: [
    { day: "Mon", planned: 100, completed: 92 },
    { day: "Tue", planned: 110, completed: 104 },
    { day: "Wed", planned: 120, completed: 98 },
    { day: "Thu", planned: 115, completed: 107 },
    { day: "Fri", planned: 120, completed: 86 },
  ],
  work_orders: [
    { code: "WO-2026-000001", style: "Pailo City Runner", color: "Black", planned_pairs: 60, completed_pairs: 44, stage: "Stitching", blocker: "Black thread below minimum", due: "Today" },
    { code: "WO-2026-000002", style: "Pailo School Classic", color: "White", planned_pairs: 40, completed_pairs: 32, stage: "QC", blocker: null, due: "Today" },
    { code: "WO-2026-000003", style: "Pailo Trail Sandal", color: "Tan", planned_pairs: 20, completed_pairs: 10, stage: "Sole attachment", blocker: "Outsole delivery late", due: "Tomorrow" },
  ],
  my_tasks: [
    { code: "TASK-2026-000041", title: "Cut upper material for City Runner", status: "in_progress", priority: "high", assignee: "Ram", due_time: "11:30", work_order: "WO-2026-000001", quantity: "44 / 60 pairs", blocker_reason: null },
    { code: "TASK-2026-000044", title: "Print size 40-43 labels", status: "ready", priority: "medium", assignee: "Ram", due_time: "16:00", work_order: "WO-2026-000002", quantity: "40 labels", blocker_reason: null },
  ],
  inventory_alerts: [
    { material: "Black thread", code: "MAT-THR-BLK", current: "2 rolls", minimum: "8 rolls", risk: "Blocks stitching today", supplier: "Kathmandu Threads" },
    { material: "TR outsole size 42", code: "MAT-OUT-TR42", current: "18 pairs", minimum: "40 pairs", risk: "Blocks tomorrow batch", supplier: "Birat Sole Works" },
    { material: "Shoe box large", code: "MAT-BOX-L", current: "62 pcs", minimum: "100 pcs", risk: "Packing delay", supplier: "Patan Packaging" },
  ],
  quality_signals: [
    { label: "Defect rate", value: "4.7%", detail: "Glue marks trending up", tone: "amber" },
    { label: "Rework pairs", value: "9", detail: "7 in finishing, 2 in stitching", tone: "amber" },
    { label: "QC cleared", value: "32", detail: "School Classic ready for labels", tone: "green" },
  ],
  owner_insights: [
    { title: "Protect tomorrow's output", detail: "Outsole size 42 stock covers only 45% of tomorrow's Trail Sandal plan.", action: "Confirm supplier delivery before 15:00", tone: "red" },
    { title: "Cost target needs attention", detail: "City Runner estimate is NPR 934 per pair against the NPR 900 target.", action: "Review outsole and upper material price lines", tone: "amber" },
    { title: "QC pattern emerging", detail: "Glue marks appear on 5 of the last 9 rework pairs.", action: "Check sole attachment station before next batch", tone: "cyan" },
  ],
} satisfies DashboardResponse;
