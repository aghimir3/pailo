"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, MoreVertical, Pencil, RotateCw, Shield, Trash2, UserPlus, Users, X } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { getAccessToken } from "@/lib/auth";

const API_BASE_URL = "";

interface UserRecord {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  role_name: string;
  role_id: string;
  status: string;
  invite_status: string;
  cognito_sub: string | null;
  employee_id: string | null;
  last_login_at: string | null;
}

interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
}

type ModalState =
  | { type: "closed" }
  | { type: "invite" }
  | { type: "edit"; user: UserRecord }
  | { type: "delete"; user: UserRecord };

// ─── Helpers ───────────────────────────────────────────────────────────

function roleTone(role: string): "cyan" | "amber" | "green" | "neutral" {
  if (role === "owner_admin") return "cyan";
  if (role === "factory_manager") return "amber";
  if (role === "worker") return "green";
  return "neutral";
}

function roleLabel(role: string): string {
  return role.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusIcon(status: string, inviteStatus: string, cognitoSub: string | null) {
  if (status === "disabled") return { tone: "red" as const, label: "Disabled" };
  if (inviteStatus === "invited" && !cognitoSub) return { tone: "amber" as const, label: "Pending" };
  if (inviteStatus === "invited") return { tone: "amber" as const, label: "Invited" };
  return { tone: "green" as const, label: "Active" };
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Modal Component ───────────────────────────────────────────────────

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
    <div
      ref={backdropRef}
      className="user-modal-backdrop"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="user-modal" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

// ─── Action Menu ────────────────────────────────────────────────────────

function ActionMenu({ onEdit, onDelete, onResend, canResend }: { onEdit: () => void; onDelete: () => void; onResend: () => void; canResend: boolean }) {
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
      <button className="user-action-trigger" onClick={() => setOpen(!open)} aria-label="User actions">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="user-action-dropdown">
          <button onClick={() => { onEdit(); setOpen(false); }}>
            <Pencil size={14} /> Edit
          </button>
          {canResend && (
            <button onClick={() => { onResend(); setOpen(false); }}>
              <RotateCw size={14} /> Resend Invite
            </button>
          )}
          <button className="destructive" onClick={() => { onDelete(); setOpen(false); }}>
            <Trash2 size={14} /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "closed" });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/users`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/users/roles`, { headers }),
      ]);

      if (!usersRes.ok) throw new Error(`Failed to load users: ${usersRes.status}`);
      if (!rolesRes.ok) throw new Error(`Failed to load roles: ${rolesRes.status}`);

      setUsers(await usersRes.json());
      setRoles(await rolesRes.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    fetchUsers();
  }, [fetchUsers]);

  const openInvite = () => {
    setFormEmail("");
    setFormName("");
    setFormRoleId("");
    setFormError(null);
    setModal({ type: "invite" });
  };

  const openEdit = (u: UserRecord) => {
    setFormName(u.display_name);
    setFormPhone(u.phone ?? "");
    setFormRoleId(u.role_id);
    setFormStatus(u.status);
    setFormError(null);
    setModal({ type: "edit", user: u });
  };

  const openDelete = (u: UserRecord) => {
    setModal({ type: "delete", user: u });
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/v1/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: formEmail, display_name: formName, role_id: formRoleId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Invite failed: ${res.status}`);
      }

      closeModal();
      showToast(`Invitation sent to ${formEmail}`, "success");
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Invite failed");
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/v1/users/${modal.user.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          display_name: formName || undefined,
          phone: formPhone || null,
          role_id: formRoleId || undefined,
          status: formStatus || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Update failed: ${res.status}`);
      }

      closeModal();
      showToast("User updated successfully", "success");
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleResend = async (u: UserRecord) => {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/v1/users/${u.id}/resend-invite`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Resend failed: ${res.status}`);
      }

      showToast(`Invitation resent to ${u.email}`, "success");
      await fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Resend failed", "error");
    }
  };

  const handleDelete = async () => {
    if (modal.type !== "delete") return;
    setFormSubmitting(true);

    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/v1/users/${modal.user.id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Delete failed: ${res.status}`);
      }

      closeModal();
      showToast("User removed successfully", "success");
      await fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
      closeModal();
    } finally {
      setFormSubmitting(false);
    }
  };

  const isAdmin = currentUser?.role === "owner_admin";

  if (loading) {
    return (
      <FactoryShell eyebrow="People" title="Users">
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      </FactoryShell>
    );
  }

  if (error) {
    return (
      <FactoryShell eyebrow="People" title="Users">
        <GlassCard className="ops-panel">
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertTriangle size={28} className="text-amber-500" />
            <p className="text-sm">{error}</p>
            <Button onClick={fetchUsers} variant="glass">Retry</Button>
          </div>
        </GlassCard>
      </FactoryShell>
    );
  }

  return (
    <FactoryShell
      eyebrow="People"
      title="Users"
      description={`${users.length} team member${users.length !== 1 ? "s" : ""}`}
      actions={
        isAdmin ? (
          <Button variant="glass" onClick={openInvite}>
            <UserPlus size={16} className="mr-1.5" /> Invite
          </Button>
        ) : undefined
      }
    >
      {/* Toast */}
      {toast && (
        <div className={`user-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Users Table */}
      <GlassCard className="ops-panel">
        <PanelHeader>
          <div><p className="eyebrow">Team</p><h2>All Users</h2></div>
          <Users aria-hidden="true" className="panel-icon" size={22} />
        </PanelHeader>

        <div className="user-table">
          <div className="user-table-header">
            <span className="user-col-name">User</span>
            <span className="user-col-role">Role</span>
            <span className="user-col-status">Status</span>
            <span className="user-col-login">Last Login</span>
            {isAdmin && <span className="user-col-actions" />}
          </div>

          {users.length === 0 ? (
            <div className="user-table-empty">
              <Users size={32} opacity={0.3} />
              <p>No team members yet</p>
              {isAdmin && (
                <Button variant="glass" size="sm" onClick={openInvite}>
                  <UserPlus size={14} className="mr-1" /> Invite your first user
                </Button>
              )}
            </div>
          ) : (
            users.map((u) => {
              const st = statusIcon(u.status, u.invite_status, u.cognito_sub);
              const isSelf = u.id === currentUser?.id;
              return (
                <div className="user-table-row" key={u.id}>
                  <div className="user-col-name">
                    <div className="user-avatar">
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <span className="user-name">
                        {u.display_name}
                        {isSelf && <span className="user-you-badge">you</span>}
                      </span>
                      <span className="user-email">{u.email ?? "—"}</span>
                    </div>
                  </div>
                  <div className="user-col-role">
                    <Badge tone={roleTone(u.role_name)}>{roleLabel(u.role_name)}</Badge>
                  </div>
                  <div className="user-col-status">
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="user-col-login">
                    <span className="user-login-date">{formatDate(u.last_login_at)}</span>
                  </div>
                  {isAdmin && (
                    <div className="user-col-actions">
                      {!isSelf && (
                        <ActionMenu
                          onEdit={() => openEdit(u)}
                          onDelete={() => openDelete(u)}
                          onResend={() => handleResend(u)}
                          canResend={u.invite_status === "invited"}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </GlassCard>

      {/* Invite Modal */}
      <Modal open={modal.type === "invite"} onClose={closeModal}>
        <div className="user-modal-header">
          <div>
            <p className="eyebrow">New invitation</p>
            <h2>Invite a team member</h2>
          </div>
          <button className="user-modal-close" onClick={closeModal} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleCreate} className="user-modal-body">
          <p className="user-modal-desc">
            They&apos;ll receive an email with a temporary password to set up their account.
          </p>
          <label className="user-field">
            <span>Email address</span>
            <input
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="name@pailoshoes.com"
              autoFocus
            />
          </label>
          <label className="user-field">
            <span>Display name</span>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Full Name"
            />
          </label>
          <label className="user-field">
            <span>Role</span>
            <select required value={formRoleId} onChange={(e) => setFormRoleId(e.target.value)}>
              <option value="">Select a role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>
              ))}
            </select>
          </label>
          {formError && <p className="user-form-error">{formError}</p>}
          <div className="user-modal-actions">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="glass" disabled={formSubmitting}>
              <Mail size={14} className="mr-1.5" />
              {formSubmitting ? "Sending…" : "Send Invitation"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={modal.type === "edit"} onClose={closeModal}>
        <div className="user-modal-header">
          <div>
            <p className="eyebrow">Edit user</p>
            <h2>{modal.type === "edit" ? modal.user.display_name : ""}</h2>
          </div>
          <button className="user-modal-close" onClick={closeModal} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleUpdate} className="user-modal-body">
          <label className="user-field">
            <span>Display name</span>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </label>
          <label className="user-field">
            <span>Phone (WhatsApp)</span>
            <input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="9852030953"
            />
            <small className="text-xs text-gray-400">Used for WhatsApp task notifications</small>
          </label>
          <label className="user-field">
            <span>Role</span>
            <select value={formRoleId} onChange={(e) => setFormRoleId(e.target.value)}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>
              ))}
            </select>
          </label>
          <label className="user-field">
            <span>Status</span>
            <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          {formError && <p className="user-form-error">{formError}</p>}
          <div className="user-modal-actions">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="glass" disabled={formSubmitting}>
              <Shield size={14} className="mr-1.5" />
              {formSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={modal.type === "delete"} onClose={closeModal}>
        <div className="user-modal-header destructive">
          <div>
            <p className="eyebrow">Confirm removal</p>
            <h2>Remove user</h2>
          </div>
          <button className="user-modal-close" onClick={closeModal} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="user-modal-body">
          {modal.type === "delete" && (
            <>
              <div className="user-delete-info">
                <div className="user-avatar lg">
                  {modal.user.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>{modal.user.display_name}</strong>
                  <span>{modal.user.email}</span>
                </div>
              </div>
              <p className="user-delete-warning">
                This will permanently remove this user from the system and revoke their access.
                This action cannot be undone.
              </p>
            </>
          )}
          <div className="user-modal-actions">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button
              type="button"
              variant="glass"
              className="destructive-btn"
              onClick={handleDelete}
              disabled={formSubmitting}
            >
              <Trash2 size={14} className="mr-1.5" />
              {formSubmitting ? "Removing…" : "Remove User"}
            </Button>
          </div>
        </div>
      </Modal>
    </FactoryShell>
  );
}
