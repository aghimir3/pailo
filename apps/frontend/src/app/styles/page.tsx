"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Factory, Plus, ChevronRight } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch, apiPost, apiPatch } from "@/lib/api";

interface ProductStyle {
  id: string;
  style_code: string;
  name: string;
  category: string;
  description: string | null;
  size_range: string | null;
  sample_status: string;
  target_cost_npr: number | null;
  target_mrp_npr: number | null;
  notes: string | null;
  created_at: string;
  version: number;
}

interface BomItem {
  id: string;
  material_id: string;
  material_code: string;
  material_name: string;
  quantity_per_pair: number;
  wastage_percent: number;
  cost_snapshot_npr: number;
  line_cost_npr: number;
}

interface BomVersion {
  id: string;
  version: number;
  status: string;
  notes: string | null;
  total_cost_per_pair_npr: number;
  items: BomItem[];
  approved_at: string | null;
  created_at: string;
}

interface StyleDetail extends ProductStyle {
  active_bom: BomVersion | null;
}

const CATEGORIES = ["sneaker", "formal", "sandal", "boot", "casual", "sport"];
const STATUSES = ["concept", "sampling", "approved", "discontinued"];

export default function StylesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: styles, isLoading } = useQuery({
    queryKey: ["styles", search],
    queryFn: () => apiFetch<ProductStyle[]>(`/api/v1/styles?search=${encodeURIComponent(search)}`),
  });

  const { data: styleDetail } = useQuery({
    queryKey: ["style-detail", selectedStyle],
    queryFn: () => apiFetch<StyleDetail>(`/api/v1/styles/${selectedStyle}`),
    enabled: !!selectedStyle,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<ProductStyle>("/api/v1/styles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["styles"] });
      setShowCreate(false);
    },
  });

  return (
    <FactoryShell
      eyebrow="Product catalog"
      title="Styles & BOM"
      description="Manage product styles, bill of materials, and cost tracking."
      actions={
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New style
        </button>
      }
    >
      <section className="ops-layout-wide">
        <GlassCard className="ops-panel ops-panel-wide">
          <PanelHeader>
            <div>
              <p className="eyebrow">Catalog</p>
              <h2>Product styles</h2>
            </div>
            <Factory aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>

          <div className="form-field" style={{ marginBottom: "1rem" }}>
            <input
              className="form-input"
              placeholder="Search styles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <LoadingSkeleton lines={6} />
          ) : styles && styles.length > 0 ? (
            <div className="ops-list">
              {styles.map((style) => (
                <button
                  className="ops-list-row"
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  type="button"
                >
                  <span>
                    <strong>{style.style_code}</strong>
                    <small>{style.name} / {style.category}</small>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Badge tone={style.sample_status === "approved" ? "green" : "cyan"}>
                      {style.sample_status}
                    </Badge>
                    {style.target_cost_npr && (
                      <Badge tone="neutral">NPR {style.target_cost_npr}</Badge>
                    )}
                    <ChevronRight size={16} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Factory size={28} />}
              title="No product styles"
              description="Create your first product style to build BOM and cost estimates."
            />
          )}
        </GlassCard>
      </section>

      {/* Create Style Sheet */}
      <CreateStyleSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Style Detail Sheet */}
      {selectedStyle && styleDetail && (
        <StyleDetailSheet
          style={styleDetail}
          open={!!selectedStyle}
          onClose={() => setSelectedStyle(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["styles"] });
            queryClient.invalidateQueries({ queryKey: ["style-detail", selectedStyle] });
          }}
        />
      )}
    </FactoryShell>
  );
}

function CreateStyleSheet({
  open,
  onClose,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("sneaker");
  const [description, setDescription] = useState("");
  const [sizeRange, setSizeRange] = useState("");
  const [targetCost, setTargetCost] = useState("");
  const [targetMrp, setTargetMrp] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      category,
      description: description || null,
      size_range: sizeRange || null,
      target_cost_npr: targetCost ? Number(targetCost) : null,
      target_mrp_npr: targetMrp ? Number(targetMrp) : null,
      notes: notes || null,
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="New product style">
      <form onSubmit={handleSubmit}>
        <FormInput label="Style name" value={name} onChange={setName} required />
        <FormSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
        />
        <FormTextarea label="Description" value={description} onChange={setDescription} />
        <FormInput label="Size range" value={sizeRange} onChange={setSizeRange} placeholder="e.g. 38-44" />
        <FormInput label="Target cost (NPR)" value={targetCost} onChange={setTargetCost} type="number" />
        <FormInput label="Target MRP (NPR)" value={targetMrp} onChange={setTargetMrp} type="number" />
        <FormTextarea label="Notes" value={notes} onChange={setNotes} />
        <button className="btn btn-primary" type="submit" disabled={isLoading || !name}>
          {isLoading ? "Creating..." : "Create style"}
        </button>
      </form>
    </BottomSheet>
  );
}

function StyleDetailSheet({
  style,
  open,
  onClose,
  onUpdate,
}: {
  style: StyleDetail;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPatch<ProductStyle>(`/api/v1/styles/${style.id}`, { ...data, version: style.version }),
    onSuccess: () => {
      onUpdate();
      setEditing(false);
    },
  });

  return (
    <BottomSheet open={open} onClose={onClose} title={style.style_code}>
      <div className="style-detail">
        <div className="style-detail-header">
          <h3>{style.name}</h3>
          <Badge tone={style.sample_status === "approved" ? "green" : "cyan"}>
            {style.sample_status}
          </Badge>
        </div>

        <div className="style-detail-meta">
          <div><strong>Category:</strong> {style.category}</div>
          <div><strong>Size range:</strong> {style.size_range || "—"}</div>
          <div><strong>Target cost:</strong> {style.target_cost_npr ? `NPR ${style.target_cost_npr}` : "—"}</div>
          <div><strong>Target MRP:</strong> {style.target_mrp_npr ? `NPR ${style.target_mrp_npr}` : "—"}</div>
          {style.description && <div><strong>Description:</strong> {style.description}</div>}
          {style.notes && <div><strong>Notes:</strong> {style.notes}</div>}
        </div>

        {/* BOM Section */}
        <div className="style-detail-bom">
          <h4>Bill of Materials</h4>
          {style.active_bom ? (
            <>
              <div className="bom-header">
                <Badge tone="green">v{style.active_bom.version} - {style.active_bom.status}</Badge>
                <strong>NPR {style.active_bom.total_cost_per_pair_npr}/pair</strong>
              </div>
              <div className="bom-table">
                {style.active_bom.items.map((item) => (
                  <div className="bom-row" key={item.id}>
                    <span><strong>{item.material_name}</strong> <small>({item.material_code})</small></span>
                    <span>{item.quantity_per_pair} +{item.wastage_percent}% = NPR {item.line_cost_npr.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-text">No approved BOM yet.</p>
          )}
        </div>

        <div className="style-detail-actions">
          {!editing ? (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
              Edit style
            </button>
          ) : (
            <EditStyleForm
              style={style}
              onSubmit={(data) => updateMutation.mutate(data)}
              onCancel={() => setEditing(false)}
              isLoading={updateMutation.isPending}
            />
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

function EditStyleForm({
  style,
  onSubmit,
  onCancel,
  isLoading,
}: {
  style: ProductStyle;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(style.name);
  const [category, setCategory] = useState(style.category);
  const [status, setStatus] = useState(style.sample_status);
  const [targetCost, setTargetCost] = useState(style.target_cost_npr?.toString() ?? "");
  const [targetMrp, setTargetMrp] = useState(style.target_mrp_npr?.toString() ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      category,
      sample_status: status,
      target_cost_npr: targetCost ? Number(targetCost) : null,
      target_mrp_npr: targetMrp ? Number(targetMrp) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormInput label="Name" value={name} onChange={setName} required />
      <FormSelect
        label="Category"
        value={category}
        onChange={setCategory}
        options={CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
      />
      <FormSelect
        label="Status"
        value={status}
        onChange={setStatus}
        options={STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
      />
      <FormInput label="Target cost (NPR)" value={targetCost} onChange={setTargetCost} type="number" />
      <FormInput label="Target MRP (NPR)" value={targetMrp} onChange={setTargetMrp} type="number" />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="btn btn-primary" type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
