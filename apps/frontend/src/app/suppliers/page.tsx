"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Truck, Plus, ChevronRight } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch, apiPost, apiPatch } from "@/lib/api";

interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  material_categories: string[];
  payment_terms: string | null;
  usual_lead_time_days: number | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
  version: number;
}

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => apiFetch<Supplier[]>(`/api/v1/suppliers?search=${encodeURIComponent(search)}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<Supplier>("/api/v1/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) =>
      apiPatch<Supplier>(`/api/v1/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setSelectedSupplier(null);
    },
  });

  return (
    <FactoryShell
      eyebrow="Purchasing"
      title="Suppliers"
      description="Manage supplier contacts, lead times, and material categories."
      actions={
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New supplier
        </button>
      }
    >
      <section className="ops-layout-wide">
        <GlassCard className="ops-panel ops-panel-wide">
          <PanelHeader>
            <div>
              <p className="eyebrow">Directory</p>
              <h2>Supplier list</h2>
            </div>
            <Truck aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>

          <div className="form-field" style={{ marginBottom: "1rem" }}>
            <input
              className="form-input"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <LoadingSkeleton lines={6} />
          ) : suppliers && suppliers.length > 0 ? (
            <div className="ops-list">
              {suppliers.map((supplier) => (
                <button
                  className="ops-list-row"
                  key={supplier.id}
                  onClick={() => setSelectedSupplier(supplier)}
                  type="button"
                >
                  <span>
                    <strong>{supplier.supplier_code}</strong>
                    <small>{supplier.name} / {supplier.contact_person ?? "No contact"}</small>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Badge tone="neutral">{supplier.usual_lead_time_days ?? 0}d lead</Badge>
                    {supplier.phone && <small>{supplier.phone}</small>}
                    <ChevronRight size={16} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Truck size={28} />}
              title="No suppliers"
              description="Add your first supplier to track materials and lead times."
            />
          )}
        </GlassCard>
      </section>

      {/* Create Supplier Sheet */}
      <CreateSupplierSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Edit Supplier Sheet */}
      {selectedSupplier && (
        <EditSupplierSheet
          supplier={selectedSupplier}
          open={!!selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onSubmit={(data) => updateMutation.mutate({ id: selectedSupplier.id, ...data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </FactoryShell>
  );
}

function CreateSupplierSheet({
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
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      contact_person: contactPerson || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      payment_terms: paymentTerms || null,
      usual_lead_time_days: leadTime ? Number(leadTime) : null,
      notes: notes || null,
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="New supplier">
      <form onSubmit={handleSubmit}>
        <FormInput label="Company name" value={name} onChange={setName} required />
        <FormInput label="Contact person" value={contactPerson} onChange={setContactPerson} />
        <FormInput label="Phone" value={phone} onChange={setPhone} />
        <FormInput label="Email" value={email} onChange={setEmail} type="email" />
        <FormTextarea label="Address" value={address} onChange={setAddress} />
        <FormInput label="Payment terms" value={paymentTerms} onChange={setPaymentTerms} />
        <FormInput label="Usual lead time (days)" value={leadTime} onChange={setLeadTime} type="number" />
        <FormTextarea label="Notes" value={notes} onChange={setNotes} />
        <button className="btn btn-primary" type="submit" disabled={isLoading || !name}>
          {isLoading ? "Creating..." : "Add supplier"}
        </button>
      </form>
    </BottomSheet>
  );
}

function EditSupplierSheet({
  supplier,
  open,
  onClose,
  onSubmit,
  isLoading,
}: {
  supplier: Supplier;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(supplier.name);
  const [contactPerson, setContactPerson] = useState(supplier.contact_person ?? "");
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [email, setEmail] = useState(supplier.email ?? "");
  const [address, setAddress] = useState(supplier.address ?? "");
  const [paymentTerms, setPaymentTerms] = useState(supplier.payment_terms ?? "");
  const [leadTime, setLeadTime] = useState(supplier.usual_lead_time_days?.toString() ?? "");
  const [notes, setNotes] = useState(supplier.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      contact_person: contactPerson || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      payment_terms: paymentTerms || null,
      usual_lead_time_days: leadTime ? Number(leadTime) : null,
      notes: notes || null,
      version: supplier.version,
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`${supplier.supplier_code} - ${supplier.name}`}>
      <form onSubmit={handleSubmit}>
        <FormInput label="Company name" value={name} onChange={setName} required />
        <FormInput label="Contact person" value={contactPerson} onChange={setContactPerson} />
        <FormInput label="Phone" value={phone} onChange={setPhone} />
        <FormInput label="Email" value={email} onChange={setEmail} type="email" />
        <FormTextarea label="Address" value={address} onChange={setAddress} />
        <FormInput label="Payment terms" value={paymentTerms} onChange={setPaymentTerms} />
        <FormInput label="Usual lead time (days)" value={leadTime} onChange={setLeadTime} type="number" />
        <FormTextarea label="Notes" value={notes} onChange={setNotes} />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save changes"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
