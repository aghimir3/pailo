import { Printer } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { loadOperationsData } from "@/lib/operations-data";

export default async function LabelsPage() {
  const data = await loadOperationsData();

  return (
    <FactoryShell description="A dedicated label workflow keeps production printing separate from work-order and QC screens." eyebrow="Label room" title="Sticker 42 labels">
      <section className="ops-layout-wide">
        <GlassCard className="ops-panel ops-panel-wide">
          <PanelHeader><div><p className="eyebrow">Preview</p><h2>24-up A4 sheet</h2></div><Printer aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          <div className="ops-label-grid">
            <label>Art No.<input defaultValue={data.labelPreview.values.art_no} /></label>
            <label>Colour<input defaultValue={data.labelPreview.values.colour} /></label>
            <label>Size<input defaultValue={data.labelPreview.values.size} /></label>
            <label>MRP<input defaultValue={String(data.labelPreview.values.mrp_npr)} /></label>
          </div>
          <div className="label-sheet" aria-label="Sticker 42 sheet preview">
            {Array.from({ length: data.labelPreview.template.slots_per_page }).map((_, index) => {
              const filled = index < data.labelPreview.slots.length;
              return <div className={filled ? "label-slot filled" : "label-slot"} key={index}>{filled ? <><strong>Pailo</strong><span>{data.labelPreview.values.art_no}</span><span>{data.labelPreview.values.size}</span></> : null}</div>;
            })}
          </div>
        </GlassCard>
        <GlassCard className="ops-panel">
          <PanelHeader><div><p className="eyebrow">Template</p><h2>Approved geometry</h2></div><Printer aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          <div className="ops-list">
            {data.catalog.label_templates.map((template) => <div className="ops-list-row" key={template.id}><span><strong>{template.template_code}</strong><small>{template.columns} x {template.rows} / {template.label_width_mm}mm x {template.label_height_mm}mm</small></span><Badge tone="green">v{template.version}</Badge></div>)}
          </div>
        </GlassCard>
      </section>
    </FactoryShell>
  );
}