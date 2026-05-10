"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Archive,
  Boxes,
  DollarSign,
  Heart,
  TrendingDown,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch } from "@/lib/api";

interface InventoryHealth {
  total_materials: number;
  healthy_count: number;
  low_count: number;
  critical_count: number;
  no_movement_30d_count: number;
  total_inventory_value_npr: number;
  risk_breakdown: Array<{ status: string; count: number; color: string }>;
  fastest_depleting: Array<{
    material_code: string;
    name: string;
    current_stock: number;
    unit: string;
    daily_rate: number;
    days_left: number;
    risk: string;
  }>;
  dead_stock: Array<{
    material_code: string;
    name: string;
    current_stock: number;
    unit: string;
    value_npr: number;
  }>;
  consumption_trend: Array<{
    date: string;
    consumed: number;
    received: number;
  }>;
}

function riskTone(risk: string): "green" | "amber" | "red" | "neutral" {
  switch (risk) {
    case "ok": return "green";
    case "low": return "amber";
    case "critical": return "red";
    default: return "neutral";
  }
}

export default function InventoryHealthPage() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["inventory-health"],
    queryFn: () => apiFetch<InventoryHealth>("/api/v1/inventory/health"),
  });

  if (isLoading) {
    return (
      <FactoryShell eyebrow="Analytics" title="Inventory health">
        <LoadingSkeleton lines={12} />
      </FactoryShell>
    );
  }

  if (!health) {
    return (
      <FactoryShell eyebrow="Analytics" title="Inventory health">
        <EmptyState icon={<Heart size={28} />} title="No data" description="Inventory health data will appear once materials are tracked." />
      </FactoryShell>
    );
  }

  return (
    <FactoryShell
      eyebrow="Analytics"
      title="Inventory health"
      description="Overview of stock risk distribution, consumption trends, and dead stock."
    >
      {/* KPI row */}
      <section className="kpi-grid" style={{ marginBottom: "1.5rem" }}>
        <GlassCard className="kpi-card tone-neutral">
          <span>Total materials</span>
          <strong>{health.total_materials}</strong>
          <p>Active in inventory</p>
        </GlassCard>
        <GlassCard className="kpi-card tone-green">
          <span>Inventory value</span>
          <strong>NPR {health.total_inventory_value_npr.toLocaleString()}</strong>
          <p>Total stock on hand</p>
        </GlassCard>
        <GlassCard className="kpi-card tone-red">
          <span>Critical items</span>
          <strong>{health.critical_count}</strong>
          <p>Need immediate action</p>
        </GlassCard>
        <GlassCard className="kpi-card tone-amber">
          <span>No movement (30d)</span>
          <strong>{health.no_movement_30d_count}</strong>
          <p>Potential dead stock</p>
        </GlassCard>
      </section>

      <section className="ops-layout-wide">
        {/* Risk pie chart */}
        <GlassCard className="ops-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Distribution</p>
              <h2>Stock risk breakdown</h2>
            </div>
            <Activity aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div style={{ width: "100%", height: 240, display: "flex", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={health.risk_breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                  label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""}: ${value ?? 0}`}
                >
                  {health.risk_breakdown.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "0.5rem" }}>
            {health.risk_breakdown.map((r) => (
              <span key={r.status} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: r.color, display: "inline-block" }} />
                {r.status} ({r.count})
              </span>
            ))}
          </div>
        </GlassCard>

        {/* Consumption trend */}
        <GlassCard className="ops-panel ops-panel-wide">
          <PanelHeader>
            <div>
              <p className="eyebrow">14-day trend</p>
              <h2>Consumption vs received</h2>
            </div>
            <TrendingDown aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          {health.consumption_trend.length > 0 ? (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={health.consumption_trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d: string) => {
                      const parts = d.split("-");
                      return `${parts[1]}/${parts[2]}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="consumed" stackId="1" stroke="#ef4444" fill="#ef444433" name="Consumed" />
                  <Area type="monotone" dataKey="received" stackId="2" stroke="#22c55e" fill="#22c55e33" name="Received" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No movement data" description="Consumption trends will appear once stock movements are recorded." />
          )}
        </GlassCard>
      </section>

      <section className="ops-layout-wide" style={{ marginTop: "1.5rem" }}>
        {/* Fastest depleting */}
        <GlassCard className="ops-panel ops-panel-wide">
          <PanelHeader>
            <div>
              <p className="eyebrow">Depletion risk</p>
              <h2>Fastest depleting materials</h2>
            </div>
            <AlertTriangle aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          {health.fastest_depleting.length > 0 ? (
            <div className="ops-list">
              {health.fastest_depleting.map((m) => (
                <div className="ops-list-row" key={m.material_code} style={{ alignItems: "center" }}>
                  <span style={{ flex: "2 1 0" }}>
                    <strong>{m.name}</strong>
                    <small>{m.material_code}</small>
                  </span>
                  <span style={{ textAlign: "right" }}>
                    <strong>{m.current_stock} {m.unit}</strong>
                    <small>{m.daily_rate} {m.unit}/day</small>
                  </span>
                  <span style={{ display: "flex", gap: "0.35rem", alignItems: "center", justifyContent: "flex-end" }}>
                    <Badge tone={m.days_left <= 3 ? "red" : m.days_left <= 7 ? "amber" : "green"}>
                      {m.days_left <= 0 ? "OUT" : `${m.days_left}d left`}
                    </Badge>
                    <Badge tone={riskTone(m.risk)}>{m.risk}</Badge>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Boxes size={28} />} title="No depletion data" description="Materials need consumption history to calculate depletion rates." />
          )}
        </GlassCard>

        {/* Dead stock */}
        <GlassCard className="ops-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Idle stock</p>
              <h2>No movement in 30 days</h2>
            </div>
            <Archive aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          {health.dead_stock.length > 0 ? (
            <div className="ops-list">
              {health.dead_stock.map((m) => (
                <div className="ops-list-row" key={m.material_code}>
                  <span>
                    <strong>{m.name}</strong>
                    <small>{m.material_code}</small>
                  </span>
                  <span style={{ textAlign: "right" }}>
                    <strong>{m.current_stock} {m.unit}</strong>
                    <small>
                      <DollarSign size={11} style={{ display: "inline" }} />
                      NPR {m.value_npr.toLocaleString()}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Archive size={28} />} title="No dead stock" description="All materials have had movement in the last 30 days." />
          )}
        </GlassCard>
      </section>
    </FactoryShell>
  );
}
