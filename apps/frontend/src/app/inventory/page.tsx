"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Boxes, Truck, Plus, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

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
  minimum_stock: number;
  current_stock: number;
  average_cost_npr: number | null;
  location: string | null;
  risk: string;
  version: number;
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

  const { data: movements } = useQuery({
    queryKey: ["movements"],
    queryFn: () => apiFetch<Movement[]>("/api/v1/inventory/movements"),
  });

  return (
    <FactoryShell
      eyebrow="Stock truth"
      title="Inventory"
      description="Material stock levels, receive/issue movements, and risk tracking."
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-primary" onClick={() => setShowReceive(true)}>
            <ArrowDownToLine size={16} /> Receive
          </button>
          <button className="btn btn-secondary" onClick={() => setShowIssue(true)}>
            <ArrowUpFromLine size={16} /> Issue
          </button>
          <button className="btn btn-secondary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Material
          </button>
        </div>
      }
    >
      <section className="ops-layout-wide">
        <GlassCard className="ops-panel ops-panel-wide">
          <PanelHeader>
            <div>
              <p className="eyebrow">Materials</p>
              <h2>Stock risk board</h2>
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
              {materials.map((material) => (
                <div className="ops-inventory-row" key={material.id}>
                  <span>
                    <strong>{material.name}</strong>
                    <small>{material.material_code} / {material.location ?? "No location"}</small>
                  </span>
                  <span>
                    <strong>{material.current_stock} {material.unit_of_measure}</strong>
                    <small>Min {material.minimum_stock}</small>
                  </span>
                  <Badge tone={riskTone(material.risk)}>{material.risk}</Badge>
                </div>
              ))}
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
                    <small>{mov.movement_type} / {mov.reason ?? "—"}</small>
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

      {/* Receive Stock */}
      <ReceiveStockSheet
        open={showReceive}
        onClose={() => setShowReceive(false)}
        materials={materials ?? []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["materials"] });
          queryClient.invalidateQueries({ queryKey: ["movements"] });
          setShowReceive(false);
        }}
      />

      {/* Issue Stock */}
      <IssueStockSheet
        open={showIssue}
        onClose={() => setShowIssue(false)}
        materials={materials ?? []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["materials"] });
          queryClient.invalidateQueries({ queryKey: ["movements"] });
          setShowIssue(false);
        }}
      />

      {/* Create Material */}
      <CreateMaterialSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["materials"] });
          setShowCreate(false);
        }}
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
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Add material"}
        </button>
      </form>
    </BottomSheet>
  );
}