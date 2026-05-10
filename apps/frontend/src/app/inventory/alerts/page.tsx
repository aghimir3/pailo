"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Siren,
  TrendingDown,
} from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch, apiPost } from "@/lib/api";

interface StockAlert {
  id: string;
  material_id: string;
  material_name: string;
  material_code: string;
  alert_type: string;
  current_stock: number;
  threshold: number;
  unit: string;
  days_remaining: number | null;
  supplier_name: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  po_reference: string | null;
  created_at: string;
}

function alertIcon(type: string) {
  switch (type) {
    case "stockout": return <Siren size={18} />;
    case "stockout_imminent": return <ShieldAlert size={18} />;
    case "below_minimum": return <AlertTriangle size={18} />;
    case "below_reorder": return <TrendingDown size={18} />;
    default: return <Bell size={18} />;
  }
}

function alertTone(type: string): "red" | "amber" | "green" | "neutral" {
  switch (type) {
    case "stockout":
    case "stockout_imminent": return "red";
    case "below_minimum": return "amber";
    case "below_reorder": return "green";
    default: return "neutral";
  }
}

function alertLabel(type: string): string {
  switch (type) {
    case "stockout": return "Stockout";
    case "stockout_imminent": return "Stockout imminent";
    case "below_minimum": return "Below minimum";
    case "below_reorder": return "Below reorder point";
    default: return type;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"active" | "acknowledged" | "all">("active");
  const [ackTarget, setAckTarget] = useState<StockAlert | null>(null);

  const acknowledged = filter === "active" ? false : filter === "acknowledged" ? true : undefined;

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["stock-alerts", filter],
    queryFn: () => {
      const params = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : "";
      return apiFetch<StockAlert[]>(`/api/v1/inventory/alerts${params}`);
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => apiPost<StockAlert[]>("/api/v1/inventory/alerts/generate", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-count"] });
    },
  });

  const activeCount = alerts?.filter(a => !a.acknowledged).length ?? 0;

  return (
    <FactoryShell
      eyebrow="Proactive warnings"
      title="Stock alerts"
      description="Depletion warnings and reorder reminders for all materials."
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn btn-primary"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <RefreshCw size={16} className={generateMutation.isPending ? "spin" : ""} />
            {generateMutation.isPending ? "Checking..." : "Check stock now"}
          </button>
        </div>
      }
    >
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {(["active", "acknowledged", "all"] as const).map((f) => (
          <button
            key={f}
            className={`btn ${filter === f ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: "capitalize" }}
          >
            {f === "active" && <Bell size={14} />}
            {f === "acknowledged" && <BellOff size={14} />}
            {f}
            {f === "active" && activeCount > 0 && (
              <span style={{
                background: "var(--red-500, #ef4444)",
                color: "white",
                borderRadius: "999px",
                padding: "0 6px",
                fontSize: "0.7rem",
                fontWeight: 700,
                marginLeft: "4px",
              }}>
                {activeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <GlassCard className="ops-panel ops-panel-wide">
        <PanelHeader>
          <div>
            <p className="eyebrow">Alerts</p>
            <h2>{filter === "active" ? "Needs attention" : filter === "acknowledged" ? "Resolved" : "All alerts"}</h2>
          </div>
          <AlertTriangle aria-hidden="true" className="panel-icon" size={22} />
        </PanelHeader>

        {isLoading ? (
          <LoadingSkeleton lines={6} />
        ) : alerts && alerts.length > 0 ? (
          <div className="ops-list">
            {alerts.map((alert) => (
              <div
                className="ops-list-row"
                key={alert.id}
                style={{
                  alignItems: "center",
                  opacity: alert.acknowledged ? 0.6 : 1,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {alertIcon(alert.alert_type)}
                  <span>
                    <strong>{alert.material_name}</strong>
                    <small>{alert.material_code} &middot; {alert.current_stock} {alert.unit} &middot; Threshold: {alert.threshold} {alert.unit}</small>
                  </span>
                </span>

                <span style={{ textAlign: "right", minWidth: "90px" }}>
                  {alert.days_remaining !== null ? (
                    <strong style={{ color: alert.days_remaining <= 3 ? "var(--red-500, #ef4444)" : alert.days_remaining <= 7 ? "var(--amber-500, #f59e0b)" : "inherit" }}>
                      {alert.days_remaining <= 0 ? "OUT" : `${alert.days_remaining}d left`}
                    </strong>
                  ) : null}
                  <small>{timeAgo(alert.created_at)}</small>
                </span>

                <span style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                  <Badge tone={alertTone(alert.alert_type)}>{alertLabel(alert.alert_type)}</Badge>
                  {alert.acknowledged ? (
                    <Badge tone="green">
                      <CheckCircle2 size={12} style={{ marginRight: "2px" }} />
                      {alert.po_reference ? alert.po_reference : "Resolved"}
                    </Badge>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={() => setAckTarget(alert)}
                    >
                      Acknowledge
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Bell size={28} />}
            title={filter === "active" ? "No active alerts" : "No alerts"}
            description={filter === "active" ? "All materials are within safe stock levels." : "Stock alerts will appear here when generated."}
          />
        )}
      </GlassCard>

      {ackTarget && (
        <AcknowledgeSheet
          alert={ackTarget}
          open
          onClose={() => setAckTarget(null)}
          onSuccess={() => {
            setAckTarget(null);
            queryClient.invalidateQueries({ queryKey: ["stock-alerts"] });
            queryClient.invalidateQueries({ queryKey: ["alert-count"] });
          }}
        />
      )}
    </FactoryShell>
  );
}

function AcknowledgeSheet({
  alert,
  open,
  onClose,
  onSuccess,
}: {
  alert: StockAlert;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [poRef, setPoRef] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<StockAlert>(`/api/v1/inventory/alerts/${alert.id}/acknowledge`, data),
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      po_reference: poRef || null,
      notes: notes || null,
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`Acknowledge: ${alert.material_name}`}>
      <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "var(--surface-raised)", borderRadius: "0.5rem" }}>
        <p><strong>{alertLabel(alert.alert_type)}</strong></p>
        <p>Current stock: {alert.current_stock} {alert.unit}</p>
        {alert.days_remaining !== null && <p>Days remaining: {alert.days_remaining}</p>}
      </div>
      <form onSubmit={handleSubmit}>
        <FormInput
          label="PO / Order reference (optional)"
          value={poRef}
          onChange={setPoRef}
        />
        <FormTextarea label="Notes" value={notes} onChange={setNotes} />
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Mark as handled"}
        </button>
      </form>
    </BottomSheet>
  );
}
