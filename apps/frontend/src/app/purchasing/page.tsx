"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Plus,
  Truck,
  AlertTriangle,
  Clock,
  Package,
} from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { apiFetch, apiPost } from "@/lib/api";

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  status: string;
  order_date: string | null;
  expected_delivery_date: string | null;
  total_npr: number | null;
  item_count: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface Material {
  id: string;
  name: string;
  material_code: string;
  unit_of_measure: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-500/20 text-zinc-300",
  sent: "bg-blue-500/20 text-blue-300",
  confirmed: "bg-indigo-500/20 text-indigo-300",
  partially_received: "bg-amber-500/20 text-amber-300",
  received: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-red-500/20 text-red-300",
};

export default function PurchasingPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["purchase-orders", statusFilter],
    queryFn: () =>
      apiFetch<PurchaseOrder[]>(
        `/purchasing${statusFilter ? `?status=${statusFilter}` : ""}`
      ),
  });

  const { data: overdue } = useQuery({
    queryKey: ["purchase-orders-overdue"],
    queryFn: () => apiFetch<PurchaseOrder[]>("/purchasing/overdue"),
  });

  if (isLoading) {
    return (
      <FactoryShell eyebrow="Procurement" title="Purchase Orders">
        <LoadingSkeleton />
      </FactoryShell>
    );
  }

  return (
    <FactoryShell
      eyebrow="Procurement"
      title="Purchase Orders"
      actions={
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> New PO
        </Button>
      }
    >
      {/* Overdue Alert */}
      {overdue && overdue.length > 0 && (
        <GlassCard className="border-amber-500/30 mb-4">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            {overdue.length} overdue delivery{overdue.length > 1 ? "ies" : ""}
          </div>
        </GlassCard>
      )}

      {/* Filter Row */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {["", "draft", "sent", "confirmed", "partially_received", "received"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {s || "All"}
            </button>
          )
        )}
      </div>

      {/* Orders List */}
      {!orders || orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="No purchase orders"
          description="Create your first PO to start tracking procurement"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((po) => (
            <GlassCard key={po.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">
                      {po.po_number}
                    </span>
                    <Badge className={STATUS_COLORS[po.status] || ""}>
                      {po.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                    <Truck className="h-3.5 w-3.5" />
                    <span className="truncate">{po.supplier_name}</span>
                  </div>
                </div>
                <div className="text-right">
                  {po.total_npr && (
                    <p className="text-sm font-medium text-white">
                      रू {po.total_npr.toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500">
                    {po.item_count} item{po.item_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {po.expected_delivery_date && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  Due: {new Date(po.expected_delivery_date).toLocaleDateString()}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* Create PO Sheet */}
      <CreatePOSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
          setShowCreate(false);
        }}
      />
    </FactoryShell>
  );
}

function CreatePOSheet({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [items, setItems] = useState([
    { material_id: "", quantity_ordered: "", unit_price_npr: "" },
  ]);

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () => apiFetch<Supplier[]>("/suppliers"),
    enabled: open,
  });

  const { data: materials } = useQuery({
    queryKey: ["materials-list"],
    queryFn: () => apiFetch<Material[]>("/inventory/materials"),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data: object) => apiPost("/purchasing", data),
    onSuccess,
  });

  const addItem = () => {
    setItems([...items, { material_id: "", quantity_ordered: "", unit_price_npr: "" }]);
  };

  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const handleSubmit = () => {
    mutation.mutate({
      supplier_id: supplierId,
      expected_delivery_date: expectedDate || undefined,
      items: items
        .filter((i) => i.material_id && i.quantity_ordered)
        .map((i) => ({
          material_id: i.material_id,
          quantity_ordered: Number(i.quantity_ordered),
          unit_price_npr: Number(i.unit_price_npr) || 0,
        })),
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Create Purchase Order">
      <div className="space-y-4 p-4">
        <FormSelect
          label="Supplier"
          value={supplierId}
          onChange={(val) => setSupplierId(val)}
          options={[
            { value: "", label: "Select supplier..." },
            ...(suppliers?.map((s) => ({ value: s.id, label: s.name })) || []),
          ]}
        />
        <FormInput
          label="Expected Delivery"
          type="date"
          value={expectedDate}
          onChange={(val) => setExpectedDate(val)}
        />

        <div className="border-t border-white/10 pt-3">
          <p className="text-sm font-medium text-zinc-300 mb-2">Items</p>
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
              <FormSelect
                label="Material"
                value={item.material_id}
                onChange={(val) => updateItem(idx, "material_id", val)}
                options={[
                  { value: "", label: "Select..." },
                  ...(materials?.map((m) => ({
                    value: m.id,
                    label: `${m.material_code} - ${m.name}`,
                  })) || []),
                ]}
              />
              <FormInput
                label="Qty"
                type="number"
                value={item.quantity_ordered}
                onChange={(val) => updateItem(idx, "quantity_ordered", val)}
                placeholder="0"
              />
              <FormInput
                label="Price"
                type="number"
                value={item.unit_price_npr}
                onChange={(val) => updateItem(idx, "unit_price_npr", val)}
                placeholder="0"
              />
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addItem} className="text-xs">
            + Add item
          </Button>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!supplierId || items.every((i) => !i.material_id)}
        >
          <Package className="h-4 w-4 mr-1" /> Create PO
        </Button>
      </div>
    </BottomSheet>
  );
}
