"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, UserPlus, Users } from "lucide-react";

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
  display_name: string;
  role_name: string;
  role_id: string;
  status: string;
  invite_status: string;
  cognito_sub: string | null;
  last_login_at: string | null;
}

interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
}

function roleTone(role: string): "cyan" | "amber" | "green" | "neutral" | "red" {
  if (role === "owner_admin") return "cyan";
  if (role === "factory_manager") return "amber";
  if (role === "worker") return "green";
  return "neutral";
}

function statusTone(status: string): "green" | "red" | "neutral" {
  if (status === "active") return "green";
  if (status === "disabled") return "red";
  return "neutral";
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    fetchUsers();
  }, [fetchUsers]);

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
        body: JSON.stringify({
          email: formEmail,
          display_name: formName,
          role_id: formRoleId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Create failed: ${res.status}`);
      }

      setShowCreateForm(false);
      setFormEmail("");
      setFormName("");
      setFormRoleId("");
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/v1/users/${editingUser.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          display_name: formName || undefined,
          role_id: formRoleId || undefined,
          status: formStatus || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Update failed: ${res.status}`);
      }

      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setFormSubmitting(false);
    }
  };

  const startEdit = (u: UserRecord) => {
    setEditingUser(u);
    setFormName(u.display_name);
    setFormRoleId(u.role_id);
    setFormStatus(u.status);
    setFormError(null);
  };

  const isAdmin = currentUser?.role === "owner_admin";

  if (loading) {
    return (
      <FactoryShell eyebrow="Access and people" title="User Management">
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      </FactoryShell>
    );
  }

  if (error) {
    return (
      <FactoryShell eyebrow="Access and people" title="User Management">
        <GlassCard className="ops-panel">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button onClick={fetchUsers} variant="glass" className="mt-2">Retry</Button>
        </GlassCard>
      </FactoryShell>
    );
  }

  return (
    <FactoryShell
      eyebrow="Access and people"
      title="User Management"
      description="Manage app users, roles, and access."
      actions={
        isAdmin ? (
          <Button variant="glass" onClick={() => { setShowCreateForm(true); setFormError(null); }}>
            <UserPlus size={16} className="mr-1" /> Invite User
          </Button>
        ) : undefined
      }
    >
      {/* Create User Form */}
      {showCreateForm && (
        <GlassCard className="ops-panel mb-4">
          <PanelHeader>
            <div><p className="eyebrow">New user</p><h2>Invite a user</h2></div>
            <UserPlus aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <form onSubmit={handleCreate} className="space-y-3 p-4">
            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full rounded border bg-transparent px-3 py-2 text-sm"
                placeholder="user@pailoshoes.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Display Name</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded border bg-transparent px-3 py-2 text-sm"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Role</label>
              <select
                required
                value={formRoleId}
                onChange={(e) => setFormRoleId(e.target.value)}
                className="w-full rounded border bg-transparent px-3 py-2 text-sm"
              >
                <option value="">Select role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="glass" disabled={formSubmitting}>
                {formSubmitting ? "Creating..." : "Create User"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Edit User Form */}
      {editingUser && (
        <GlassCard className="ops-panel mb-4">
          <PanelHeader>
            <div><p className="eyebrow">Edit</p><h2>{editingUser.display_name}</h2></div>
            <Shield aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <form onSubmit={handleUpdate} className="space-y-3 p-4">
            <div>
              <label className="block text-xs font-medium mb-1">Display Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded border bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Role</label>
              <select
                value={formRoleId}
                onChange={(e) => setFormRoleId(e.target.value)}
                className="w-full rounded border bg-transparent px-3 py-2 text-sm"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full rounded border bg-transparent px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="glass" disabled={formSubmitting}>
                {formSubmitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Users List */}
      <GlassCard className="ops-panel">
        <PanelHeader>
          <div><p className="eyebrow">App users</p><h2>{users.length} users</h2></div>
          <Users aria-hidden="true" className="panel-icon" size={22} />
        </PanelHeader>
        <div className="ops-list">
          {users.map((u) => (
            <div className="ops-list-row" key={u.id}>
              <span className="flex-1 min-w-0">
                <strong className="block truncate">{u.display_name}</strong>
                <small className="block truncate">{u.email ?? "No email"}</small>
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge tone={roleTone(u.role_name)}>{u.role_name.replaceAll("_", " ")}</Badge>
                <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                {u.cognito_sub && <Badge tone="green">linked</Badge>}
                {isAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => startEdit(u)}>
                    Edit
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </FactoryShell>
  );
}
