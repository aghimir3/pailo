import type { Metadata } from "next";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  PackageCheck,
  ScanLine,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { getDashboard } from "@pailo/api-client";

import { FactoryShell } from "@/components/factory/factory-shell";
import { CommandRibbon } from "@/components/factory/command-ribbon";
import { ThroughputChart } from "@/components/throughput-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { dashboardFallback } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Pailo Factory Cockpit | Employee Portal",
  description: "Internal employee portal and factory cockpit for Pailo Shoes operations.",
};

function taskTone(status: string) {
  if (status === "blocked") return "red";
  if (status === "waiting_for_review") return "cyan";
  if (status === "ready") return "amber";
  return "green";
}

function priorityTone(priority: string) {
  if (priority === "urgent" || priority === "high") return "red";
  if (priority === "medium") return "amber";
  return "neutral";
}

async function loadDashboard() {
  try {
    return await getDashboard();
  } catch {
    return dashboardFallback;
  }
}

export default async function Home() {
  const dashboard = await loadDashboard();

  return (
    <FactoryShell
      actions={
        <>
          <Button aria-label="Scan code" size="icon" title="Scan code" type="button" variant="glass">
            <ScanLine aria-hidden="true" size={18} />
          </Button>
          <Button aria-label="Open operations console" asChild>
            <Link href="/operations">
              <ClipboardList aria-hidden="true" size={18} />
              Operations
            </Link>
          </Button>
        </>
      }
      eyebrow="Factory cockpit"
      title="Today's factory control"
    >
        <CommandRibbon />

        <section className="kpi-grid" aria-label="Factory metrics">
          {dashboard.kpis.length > 0 ? dashboard.kpis.map((kpi) => (
            <GlassCard className={`kpi-card tone-${kpi.tone}`} key={kpi.label}>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <p>{kpi.detail}</p>
              <small>{kpi.trend}</small>
            </GlassCard>
          )) : (
            <GlassCard className="kpi-card"><EmptyState title="No metrics yet" description="Production data will appear here once work orders are running." /></GlassCard>
          )}
        </section>

        <section className="dashboard-grid">
          <GlassCard className="panel chart-panel">
            <PanelHeader>
              <div>
                <p className="eyebrow">Output trend</p>
                <h3>Planned vs completed pairs</h3>
              </div>
              <TrendingUp aria-hidden="true" className="panel-icon" size={20} />
            </PanelHeader>
            <ThroughputChart data={dashboard.throughput} />
          </GlassCard>

          <GlassCard className="panel insight-panel">
            <PanelHeader>
              <div>
                <p className="eyebrow">Owner view</p>
                <h3>Decisions that need attention</h3>
              </div>
              <AlertTriangle aria-hidden="true" className="panel-icon warning" size={20} />
            </PanelHeader>
            <div className="insight-list">
              {dashboard.owner_insights.length > 0 ? dashboard.owner_insights.map((insight) => (
                <div className={`insight tone-${insight.tone}`} key={insight.title}>
                  <strong>{insight.title}</strong>
                  <p>{insight.detail}</p>
                  <span>{insight.action}</span>
                </div>
              )) : (
                <EmptyState title="No decisions pending" description="Insights will surface here when production is active." />
              )}
            </div>
          </GlassCard>

          <GlassCard className="panel work-panel">
            <PanelHeader>
              <div>
                <p className="eyebrow">Production</p>
                <h3>Active work orders</h3>
              </div>
              <PackageCheck aria-hidden="true" className="panel-icon" size={20} />
            </PanelHeader>
            <div className="work-order-list">
              {dashboard.work_orders.length > 0 ? dashboard.work_orders.map((order) => {
                const progress = Math.round((order.completed_pairs / order.planned_pairs) * 100);
                return (
                  <section className="work-order-card" key={order.code}>
                    <div className="work-order-topline">
                      <strong>{order.code}</strong>
                      <span>{order.due}</span>
                    </div>
                    <h4>{order.style}</h4>
                    <p>{order.color} / {order.stage}</p>
                    <div className="progress-track" aria-label={`${progress}% complete`}>
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <div className="work-order-meta">
                      <span>{order.completed_pairs}/{order.planned_pairs} pairs</span>
                      {order.blocker ? <em>{order.blocker}</em> : <em className="clear">No blocker</em>}
                    </div>
                  </section>
                );
              }) : (
                <EmptyState icon={<PackageCheck size={28} />} title="No active work orders" description="Create a work order to start tracking production batches." />
              )}
            </div>
          </GlassCard>

          <GlassCard className="panel task-panel">
            <PanelHeader>
              <div>
                <p className="eyebrow">My Tasks</p>
                <h3>Assigned to Ram</h3>
              </div>
              <ClipboardList aria-hidden="true" className="panel-icon" size={20} />
            </PanelHeader>
            <div className="task-list">
              {dashboard.my_tasks.length > 0 ? dashboard.my_tasks.map((task) => (
                <section className={task.blocker_reason ? "task-card task-card-alert" : "task-card"} key={task.code}>
                  <div className="task-main">
                    <div className="task-card-head">
                      <Badge tone={taskTone(task.status)}>{task.status.replaceAll("_", " ")}</Badge>
                      <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                    </div>
                    <h4>{task.title}</h4>
                    <div className="task-meta-grid">
                      <span><CalendarClock aria-hidden="true" size={15} />{task.due_time}</span>
                      <span>{task.work_order ?? "General"}</span>
                      <span>{task.quantity ?? "No quantity"}</span>
                    </div>
                    {task.blocker_reason ? <p className="task-blocker">{task.blocker_reason}</p> : null}
                  </div>
                  <div className="task-actions">
                    <Button className="task-action" size="sm" type="button" variant="glass">
                      <MessageSquare aria-hidden="true" size={16} />
                      Comment
                    </Button>
                    <Button className="task-action" size="sm" type="button" variant="glass">
                      <CheckCircle2 aria-hidden="true" size={16} />
                      Update
                    </Button>
                  </div>
                </section>
              )) : (
                <EmptyState icon={<ClipboardList size={28} />} title="No tasks assigned" description="Tasks will appear here once you are assigned work." />
              )}
            </div>
          </GlassCard>

          <GlassCard className="panel inventory-panel">
            <PanelHeader>
              <div>
                <p className="eyebrow">Inventory</p>
                <h3>Low-stock risks</h3>
              </div>
              <Boxes aria-hidden="true" className="panel-icon" size={20} />
            </PanelHeader>
            <div className="inventory-list">
              {dashboard.inventory_alerts.length > 0 ? dashboard.inventory_alerts.map((item) => (
                <div className="inventory-row" key={item.code}>
                  <div>
                    <strong>{item.material}</strong>
                    <span>{item.code}</span>
                  </div>
                  <div>
                    <strong>{item.current}</strong>
                    <span>Min {item.minimum}</span>
                  </div>
                  <p>{item.risk}</p>
                </div>
              )) : (
                <EmptyState icon={<Boxes size={28} />} title="No stock alerts" description="Inventory warnings will surface here when materials run low." />
              )}
            </div>
          </GlassCard>

          <GlassCard className="panel quality-panel">
            <PanelHeader>
              <div>
                <p className="eyebrow">Quality</p>
                <h3>QC signals</h3>
              </div>
              <CheckCircle2 aria-hidden="true" className="panel-icon" size={20} />
            </PanelHeader>
            <div className="quality-grid">
              {dashboard.quality_signals.length > 0 ? dashboard.quality_signals.map((signal) => (
                <div className={`quality-card tone-${signal.tone}`} key={signal.label}>
                  <span>{signal.label}</span>
                  <strong>{signal.value}</strong>
                  <p>{signal.detail}</p>
                </div>
              )) : (
                <EmptyState icon={<CheckCircle2 size={28} />} title="No quality data" description="QC signals will appear once inspections are recorded." />
              )}
            </div>
          </GlassCard>
        </section>
    </FactoryShell>
  );
}
