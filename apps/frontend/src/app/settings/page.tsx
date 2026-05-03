"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  GripVertical,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import Link from "next/link";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/* ─── Types ─── */
interface ValueProp {
  title: string;
  desc: string;
  icon: string;
}

interface BuyerCard {
  title: string;
  desc: string;
  icon: string;
  highlight: string;
}

interface LandingPageConfig {
  contact_phone: string;
  hero_badge: string;
  hero_title: string;
  hero_title_highlight: string;
  hero_subtitle: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  why_eyebrow: string;
  why_heading: string;
  value_props: ValueProp[];
  buyers_eyebrow: string;
  buyers_heading: string;
  buyer_cards: BuyerCard[];
  proof_heading: string;
  proof_points: string[];
  proof_cta: string;
  dispatch_card_title: string;
  dispatch_card_text: string;
  footer_tagline: string;
}

const ICON_OPTIONS = [
  "Shield", "Heart", "MapPin", "Handshake", "PackageCheck",
  "Footprints", "Star", "RefreshCw", "Truck", "CheckCircle2", "Sparkles",
];

/* ─── Components ─── */

function SectionHeading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="lpe-section-heading">
      <Icon size={16} aria-hidden="true" />
      <h3>{children}</h3>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="lpe-field">
      <label className="lpe-field-label">{label}</label>
      {multiline ? (
        <textarea
          className="lpe-input lpe-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          className="lpe-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="lpe-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {ICON_OPTIONS.map((icon) => (
        <option key={icon} value={icon}>{icon}</option>
      ))}
    </select>
  );
}

/* ─── Page ─── */
export default function LandingPageEditor() {
  const [config, setConfig] = useState<LandingPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/settings/landing-page`)
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => setError("Failed to load landing page config"))
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(<K extends keyof LandingPageConfig>(key: K, value: LandingPageConfig[K]) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/settings/landing-page`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        setError(`Save failed (${res.status})`);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error — could not save");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Value prop CRUD ─── */
  function updateValueProp(index: number, field: keyof ValueProp, value: string) {
    if (!config) return;
    const updated = [...config.value_props];
    updated[index] = { ...updated[index], [field]: value };
    update("value_props", updated);
  }

  function addValueProp() {
    if (!config) return;
    update("value_props", [...config.value_props, { title: "", desc: "", icon: "Star" }]);
  }

  function removeValueProp(index: number) {
    if (!config) return;
    update("value_props", config.value_props.filter((_, i) => i !== index));
  }

  /* ─── Buyer card CRUD ─── */
  function updateBuyerCard(index: number, field: keyof BuyerCard, value: string) {
    if (!config) return;
    const updated = [...config.buyer_cards];
    updated[index] = { ...updated[index], [field]: value };
    update("buyer_cards", updated);
  }

  function addBuyerCard() {
    if (!config) return;
    update("buyer_cards", [...config.buyer_cards, { title: "", desc: "", icon: "Star", highlight: "" }]);
  }

  function removeBuyerCard(index: number) {
    if (!config) return;
    update("buyer_cards", config.buyer_cards.filter((_, i) => i !== index));
  }

  /* ─── Proof points CRUD ─── */
  function updateProofPoint(index: number, value: string) {
    if (!config) return;
    const updated = [...config.proof_points];
    updated[index] = value;
    update("proof_points", updated);
  }

  function addProofPoint() {
    if (!config) return;
    update("proof_points", [...config.proof_points, ""]);
  }

  function removeProofPoint(index: number) {
    if (!config) return;
    update("proof_points", config.proof_points.filter((_, i) => i !== index));
  }

  /* ─── Render ─── */
  if (loading) {
    return (
      <FactoryShell eyebrow="Settings" title="Landing Page Editor">
        <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
          <Loader2 size={28} className="spin" />
        </div>
      </FactoryShell>
    );
  }

  if (!config) {
    return (
      <FactoryShell eyebrow="Settings" title="Landing Page Editor">
        <div style={{ padding: 32 }}>
          <p>Failed to load config. Is the backend running?</p>
          <Link href="/portal">Back to portal</Link>
        </div>
      </FactoryShell>
    );
  }

  return (
    <FactoryShell
      eyebrow="Settings"
      title="Landing Page Editor"
      description="Edit all content shown on the public landing page"
      actions={
        <>
          {error && <span className="lpe-error">{error}</span>}
          {saved && (
            <span className="lpe-saved">
              <CheckCircle2 size={14} />
              Saved
            </span>
          )}
          <Button variant="default" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
            {saving ? "Saving..." : "Save all changes"}
          </Button>
        </>
      }
    >
      {/* ─── Editor ─── */}
      <div className="lpe-workspace">

        <div className="lpe-grid">
          {/* ─── Contact & General ─── */}
          <GlassCard className="lpe-card">
            <PanelHeader>
              <Phone size={15} />
              Contact & General
            </PanelHeader>
            <div className="lpe-card-body">
              <Field label="Contact phone" value={config.contact_phone} onChange={(v) => update("contact_phone", v)} placeholder="9852030953" />
              <Field label="Footer tagline" value={config.footer_tagline} onChange={(v) => update("footer_tagline", v)} placeholder="Nepal-made footwear that lasts." />
            </div>
          </GlassCard>

          {/* ─── Hero Section ─── */}
          <GlassCard className="lpe-card lpe-card-wide">
            <PanelHeader>
              <Sparkles size={15} />
              Hero Section
            </PanelHeader>
            <div className="lpe-card-body">
              <div className="lpe-row-2">
                <Field label="Badge text" value={config.hero_badge} onChange={(v) => update("hero_badge", v)} />
                <Field label="Primary CTA" value={config.hero_cta_primary} onChange={(v) => update("hero_cta_primary", v)} />
              </div>
              <Field label="Title (before highlight)" value={config.hero_title} onChange={(v) => update("hero_title", v)} />
              <Field label="Title highlight (gradient text)" value={config.hero_title_highlight} onChange={(v) => update("hero_title_highlight", v)} />
              <Field label="Subtitle" value={config.hero_subtitle} onChange={(v) => update("hero_subtitle", v)} multiline />
              <Field label="Secondary CTA" value={config.hero_cta_secondary} onChange={(v) => update("hero_cta_secondary", v)} />
            </div>
          </GlassCard>

          {/* ─── Value Props ─── */}
          <GlassCard className="lpe-card lpe-card-wide">
            <PanelHeader>
              <Type size={15} />
              &ldquo;Why Pailo&rdquo; Section
            </PanelHeader>
            <div className="lpe-card-body">
              <div className="lpe-row-2">
                <Field label="Section eyebrow" value={config.why_eyebrow} onChange={(v) => update("why_eyebrow", v)} />
                <Field label="Section heading" value={config.why_heading} onChange={(v) => update("why_heading", v)} />
              </div>

              <SectionHeading icon={GripVertical}>Value Proposition Cards</SectionHeading>
              {config.value_props.map((vp, i) => (
                <div className="lpe-list-item" key={i}>
                  <div className="lpe-list-item-head">
                    <span className="lpe-list-num">{i + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeValueProp(i)} aria-label="Remove">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="lpe-row-3">
                    <Field label="Title" value={vp.title} onChange={(v) => updateValueProp(i, "title", v)} />
                    <div className="lpe-field">
                      <label className="lpe-field-label">Icon</label>
                      <IconSelect value={vp.icon} onChange={(v) => updateValueProp(i, "icon", v)} />
                    </div>
                  </div>
                  <Field label="Description" value={vp.desc} onChange={(v) => updateValueProp(i, "desc", v)} multiline />
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addValueProp}>
                <Plus size={14} />
                Add value prop
              </Button>
            </div>
          </GlassCard>

          {/* ─── Buyer Cards ─── */}
          <GlassCard className="lpe-card lpe-card-wide">
            <PanelHeader>
              <MessageSquare size={15} />
              &ldquo;For Buyers&rdquo; Section
            </PanelHeader>
            <div className="lpe-card-body">
              <div className="lpe-row-2">
                <Field label="Section eyebrow" value={config.buyers_eyebrow} onChange={(v) => update("buyers_eyebrow", v)} />
                <Field label="Section heading" value={config.buyers_heading} onChange={(v) => update("buyers_heading", v)} />
              </div>

              <SectionHeading icon={GripVertical}>Buyer Cards</SectionHeading>
              {config.buyer_cards.map((bc, i) => (
                <div className="lpe-list-item" key={i}>
                  <div className="lpe-list-item-head">
                    <span className="lpe-list-num">{i + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeBuyerCard(i)} aria-label="Remove">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="lpe-row-3">
                    <Field label="Title" value={bc.title} onChange={(v) => updateBuyerCard(i, "title", v)} />
                    <div className="lpe-field">
                      <label className="lpe-field-label">Icon</label>
                      <IconSelect value={bc.icon} onChange={(v) => updateBuyerCard(i, "icon", v)} />
                    </div>
                  </div>
                  <Field label="Description" value={bc.desc} onChange={(v) => updateBuyerCard(i, "desc", v)} multiline />
                  <Field label="Highlight badge" value={bc.highlight} onChange={(v) => updateBuyerCard(i, "highlight", v)} placeholder="e.g. Restocking made simple" />
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addBuyerCard}>
                <Plus size={14} />
                Add buyer card
              </Button>
            </div>
          </GlassCard>

          {/* ─── Proof Section ─── */}
          <GlassCard className="lpe-card lpe-card-wide">
            <PanelHeader>
              <CheckCircle2 size={15} />
              Proof / Trust Section
            </PanelHeader>
            <div className="lpe-card-body">
              <Field label="Section heading" value={config.proof_heading} onChange={(v) => update("proof_heading", v)} />
              <div className="lpe-row-2">
                <Field label="CTA button text" value={config.proof_cta} onChange={(v) => update("proof_cta", v)} />
                <Field label="Dispatch card title" value={config.dispatch_card_title} onChange={(v) => update("dispatch_card_title", v)} />
              </div>
              <Field label="Dispatch card description" value={config.dispatch_card_text} onChange={(v) => update("dispatch_card_text", v)} multiline />

              <SectionHeading icon={GripVertical}>Proof Points</SectionHeading>
              {config.proof_points.map((point, i) => (
                <div className="lpe-proof-row" key={i}>
                  <span className="lpe-list-num">{i + 1}</span>
                  <input
                    className="lpe-input"
                    value={point}
                    onChange={(e) => updateProofPoint(i, e.target.value)}
                    placeholder="Enter proof point..."
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeProofPoint(i)} aria-label="Remove">
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addProofPoint}>
                <Plus size={14} />
                Add proof point
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </FactoryShell>
  );
}
