"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileDown, TrendingUp, Package, AlertTriangle, ShieldCheck } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch } from "@/lib/api";

interface DashboardData {
  kpi: {
    total_planned_pairs: number;
    total_completed_pairs: number;
    total_work_orders: number;
    active_work_orders: number;
    blocked_tasks: number;
    low_stock_materials: number;
    inspections_this_week: number;
    defect_rate_percent: number;
  };
  production_by_stage: Array<{ stage: string; count: number }>;
  recent_completions: Array<{ date: string; pairs: number }>;
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/v1/reports/dashboard"),
  });

  const kpi = data?.kpi;

  return (
    <FactoryShell
      eyebrow="Owner view"
      title="Reports"
      description="Operating KPIs, production analytics, and data exports."
    >
      <section className="ops-two-column">
        <GlassCard className="ops-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Snapshot</p>
              <h2>Current operating totals</h2>
            </div>
            <BarChart3 aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          {isLoading ? (
            <LoadingSkeleton lines={4} />
          ) : kpi ? (
            <div className="ops-kpi-grid">
              <div className="ops-kpi">
                <TrendingUp size={18} />
                <span>Pairs planned</span>
                <strong>{kpi.total_planned_pairs}</strong>
              </div>
              <div className="ops-kpi">
                <Package size={18} />
                <span>Pairs complete</span>
                <strong>{kpi.total_completed_pairs}</strong>
              </div>
              <div className="ops-kpi">
                <AlertTriangle size={18} />
                <span>Blocked tasks</span>
                <strong>{kpi.blocked_tasks}</strong>
              </div>
              <div className="ops-kpi">
                <AlertTriangle size={18} />
                <span>Stock risks</span>
                <strong>{kpi.low_stock_materials}</strong>
              </div>
              <div className="ops-kpi">
                <ShieldCheck size={18} />
                <span>QC this week</span>
                <strong>{kpi.inspections_this_week}</strong>
              </div>
              <div className="ops-kpi">
                <ShieldCheck size={18} />
                <span>Defect rate</span>
                <strong>{kpi.defect_rate_percent.toFixed(1)}%</strong>
              </div>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard className="ops-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Production</p>
              <h2>Work by stage</h2>
            </div>
            <BarChart3 aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          {data?.production_by_stage ? (
            <div className="ops-list">
              {data.production_by_stage.map((stage) => (
                <div className="ops-list-row" key={stage.stage}>
                  <span><strong>{stage.stage.replace("_", " ")}</strong></span>
                  <strong>{stage.count} tasks</strong>
                </div>
              ))}
            </div>
          ) : (
            <LoadingSkeleton lines={4} />
          )}
        </GlassCard>

        <GlassCard className="ops-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Exports</p>
              <h2>Download files</h2>
            </div>
            <FileDown aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="ops-button-row">
            <Button asChild variant="glass">
              <a href="/api/v1/reports/tasks.csv">Task CSV</a>
            </Button>
            <Button asChild variant="glass">
              <a href="/api/v1/reports/low-stock.csv">Low-stock CSV</a>
            </Button>
            <Button asChild>
              <a href="/api/v1/reports/dashboard">Dashboard JSON</a>
            </Button>
          </div>
        </GlassCard>
      </section>
    </FactoryShell>
  );
}