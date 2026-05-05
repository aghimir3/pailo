"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, HardHat, MoreVertical, Pencil, Phone, Plus, Trash2, X } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAccessToken } from "@/lib/auth";

const API_BASE_URL = "";

interface EmployeeRecord {
  id: string;
  employee_code: string;
  full_name: string;
  phone: string | null;
  department: string | null;
  job_title: string | null;
  wage_type: string | null;
  wage_rate_npr: number | null;
  start_date: string | null;
  status: string;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
}

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; employee: EmployeeRecord }
  | { type: "delete"; employee: EmployeeRecord };

function statusTone(status: string): "green" | "amber" | "neutral" {
  if (status === "active") return "green";
  if (status === "probation") return "amber";
  return "neutral";
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={backdropRef} className="user-modal-backdrop" onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}>
      <div className="user-modal" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

function ActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="user-action-menu-wrap">
      <button className="user-action-trigger" onClick={() => setOpen(!open)} aria-label="Employee actions">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="user-action-dropdown">
          <button onClick={() => { onEdit(); setOpen(false); }}>
            <Pencil size={14} /> Edit
          </button>
          <button className="destructive" onClick={() => { onDelete(); setOpen(false); }}>
            <Trash2 size={14} /> Deactivate
          </button>
        </div>
      )}
    </div>
  );
}

export default function EmployeesPage() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "closed" });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formJobTitle, setFormJobTitle] = useState("");
  const [formWageType, setFormWageType] = useState("");
  const [formWageRate, setFormWageRate] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEmergencyName, setFormEmergencyName] = useState("");
  const [formEmergencyPhone, setFormEmergencyPhone] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEmployees = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/v1/employees`, { headers });
      if (!res.ok) throw new Error(`Failed to load employees: ${res.status}`);
      setEmployees(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    fetchEmployees();
  }, [fetchEmployees]);

  const openCreate = () => {
    setFormName("");
    setFormPhone("");
    setFormDepartment("");
    setFormJobTitle("");
    setFormWageType("");
    setFormWageRate("");
    setFormAddress("");
    setFormEmergencyName("");
    setFormEmergencyPhone("");
    setFormStatus("active");
    setFormError(null);
    setModal({ type: "create" });
  };

  const openEdit = (emp: EmployeeRecord) => {
    setFormName(emp.full_name);
    setFormPhone(emp.phone ?? "");
    setFormDepartment(emp.department ?? "");
    setFormJobTitle(emp.job_title ?? "");
    setFormWageType(emp.wage_type ?? "");
    setFormWageRate(emp.wage_rate_npr?.toString() ?? "");
    setFormAddress(emp.address ?? "");
    setFormEmergencyName(emp.emergency_contact_name ?? "");
    setFormEmergencyPhone(emp.emergency_contact_phone ?? "");
    setFormStatus(emp.status);
    setFormError(null);
    setModal({ type: "edit", employee: emp });
  };

  const openDelete = (emp: EmployeeRecord) => {
    setModal({ type: "delete", employee: emp });
  };

  const closeModal = () => {
    setModal({ type: "closed" });
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const body: Record<string, unknown> = { full_name: formName };
      if (formPhone) body.phone = formPhone;
      if (formDepartment) body.department = formDepartment;
      if (formJobTitle) body.job_title = formJobTitle;
      if (formWageType) body.wage_type = formWageType;
      if (formWageRate) body.wage_rate_npr = parseFloat(formWageRate);
      if (formAddress) body.address = formAddress;
      if (formEmergencyName) body.emergency_contact_name = formEmergencyName;
      if (formEmergencyPhone) body.emergency_contact_phone = formEmergencyPhone;

      const res = await fetch(`${API_BASE_URL}/api/v1/employees`, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Create failed: ${res.status}`);
      }

      closeModal();
      showToast("Employee created successfully", "success");
      await fetchEmployees();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.type !== "edit") return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const body: Record<string, unknown> = {};
      if (formName !== modal.employee.full_name) body.full_name = formName;
      body.phone = formPhone || null;
      body.department = formDepartment || null;
      body.job_title = formJobTitle || null;
      body.wage_type = formWageType || null;
      body.wage_rate_npr = formWageRate ? parseFloat(formWageRate) : null;
      body.address = formAddress || null;
      body.emergency_contact_name = formEmergencyName || null;
      body.emergency_contact_phone = formEmergencyPhone || null;
      if (formStatus !== modal.employee.status) body.status = formStatus;

      const res = await fetch(`${API_BASE_URL}/api/v1/employees/${modal.employee.id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Update failed: ${res.status}`);
      }

      closeModal();
      showToast("Employee updated", "success");
      await fetchEmployees();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (modal.type !== "delete") return;
    setFormSubmitting(true);

    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/v1/employees/${modal.employee.id}`, { method: "DELETE", headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Delete failed: ${res.status}`);
      }

      closeModal();
      showToast("Employee deactivated", "success");
      await fetchEmployees();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
      closeModal();
    } finally {
      setFormSubmitting(false);
    }
  };

  const isAdmin = currentUser?.role === "owner_admin";
  const isManager = currentUser?.role === "owner_admin" || currentUser?.role === "factory_manager";

  if (loading) {
    return (
      <FactoryShell eyebrow="People" title="Employees">
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      </FactoryShell>
    );
  }

  if (error) {
    return (
      <FactoryShell eyebrow="People" title="Employees">
        <GlassCard className="ops-panel">
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertTriangle size={28} className="text-amber-500" />
            <p className="text-sm">{error}</p>
            <Button onClick={fetchEmployees} variant="glass">Retry</Button>
          </div>
        </GlassCard>
      </FactoryShell>
    );
  }

  return (
    <FactoryShell
      eyebrow="People"
      title="Employees"
      description={`${employees.length} employee${employees.length !== 1 ? "s" : ""} registered`}
      actions={
        isAdmin ? (
          <Button variant="glass" onClick={openCreate}>
            <Plus size={16} className="mr-1.5" /> Add Employee
          </Button>
        ) : undefined
      }
    >
      {toast && (
        <div className={`user-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <GlassCard className="ops-panel">
        <PanelHeader>
          <div><p className="eyebrow">Factory staff</p><h2>All Employees</h2></div>
          <HardHat aria-hidden="true" className="panel-icon" size={22} />
        </PanelHeader>

        <div className="user-table">
          <div className="user-table-header">
            <span className="user-col-name">Employee</span>
            <span className="user-col-role">Department</span>
            <span className="user-col-status">Status</span>
            <span className="user-col-login">Phone</span>
            {isManager && <span className="user-col-actions" />}
          </div>

          {employees.length === 0 ? (
            <EmptyState icon={<HardHat size={28} />} title="No employees yet" description="Add factory employees to assign tasks and enable WhatsApp notifications." />
          ) : (
            employees.map((emp) => (
              <div className="user-table-row" key={emp.id}>
                <div className="user-col-name">
                  <div className="user-avatar">{emp.full_name.charAt(0).toUpperCase()}</div>
                  <div className="user-info">
                    <span className="user-name">{emp.full_name}</span>
                    <span className="user-email">{emp.employee_code} {emp.job_title ? `· ${emp.job_title}` : ""}</span>
                  </div>
                </div>
                <div className="user-col-role">
                  <Badge tone="neutral">{emp.department ?? "—"}</Badge>
                </div>
                <div className="user-col-status">
                  <Badge tone={statusTone(emp.status)}>{emp.status}</Badge>
                </div>
                <div className="user-col-login">
                  {emp.phone ? (
                    <span className="user-login-date flex items-center gap-1"><Phone size={12} /> {emp.phone}</span>
                  ) : (
                    <span className="user-login-date text-gray-400">No phone</span>
                  )}
                </div>
                {isManager && (
                  <div className="user-col-actions">
                    <ActionMenu onEdit={() => openEdit(emp)} onDelete={() => openDelete(emp)} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Create/Edit Modal */}
      <Modal open={modal.type === "create" || modal.type === "edit"} onClose={closeModal}>
        <div className="user-modal-header">
          <div>
            <p className="eyebrow">{modal.type === "create" ? "New employee" : "Edit employee"}</p>
            <h2>{modal.type === "edit" ? modal.employee.full_name : "Add Employee"}</h2>
          </div>
          <button className="user-modal-close" onClick={closeModal} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={modal.type === "create" ? handleCreate : handleUpdate} className="user-modal-body">
          <label className="user-field">
            <span>Full name *</span>
            <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Employee name" autoFocus />
          </label>
          <label className="user-field">
            <span>Phone (WhatsApp)</span>
            <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="9852030953" />
            <small className="text-xs text-gray-400">Used for WhatsApp task notifications</small>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="user-field">
              <span>Department</span>
              <input type="text" value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} placeholder="Cutting, Stitching…" />
            </label>
            <label className="user-field">
              <span>Job title</span>
              <input type="text" value={formJobTitle} onChange={(e) => setFormJobTitle(e.target.value)} placeholder="Operator, Supervisor…" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="user-field">
              <span>Wage type</span>
              <select value={formWageType} onChange={(e) => setFormWageType(e.target.value)}>
                <option value="">None</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="piece_rate">Piece rate</option>
              </select>
            </label>
            <label className="user-field">
              <span>Wage rate (NPR)</span>
              <input type="number" step="0.01" value={formWageRate} onChange={(e) => setFormWageRate(e.target.value)} placeholder="0.00" />
            </label>
          </div>
          <label className="user-field">
            <span>Address</span>
            <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Address" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="user-field">
              <span>Emergency contact</span>
              <input type="text" value={formEmergencyName} onChange={(e) => setFormEmergencyName(e.target.value)} placeholder="Name" />
            </label>
            <label className="user-field">
              <span>Emergency phone</span>
              <input type="tel" value={formEmergencyPhone} onChange={(e) => setFormEmergencyPhone(e.target.value)} placeholder="Phone" />
            </label>
          </div>
          {modal.type === "edit" && (
            <label className="user-field">
              <span>Status</span>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          )}
          {formError && <p className="user-form-error">{formError}</p>}
          <div className="user-modal-actions">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="glass" disabled={formSubmitting}>
              {formSubmitting ? "Saving…" : (modal.type === "create" ? "Add Employee" : "Save Changes")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={modal.type === "delete"} onClose={closeModal}>
        <div className="user-modal-header destructive">
          <div>
            <p className="eyebrow">Confirm deactivation</p>
            <h2>Deactivate employee</h2>
          </div>
          <button className="user-modal-close" onClick={closeModal} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="user-modal-body">
          {modal.type === "delete" && (
            <>
              <div className="user-delete-info">
                <div className="user-avatar lg">{modal.employee.full_name.charAt(0).toUpperCase()}</div>
                <div>
                  <strong>{modal.employee.full_name}</strong>
                  <span>{modal.employee.employee_code}</span>
                </div>
              </div>
              <p className="user-delete-warning">
                This will set the employee&apos;s status to inactive. They will no longer appear in task assignment dropdowns.
              </p>
            </>
          )}
          <div className="user-modal-actions">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="button" variant="glass" className="destructive-btn" onClick={handleDelete} disabled={formSubmitting}>
              <Trash2 size={14} className="mr-1.5" />
              {formSubmitting ? "Deactivating…" : "Deactivate"}
            </Button>
          </div>
        </div>
      </Modal>
    </FactoryShell>
  );
}
