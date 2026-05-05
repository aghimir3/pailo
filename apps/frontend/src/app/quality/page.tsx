"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Plus, AlertTriangle, CheckCircle } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch, apiPost } from "@/lib/api";

interface Defect {
  id: string;
  defect_type: string;
  quantity: number;
  severity: string | null;
  notes: string | null;
}

interface Inspection {
  id: string;
  inspection_code: string;
  work_order_code: string | null;
  inspected_by: string | null;
  inspected_at: string;
  inspected_quantity: number;
  defect_quantity: number;
  status: string;
  notes: string | null;
  defects: Defect[];
}

function shortDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function QualityPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const { data: inspections, isLoading } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => apiFetch<Inspection[]>("/api/v1/quality/inspections/full"),
  });

  return (
    <FactoryShell
      eyebrow="Quality gate"
      title="QC and rework"
      description="Create inspections, log defects, approve or fail batches."
      actions={
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New inspection
        </button>
      }
    >
      <GlassCard className="ops-panel">
        <PanelHeader>
          <div>
            <p className="eyebrow">Inspections</p>
            <h2>Recent quality checks</h2>
          </div>
          <ShieldCheck aria-hidden="true" className="panel-icon" size={22} />
        </PanelHeader>
        {isLoading ? (
          <LoadingSkeleton lines={6} />
        ) : inspections && inspections.length > 0 ? (
          <div className="ops-card-grid">
            {inspections.map((inspection) => (
              <button
                className="ops-order-card"
                key={inspection.id}
                onClick={() => setSelectedInspection(inspection)}
                type="button"
                style={{ cursor: "pointer", textAlign: "left" }}
              >
                <div className="ops-row-head">
                  <strong>{inspection.inspection_code}</strong>
                  <Badge tone={inspection.status === "passed" ? "green" : inspection.status === "failed" ? "red" : "cyan"}>
                    {inspection.status}
                  </Badge>
                </div>
                <h3>{inspection.work_order_code ?? "—"}</h3>
                <p>{shortDate(inspection.inspected_at)} by {inspection.inspected_by ?? "Unassigned"}</p>
                <div className="ops-size-grid">
                  <div><span>Inspected</span><strong>{inspection.inspected_quantity}</strong></div>
                  <div><span>Defects</span><strong>{inspection.defect_quantity}</strong></div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ShieldCheck size={28} />}
            title="No inspections recorded"
            description="Create an inspection to begin quality checks."
          />
        )}
      </GlassCard>

      {/* Create Inspection */}
      <CreateInspectionSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["inspections"] });
          setShowCreate(false);
        }}
      />

      {/* Inspection Detail */}
      {selectedInspection && (
        <InspectionDetailSheet
          inspection={selectedInspection}
          open={!!selectedInspection}
          onClose={() => setSelectedInspection(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["inspections"] })}
        />
      )}
    </FactoryShell>
  );
}

function CreateInspectionSheet({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [workOrderId, setWorkOrderId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<unknown>("/api/v1/quality/inspections", data),
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrderId || !quantity) return;
    mutation.mutate({
      work_order_id: workOrderId,
      inspected_quantity: Number(quantity),
      notes: notes || null,
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="New inspection">
      <form onSubmit={handleSubmit}>
        <FormInput label="Work order ID" value={workOrderId} onChange={setWorkOrderId} required placeholder="Paste work order UUID" />
        <FormInput label="Inspected quantity (pairs)" value={quantity} onChange={setQuantity} type="number" required />
        <FormTextarea label="Notes" value={notes} onChange={setNotes} />
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Start inspection"}
        </button>
      </form>
    </BottomSheet>
  );
}

function InspectionDetailSheet({
  inspection,
  open,
  onClose,
  onUpdate,
}: {
  inspection: Inspection;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [showAddDefect, setShowAddDefect] = useState(false);
  const [defectType, setDefectType] = useState("stitching");
  const [defectQty, setDefectQty] = useState("");
  const [defectSeverity, setDefectSeverity] = useState("minor");
  const [defectNotes, setDefectNotes] = useState("");

  const addDefectMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<unknown>(`/api/v1/quality/inspections/${inspection.id}/defects`, data),
    onSuccess: () => {
      onUpdate();
      setShowAddDefect(false);
      setDefectQty("");
      setDefectNotes("");
    },
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      apiPost<unknown>(`/api/v1/quality/inspections/${inspection.id}/approve`, {
        passed_quantity: inspection.inspected_quantity - inspection.defect_quantity,
      }),
    onSuccess: () => {
      onUpdate();
      onClose();
    },
  });

  const failMutation = useMutation({
    mutationFn: () =>
      apiPost<unknown>(`/api/v1/quality/inspections/${inspection.id}/fail`, {
        failed_quantity: inspection.defect_quantity,
        rework_quantity: inspection.defect_quantity,
        create_rework_task: true,
      }),
    onSuccess: () => {
      onUpdate();
      onClose();
    },
  });

  return (
    <BottomSheet open={open} onClose={onClose} title={inspection.inspection_code}>
      <div>
        <div style={{ marginBottom: "1rem" }}>
          <Badge tone={inspection.status === "passed" ? "green" : inspection.status === "failed" ? "red" : "cyan"}>
            {inspection.status}
          </Badge>
          <span style={{ marginLeft: "0.5rem" }}>{inspection.work_order_code ?? "—"}</span>
        </div>

        <div className="ops-size-grid" style={{ marginBottom: "1rem" }}>
          <div><span>Inspected</span><strong>{inspection.inspected_quantity}</strong></div>
          <div><span>Defects</span><strong>{inspection.defect_quantity}</strong></div>
          <div><span>Pass rate</span><strong>{Math.round(((inspection.inspected_quantity - inspection.defect_quantity) / inspection.inspected_quantity) * 100)}%</strong></div>
        </div>

        {/* Defects list */}
        {inspection.defects.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <h4>Defects found</h4>
            {inspection.defects.map((d) => (
              <div className="ops-list-row" key={d.id}>
                <span><strong>{d.defect_type}</strong> <small>×{d.quantity} ({d.severity})</small></span>
              </div>
            ))}
          </div>
        )}

        {/* Actions for in-progress inspections */}
        {inspection.status === "in_progress" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {!showAddDefect ? (
              <button className="btn btn-secondary" onClick={() => setShowAddDefect(true)} type="button">
                <AlertTriangle size={14} /> Log defect
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!defectQty) return;
                  addDefectMutation.mutate({
                    defect_type: defectType,
                    quantity: Number(defectQty),
                    severity: defectSeverity,
                    notes: defectNotes || null,
                  });
                }}
              >
                <FormSelect
                  label="Defect type"
                  value={defectType}
                  onChange={setDefectType}
                  options={[
                    { value: "stitching", label: "Stitching" },
                    { value: "glue", label: "Glue/adhesive" },
                    { value: "color", label: "Color mismatch" },
                    { value: "material", label: "Material defect" },
                    { value: "sole", label: "Sole issue" },
                    { value: "sizing", label: "Sizing error" },
                    { value: "other", label: "Other" },
                  ]}
                />
                <FormInput label="Quantity" value={defectQty} onChange={setDefectQty} type="number" required />
                <FormSelect
                  label="Severity"
                  value={defectSeverity}
                  onChange={setDefectSeverity}
                  options={[
                    { value: "minor", label: "Minor" },
                    { value: "major", label: "Major" },
                    { value: "critical", label: "Critical" },
                  ]}
                />
                <FormTextarea label="Notes" value={defectNotes} onChange={setDefectNotes} />
                <button className="btn btn-primary" type="submit" disabled={addDefectMutation.isPending}>
                  {addDefectMutation.isPending ? "Adding..." : "Add defect"}
                </button>
              </form>
            )}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button className="btn btn-primary" onClick={() => approveMutation.mutate()} type="button" disabled={approveMutation.isPending}>
                <CheckCircle size={14} /> Approve
              </button>
              <button className="btn btn-danger" onClick={() => failMutation.mutate()} type="button" disabled={failMutation.isPending}>
                <AlertTriangle size={14} /> Fail + Rework
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}