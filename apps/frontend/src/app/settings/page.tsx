"use client";

import { useEffect, useState } from "react";
import { Pencil, Save, Settings as SettingsIcon, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

interface SiteSetting {
  key: string;
  value: string;
}

const SETTING_LABELS: Record<string, string> = {
  contact_phone: "Contact phone (landing page)",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/settings/public`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSettings(data))
      .catch(() => setSettings([]))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(setting: SiteSetting) {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditValue("");
  }

  async function saveEdit(key: string) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/settings/${key}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: editValue }),
      });
      if (res.ok) {
        const updated: SiteSetting = await res.json();
        setSettings((prev) =>
          prev.map((s) => (s.key === key ? updated : s))
        );
        setEditingKey(null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navigation">
        <div className="brand-lockup">
          <div className="brand-mark">P</div>
          <div>
            <p className="eyebrow">Pailo Shoes</p>
            <h1>Settings</h1>
          </div>
        </div>
        <nav className="nav-stack">
          <Link className="nav-item" href="/portal">
            ← Back to cockpit
          </Link>
        </nav>
      </aside>

      <div className="workspace">
        <header className="workspace-header">
          <div>
            <h2>Site Settings</h2>
            <p className="subtitle">Manage public-facing site information</p>
          </div>
        </header>

        <div className="panel-grid" style={{ maxWidth: 640 }}>
          <GlassCard>
            <PanelHeader>
              <SettingsIcon size={16} />
              Landing Page
            </PanelHeader>

            {loading ? (
              <p className="text-muted" style={{ padding: "16px" }}>
                Loading...
              </p>
            ) : settings.length === 0 ? (
              <p className="text-muted" style={{ padding: "16px" }}>
                No settings found. Run the database migration to seed defaults.
              </p>
            ) : (
              <div className="settings-list">
                {settings.map((s) => (
                  <div className="settings-row" key={s.key}>
                    <div className="settings-label">
                      {SETTING_LABELS[s.key] ?? s.key}
                    </div>
                    {editingKey === s.key ? (
                      <div className="settings-edit">
                        <input
                          className="settings-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                        />
                        <Button
                          variant="default"
                          size="sm"
                          disabled={saving}
                          onClick={() => saveEdit(s.key)}
                        >
                          <Save size={14} />
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="settings-value-row">
                        <span className="settings-value">{s.value}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(s)}
                        >
                          <Pencil size={14} />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
