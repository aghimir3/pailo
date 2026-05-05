"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PackageCheck, Plus, Factory, Zap } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch, apiPost } from "@/lib/api";

interface SizeLine {
  id: string;
  color: string;
  size: string;
  planned_pairs: number;
  completed_pairs: number;
}

interface WorkOrder {
  id: string;
  work_order_code: string;
  style_name: string;
  status: string;
  priority: string;
  planned_pairs: number;
  completed_pairs: number;
  current_stage: string | null;
  due_date: string | null;
  cost_snapshot_npr: number | null;
  blocker: string | null;
  size_lines: SizeLine[];
}

interface ProductStyle {
  id: string;
  style_code: string;
  name: string;
  category: string;
}

function percent(completed: number, planned: number): number {
  if (!planned) return 0;
  return Math.min(100, Math.round((completed / planned) * 100));
}

function shortDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function WorkOrdersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [generateConfirm, setGenerateConfirm] = useState<string | null>(null);

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ["work-orders"],
    queryFn: () => apiFetch<WorkOrder[]>("/api/v1/work-orders"),
  });

  const { data: styles } = useQuery({
    queryKey: ["styles-list"],
    queryFn: () => apiFetch<ProductStyle[]>("/api/v1/styles"),
  });

  const generateTasksMutation = useMutation({
    mutationFn: (woId: string) => apiPost<unknown>(`/api/v1/work-orders/${woId}/generate-tasks`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      setGenerateConfirm(null);
    },
  });

  return (
    <FactoryShell
      eyebrow="Production planning"
      title="Work orders"
      description="Create and track production batches, size-line progress, and stages."
      actions={
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New work order
        </button>
      }
    >
      <section className="ops-layout-wide">
        <GlassCard className="ops-panel ops-panel-wide">
          <PanelHeader>
            <div>
              <p className="eyebrow">Batches</p>
              <h2>Active work orders</h2>
            </div>
            <PackageCheck aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>

          {isLoading ? (
            <LoadingSkeleton lines={8} />
          ) : workOrders && workOrders.length > 0 ? (
            <div className="ops-card-grid">
              {workOrders.map((order) => (
                <section className="ops-order-card" key={order.id}>
                  <div className="ops-row-head">
                    <strong>{order.work_order_code}</strong>
                    <Badge tone={order.blocker ? "red" : order.status === "in_progress" ? "green" : "cyan"}>
                      {order.status}
                    </Badge>
                  </div>
                  <h3>{order.style_name}</h3>
                  <p>
                    {order.current_stage ?? "Planning"} / Due {shortDate(order.due_date)} / NPR{" "}
                    {order.cost_snapshot_npr ?? "—"}
                  </p>
                  <div className="quantity-track">
                    <span style={{ width: `${percent(order.completed_pairs, order.planned_pairs)}%` }} />
                  </div>
                  <div className="ops-size-grid">
                    {order.size_lines?.map((line) => (
                      <div key={line.id}>
                        <span>
                          {line.color} {line.size}
                        </span>
                        <strong>
                          {line.completed_pairs}/{line.planned_pairs}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setGenerateConfirm(order.id)}
                      type="button"
                    >
                      <Zap size={14} /> Generate tasks
                    </button>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<PackageCheck size={28} />}
              title="No work orders yet"
              description="Create your first work order to start tracking production."
            />
          )}
        </GlassCard>

        <GlassCard className="ops-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Styles</p>
              <h2>Approved products</h2>
            </div>
            <Factory aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          {styles && styles.length > 0 ? (
            <div className="ops-list">
              {styles.map((style) => (
                <div className="ops-list-row" key={style.id}>
                  <span>
                    <strong>{style.style_code}</strong>
                    <small>{style.name} / {style.category}</small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Factory size={28} />} title="No product styles" description="Add product styles first." />
          )}
        </GlassCard>
      </section>

      {/* Create Work Order */}
      <CreateWorkOrderSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        styles={styles ?? []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["work-orders"] });
          setShowCreate(false);
        }}
      />

      {/* Generate Tasks Confirm */}
      <ConfirmDialog
        open={!!generateConfirm}
        title="Generate production tasks"
        description="This will create tasks for cutting, stitching, lasting, sole attachment, finishing, QC, and packing stages."
        confirmLabel="Generate"
        onConfirm={() => generateConfirm && generateTasksMutation.mutate(generateConfirm)}
        onCancel={() => setGenerateConfirm(null)}
      />
    </FactoryShell>
  );
}

function CreateWorkOrderSheet({
  open,
  onClose,
  styles,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  styles: ProductStyle[];
  onSuccess: () => void;
}) {
  const [styleId, setStyleId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [sizeLines, setSizeLines] = useState([{ color: "", size: "", planned_pairs: "" }]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<unknown>("/api/v1/work-orders", data),
    onSuccess,
  });

  const addSizeLine = () => {
    setSizeLines([...sizeLines, { color: "", size: "", planned_pairs: "" }]);
  };

  const updateSizeLine = (index: number, field: string, value: string) => {
    const updated = [...sizeLines];
    updated[index] = { ...updated[index], [field]: value };
    setSizeLines(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = sizeLines
      .filter((l) => l.color && l.size && l.planned_pairs)
      .map((l) => ({ color: l.color, size: l.size, planned_pairs: Number(l.planned_pairs) }));

    if (!styleId || validLines.length === 0) return;

    mutation.mutate({
      product_style_id: styleId,
      priority,
      due_date: dueDate || null,
      size_lines: validLines,
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="New work order">
      <form onSubmit={handleSubmit}>
        <FormSelect
          label="Product style"
          value={styleId}
          onChange={setStyleId}
          options={styles.map((s) => ({ value: s.id, label: `${s.style_code} - ${s.name}` }))}
          required
        />
        <FormSelect
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={[
            { value: "low", label: "Low" },
            { value: "normal", label: "Normal" },
            { value: "high", label: "High" },
            { value: "urgent", label: "Urgent" },
          ]}
        />
        <FormInput label="Due date" value={dueDate} onChange={setDueDate} type="date" />

        <div style={{ marginTop: "1rem" }}>
          <h4 style={{ marginBottom: "0.5rem" }}>Size lines</h4>
          {sizeLines.map((line, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                className="form-input"
                placeholder="Color"
                value={line.color}
                onChange={(e) => updateSizeLine(i, "color", e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Size"
                value={line.size}
                onChange={(e) => updateSizeLine(i, "size", e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Pairs"
                type="number"
                value={line.planned_pairs}
                onChange={(e) => updateSizeLine(i, "planned_pairs", e.target.value)}
              />
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" type="button" onClick={addSizeLine}>
            + Add size line
          </button>
        </div>

        <button className="btn btn-primary" type="submit" disabled={mutation.isPending} style={{ marginTop: "1rem" }}>
          {mutation.isPending ? "Creating..." : "Create work order"}
        </button>
      </form>
    </BottomSheet>
  );
}