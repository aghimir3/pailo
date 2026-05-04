import { ShieldCheck } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { loadOperationsData, shortDate } from "@/lib/operations-data";

export default async function QualityPage() {
  const data = await loadOperationsData();

  return (
    <FactoryShell description="Inspection outcomes stay visible before goods move to labels, dispatch, or finished stock." eyebrow="Quality gate" title="QC and rework">
      <GlassCard className="ops-panel">
        <PanelHeader><div><p className="eyebrow">Inspections</p><h2>Recent quality checks</h2></div><ShieldCheck aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
        {data.qualityInspections.length > 0 ? (
        <div className="ops-card-grid">
          {data.qualityInspections.map((inspection) => (
            <section className="ops-order-card" key={inspection.id}>
              <div className="ops-row-head"><strong>{inspection.inspection_code}</strong><Badge tone={inspection.defect_quantity ? "amber" : "green"}>{inspection.status}</Badge></div>
              <h3>{inspection.work_order_code} / {inspection.style_code}</h3>
              <p>{shortDate(inspection.inspected_at)} by {inspection.inspected_by ?? "Unassigned"}</p>
              <div className="ops-size-grid"><div><span>Inspected</span><strong>{inspection.inspected_quantity}</strong></div><div><span>Defects</span><strong>{inspection.defect_quantity}</strong></div></div>
            </section>
          ))}
        </div>
        ) : (
          <EmptyState icon={<ShieldCheck size={28} />} title="No inspections recorded" description="Quality checks will appear here once batches are inspected before dispatch." />
        )}
      </GlassCard>
    </FactoryShell>
  );
}