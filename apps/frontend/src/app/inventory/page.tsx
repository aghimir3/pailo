"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Clock,
  Heart,
  Plus,
  ShoppingCart,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch, apiPost } from "@/lib/api";

interface MaterialItem {
  id: string;
  material_code: string;
  name: string;
  category: string;
  unit_of_measure: string;
  supplier_id: string | null;
  supplier_name: string | null;
  minimum_stock: number;
  current_stock: number;
  average_cost_npr: number | null;
  last_purchase_cost_npr: number | null;
  location: string | null;
  reorder_point: number | null;
  reorder_quantity: number | null;
  lead_time_days: number | null;
  daily_consumption_rate: number | null;
  days_until_stockout: number | null;
  days_until_reorder: number | null;
  risk: string;
  version: number;
}

interface PurchaseSuggestion {
  material_id: string;
  material_name: string;
  material_code: string;
  category: string;
  unit: string;
  current_stock: number;
  current_available: number;
  reorder_point: number;
  suggested_quantity: number;
  estimated_cost_npr: number | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  lead_time_days: number | null;
  daily_consumption_rate: number | null;
  days_until_stockout: number | null;
  urgency: string;
}

interface Movement {
  id: string;
  movement_code: string;
  material_name: string;
  movement_type: string;
  quantity: number;
  unit: string;
  reason: string | null;
  created_at: string;
}

function riskTone(risk: string): "green" | "amber" | "red" | "neutral" {
  switch (risk) {
    case "ok": return "green";
    case "low": return "amber";
    case "critical": return "red";
    default: return "neutral";
  }
}

function urgencyTone(urgency: string): "green" | "amber" | "red" | "neutral" {
  switch (urgency) {
    case "critical": return "red";
    case "warning": return "amber";
    case "info": return "green";
    default: return "neutral";
  }
}

function daysLabel(days: number | null): { text: string; tone: "green" | "amber" | "red" | "neutral" } {
  if (days === null) return { text: "No data", tone: "neutral" };
  if (days <= 0) return { text: "OUT", tone: "red" };
  if (days <= 3) return { text: `${days}d left`, tone: "red" };
  if (days <= 7) return { text: `${days}d left`, tone: "amber" };
  return { text: `${days}d left`, tone: "green" };
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [showReceive, setShowReceive] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials", search],
    queryFn: () => apiFetch<MaterialItem[]>(`/api/v1/inventory/materials/full?search=${encodeURIComponent(search)}`),
  });

  const { data: suggestions } = useQuery({
    queryKey: ["purchase-suggestions"],
    queryFn: () => apiFetch<PurchaseSuggestion[]>("/api/v1/inventory/purchase-suggestions"),
  });

  const { data: movements } = useQuery({
    queryKey: ["movements"],
    queryFn: () => apiFetch<Movement[]>("/api/v1/inventory/movements"),
  });

  const { data: alertCount } = useQuery({
    queryKey: ["alert-count"],
    queryFn: () => apiFetch<{ unacknowledged: number }>("/api/v1/inventory/alerts/count"),
  });

  const criticalCount = materials?.filter(m => m.risk === "critical").length ?? 0;
  const lowCount = materials?.filter(m => m.risk === "low").length ?? 0;
  const healthyCount = materials?.filter(m => m.risk === "ok").length ?? 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["materials"] });
    queryClient.invalidateQueries({ queryKey: ["movements"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-suggestions"] });
    queryClient.invalidateQueries({ queryKey: ["alert-count"] });
  };

  return (
    <FactoryShell
      eyebrow="Stock truth"
      title="Inventory"
      description="Material stock, depletion tracking, and reorder alerts."
      actions={
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => setShowReceive(true)}>
            <ArrowDownToLine size={16} /> Receive
          </button>
          <button className="btn btn-secondary" onClick={() => setShowIssue(true)}>
            <ArrowUpFromLine size={16} /> Issue
          </button>
          <button className="btn btn-secondary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Material
          </button>
          <Link href="/inventory/health" className="btn btn-secondary">
            <Heart size={16} /> Health
          </Link>
        </div>
      }
    >
      {/* Risk Summary KPIs */}
      <section className="kpi-grid" style={{ marginBottom: "1.5rem" }}>
        <GlassCard className="kpi-card tone-red">
          <span>Critical</span>
          <strong>{criticalCount}</strong>
          <p>Immediate action needed</p>
        </GlassCard>
        <GlassCard className="kpi-card tone-amber">
          <span>Low stock</span>
          <strong>{lowCount}</strong>
          <p>Running low, plan reorder</p>
        </GlassCard>
        <GlassCard className="kpi-card tone-green">
          <span>Healthy</span>
          <strong>{healthyCount}</strong>
          <p>Adequate stock levels</p>
        </GlassCard>
        <GlassCard className="kpi-card tone-cyan">
          <span>Alerts</span>
          <strong>{alertCount?.unacknowledged ?? 0}</strong>
          <p><Link href="/inventory/alerts" style={{ textDecoration: "underline" }}>View alerts</Link></p>
        </GlassCard>
      </section>

      {/* Purchase Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <GlassCard className="ops-panel ops-panel-wide" style={{ marginBottom: "1.5rem" }}>
          <PanelHeader>
            <div>
              <p className="eyebrow">Action required</p>
              <h2>Materials to order</h2>
            </div>
            <ShoppingCart aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="ops-list">
            {suggestions.map((s) => {
              const dl = daysLabel(s.days_until_stockout);
              return (
                <div className="ops-list-row" key={s.material_id} style={{ alignItems: "center" }}>
                  <span style={{ flex: "1 1 0" }}>
                    <strong>{s.material_name}</strong>
                    <small>{s.material_code} &middot; {s.category}</small>
                  </span>
                  <span style={{ textAlign: "right", minWidth: "80px" }}>
                    <strong>{s.current_stock} {s.unit}</strong>
                    <small>Order {s.suggested_quantity} {s.unit}</small>
                  </span>
                  <span style={{ textAlign: "right", minWidth: "100px" }}>
                    {s.estimated_cost_npr ? <strong>NPR {s.estimated_cost_npr.toLocaleString()}</strong> : null}
                    {s.supplier_name ? <small>{s.supplier_name}</small> : <small>No supplier</small>}
                  </span>
                  <span style={{ display: "flex", gap: "0.4rem", alignItems: "center", minWidth: "100px", justifyContent: "flex-end" }}>
                    <Badge tone={urgencyTone(s.urgency)}>{s.urgency}</Badge>
                    <Badge tone={dl.tone}>{dl.text}</Badge>
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <section className="ops-layout-wide">
        <GlassCard className="ops-panel ops-panel-wide">
          <PanelHeader>
            <div>
              <p className="eyebrow">Materials</p>
              <h2>Stock depletion board</h2>
            </div>
            <Boxes aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>

          <div className="form-field" style={{ marginBottom: "1rem" }}>
            <input
              className="form-input"
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <LoadingSkeleton lines={8} />
          ) : materials && materials.length > 0 ? (
            <div className="ops-inventory-table">
              {materials.map((material) => {
                const dl = daysLabel(material.days_until_stockout);
                return (
                  <div className="ops-inventory-row" key={material.id}>
                    <span style={{ flex: "2 1 0" }}>
                      <strong>{material.name}</strong>
                      <small>{material.material_code} &middot; {material.supplier_name ?? "No supplier"} &middot; {material.location ?? "—"}</small>
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <strong>{material.current_stock} {material.unit_of_measure}</strong>
                      <small>Min {material.minimum_stock}{material.reorder_point ? ` / Reorder ${material.reorder_point}` : ""}</small>
                    </span>
                    <span style={{ display: "flex", gap: "0.35rem", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {material.daily_consumption_rate ? (
                        <Badge tone="neutral">
                          <Clock size={12} style={{ marginRight: "2px" }} />
                          {material.daily_consumption_rate}/d
                        </Badge>
                      ) : null}
                      <Badge tone={dl.tone}>{dl.text}</Badge>
                      <Badge tone={riskTone(material.risk)}>{material.risk}</Badge>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Boxes size={28} />}
              title="No materials registered"
              description="Add raw materials to track inventory."
            />
          )}
        </GlassCard>

        <GlassCard className="ops-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">History</p>
              <h2>Recent movements</h2>
            </div>
            <Truck aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          {movements && movements.length > 0 ? (
            <div className="ops-list">
              {movements.slice(0, 20).map((mov) => (
                <div className="ops-list-row" key={mov.id}>
                  <span>
                    <strong>{mov.material_name}</strong>
                    <small>{mov.movement_type} &middot; {mov.reason ?? "—"}</small>
                  </span>
                  <Badge tone={mov.movement_type === "receive" ? "green" : "amber"}>
                    {mov.movement_type === "receive" ? "+" : "-"}{mov.quantity} {mov.unit}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Truck size={28} />} title="No movements" description="Stock movements will appear here." />
          )}
        </GlassCard>
      </section>

      <ReceiveStockSheet
        open={showReceive}
        onClose={() => setShowReceive(false)}
        materials={materials ?? []}
        onSuccess={() => { invalidateAll(); setShowReceive(false); }}
      />
      <IssueStockSheet
        open={showIssue}
        onClose={() => setShowIssue(false)}
        materials={materials ?? []}
        onSuccess={() => { invalidateAll(); setShowIssue(false); }}
      />
      <CreateMaterialSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { invalidateAll(); setShowCreate(false); }}
      />
    </FactoryShell>
  );
}

function ReceiveStockSheet({
  open,
  onClose,
  materials,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  materials: MaterialItem[];
  onSuccess: () => void;
}) {
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<unknown>("/api/v1/inventory/receive", data),
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || !quantity || !unitCost) return;
    mutation.mutate({
      material_id: materialId,
      quantity: Number(quantity),
      unit_cost_npr: Number(unitCost),
      notes: notes || null,
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Receive stock">
      <form onSubmit={handleSubmit}>
        <FormSelect
          label="Material"
          value={materialId}
          onChange={setMaterialId}
          options={materials.map((m) => ({ value: m.id, label: `${m.material_code} - ${m.name}` }))}
          required
        />
        <FormInput label="Quantity" value={quantity} onChange={setQuantity} type="number" required />
        <FormInput label="Unit cost (NPR)" value={unitCost} onChange={setUnitCost} type="number" required />
        <FormTextarea label="Notes" value={notes} onChange={setNotes} />
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Recording..." : "Receive stock"}
        </button>
      </form>
    </BottomSheet>
  );
}

function IssueStockSheet({
  open,
  onClose,
  materials,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  materials: MaterialItem[];
  onSuccess: () => void;
}) {
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<unknown>("/api/v1/inventory/issue", data),
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || !quantity || !workOrderId) return;
    mutation.mutate({
      material_id: materialId,
      quantity: Number(quantity),
      work_order_id: workOrderId,
      notes: notes || null,
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Issue stock to work order">
      <form onSubmit={handleSubmit}>
        <FormSelect
          label="Material"
          value={materialId}
          onChange={setMaterialId}
          options={materials.map((m) => ({ value: m.id, label: `${m.material_code} - ${m.name} (${m.current_stock} avail)` }))}
          required
        />
        <FormInput label="Quantity" value={quantity} onChange={setQuantity} type="number" required />
        <FormInput label="Work order ID" value={workOrderId} onChange={setWorkOrderId} required placeholder="Paste work order UUID" />
        <FormTextarea label="Notes" value={notes} onChange={setNotes} />
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Issuing..." : "Issue stock"}
        </button>
      </form>
    </BottomSheet>
  );
}

function CreateMaterialSheet({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("leather");
  const [unit, setUnit] = useState("sqft");
  const [minStock, setMinStock] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [location, setLocation] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [reorderQty, setReorderQty] = useState("");
  const [leadTime, setLeadTime] = useState("");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<unknown>("/api/v1/inventory/materials", data),
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !unit) return;
    mutation.mutate({
      name,
      category,
      unit_of_measure: unit,
      minimum_stock: minStock ? Number(minStock) : 0,
      average_cost_npr: avgCost ? Number(avgCost) : null,
      location: location || null,
      reorder_point: reorderPoint ? Number(reorderPoint) : null,
      reorder_quantity: reorderQty ? Number(reorderQty) : null,
      lead_time_days: leadTime ? Number(leadTime) : null,
    });
  };

  const categories = ["leather", "fabric", "sole", "adhesive", "thread", "hardware", "packaging", "other"];
  const units = ["sqft", "meters", "pairs", "kg", "liters", "pieces", "rolls"];

  return (
    <BottomSheet open={open} onClose={onClose} title="New material">
      <form onSubmit={handleSubmit}>
        <FormInput label="Material name" value={name} onChange={setName} required />
        <FormSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={categories.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
        />
        <FormSelect
          label="Unit of measure"
          value={unit}
          onChange={setUnit}
          options={units.map((u) => ({ value: u, label: u }))}
        />
        <FormInput label="Minimum stock level" value={minStock} onChange={setMinStock} type="number" />
        <FormInput label="Average cost (NPR)" value={avgCost} onChange={setAvgCost} type="number" />
        <FormInput label="Storage location" value={location} onChange={setLocation} />

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
          <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>Reorder settings</p>
          <FormInput
            label="Reorder point"
            value={reorderPoint}
            onChange={setReorderPoint}
            type="number"
          />
          <FormInput
            label="Reorder quantity"
            value={reorderQty}
            onChange={setReorderQty}
            type="number"
          />
          <FormInput
            label="Supplier lead time (days)"
            value={leadTime}
            onChange={setLeadTime}
            type="number"
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={mutation.isPending} style={{ marginTop: "1rem" }}>
          {mutation.isPending ? "Creating..." : "Add material"}
        </button>
      </form>
    </BottomSheet>
  );
}