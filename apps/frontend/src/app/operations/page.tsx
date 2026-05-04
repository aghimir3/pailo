import Link from "next/link";
import { AlertTriangle, Boxes, ClipboardList, Factory, PackageCheck, ShieldCheck } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { loadOperationsData, numberLabel, operationsTotals, percent, riskTone, shortDate } from "@/lib/operations-data";

const modules = [
  { href: "/tasks", label: "Tasks", icon: ClipboardList, detail: "Assignment, comments, blockers, and worker updates" },
  { href: "/work-orders", label: "Work orders", icon: PackageCheck, detail: "Batch progress, size lines, cost snapshots, and stages" },
  { href: "/inventory", label: "Inventory", icon: Boxes, detail: "Raw material risk, suppliers, and stock movement queues" },
  { href: "/quality", label: "Quality", icon: ShieldCheck, detail: "Inspections, defects, review gates, and rework" },
];

export default async function OperationsPage() {
  const data = await loadOperationsData();
  const totals = operationsTotals(data);
  const urgentTasks = data.tasks.filter((task) => task.status === "blocked" || task.priority === "urgent").slice(0, 3);
  const lowStock = data.catalog.materials.filter((material) => material.risk !== "Healthy").slice(0, 3);

  return (
    <FactoryShell
      actions={
        <Button asChild>
          <Link href="/tasks">Open task board</Link>
        </Button>
      }
      description="A production-ready map of the work happening now, with each workflow split into its own screen."
      eyebrow="Factory operations"
      title="Today’s control room"
    >
      <section className="ops-hero-grid">
        <GlassCard className="ops-command-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Batch heartbeat</p>
              <h2>{percent(totals.completedPairs, totals.plannedPairs)}% complete</h2>
            </div>
            <Factory aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <p>
            {numberLabel(totals.completedPairs)} of {numberLabel(totals.plannedPairs)} planned pairs are complete
            across {data.catalog.work_orders.length} active work orders.
          </p>
          <div className="quantity-track">
            <span style={{ width: `${percent(totals.completedPairs, totals.plannedPairs)}%` }} />
          </div>
        </GlassCard>

        <section className="ops-kpi-grid" aria-label="Operating status">
          <div className="ops-kpi"><span>Blocked</span><strong>{totals.blockedCount}</strong></div>
          <div className="ops-kpi"><span>Review</span><strong>{totals.reviewCount}</strong></div>
          <div className="ops-kpi"><span>Stock risks</span><strong>{totals.lowStockCount}</strong></div>
          <div className="ops-kpi"><span>Styles</span><strong>{data.catalog.styles.length}</strong></div>
        </section>
      </section>

      <section className="ops-module-grid">
        {modules.map((module) => (
          <Link className="ops-module-card glass-card" href={module.href} key={module.href}>
            <module.icon aria-hidden="true" size={22} />
            <span>
              <strong>{module.label}</strong>
              <small>{module.detail}</small>
            </span>
          </Link>
        ))}
      </section>

      <section className="ops-two-column">
        <GlassCard className="ops-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Needs attention</p>
              <h2>Blocked and urgent work</h2>
            </div>
            <AlertTriangle aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="ops-list">
            {urgentTasks.length > 0 ? urgentTasks.map((task) => (
              <Link className="ops-list-row" href="/tasks" key={task.id}>
                <span><strong>{task.title}</strong><small>{task.work_order_code ?? "General"} / {task.assignee?.display_name ?? "Unassigned"}</small></span>
                <Badge tone={task.status === "blocked" ? "red" : "amber"}>{task.status.replaceAll("_", " ")}</Badge>
              </Link>
            )) : (
              <p className="empty-state-description" style={{ padding: "20px", textAlign: "center" }}>No blocked or urgent tasks right now.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="ops-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Material risk</p>
              <h2>Inventory pressure</h2>
            </div>
            <Boxes aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="ops-list">
            {lowStock.length > 0 ? lowStock.map((material) => (
              <Link className="ops-list-row" href="/inventory" key={material.id}>
                <span><strong>{material.name}</strong><small>{material.current_quantity} {material.unit_of_measure} / min {material.minimum_stock}</small></span>
                <Badge tone={riskTone(material.risk)}>{material.supplier ?? "No supplier"}</Badge>
              </Link>
            )) : (
              <p className="empty-state-description" style={{ padding: "20px", textAlign: "center" }}>No materials at risk. Stock levels are healthy.</p>
            )}
          </div>
        </GlassCard>
      </section>

      <section className="ops-card-grid">
        {data.catalog.work_orders.length > 0 ? data.catalog.work_orders.map((order) => (
          <GlassCard className="ops-panel" key={order.id}>
            <div className="ops-row-head">
              <strong>{order.work_order_code}</strong>
              <Badge tone={order.blocker ? "red" : "green"}>{order.status}</Badge>
            </div>
            <h3>{order.style_name}</h3>
            <p>{order.current_stage ?? "Planning"} / Due {shortDate(order.due_date)}</p>
            <div className="quantity-track">
              <span style={{ width: `${percent(order.completed_pairs, order.planned_pairs)}%` }} />
            </div>
          </GlassCard>
        )) : (
          <GlassCard className="ops-panel">
            <p className="empty-state-description" style={{ padding: "20px", textAlign: "center" }}>No work orders created yet. Start by adding product styles and creating a batch.</p>
          </GlassCard>
        )}
      </section>
    </FactoryShell>
  );
}