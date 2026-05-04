import { Boxes, Truck } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { loadOperationsData, numberLabel, riskTone } from "@/lib/operations-data";

export default async function InventoryPage() {
  const data = await loadOperationsData();

  return (
    <FactoryShell description="Material availability, supplier lead time, and production risk are separated from task execution." eyebrow="Stock truth" title="Inventory">
      <section className="ops-layout-wide">
        <GlassCard className="ops-panel ops-panel-wide">
          <PanelHeader><div><p className="eyebrow">Materials</p><h2>Stock risk board</h2></div><Boxes aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          {data.catalog.materials.length > 0 ? (
          <div className="ops-inventory-table">
            {data.catalog.materials.map((material) => (
              <div className="ops-inventory-row" key={material.id}>
                <span><strong>{material.name}</strong><small>{material.material_code} / {material.location ?? "No location"}</small></span>
                <span><strong>{numberLabel(material.current_quantity)} {material.unit_of_measure}</strong><small>Minimum {numberLabel(material.minimum_stock)}</small></span>
                <Badge tone={riskTone(material.risk)}>{material.risk}</Badge>
              </div>
            ))}
          </div>
          ) : (
            <EmptyState icon={<Boxes size={28} />} title="No materials registered" description="Add raw materials and set minimum stock levels to track inventory risk." />
          )}
        </GlassCard>

        <GlassCard className="ops-panel">
          <PanelHeader><div><p className="eyebrow">Purchasing</p><h2>Suppliers</h2></div><Truck aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          {data.catalog.suppliers.length > 0 ? (
          <div className="ops-list">
            {data.catalog.suppliers.map((supplier) => <div className="ops-list-row" key={supplier.id}><span><strong>{supplier.name}</strong><small>{supplier.phone ?? "No phone"} / {supplier.contact_person ?? "No contact"}</small></span><Badge tone="neutral">{supplier.usual_lead_time_days ?? 0}d</Badge></div>)}
          </div>
          ) : (
            <EmptyState icon={<Truck size={28} />} title="No suppliers added" description="Register suppliers with contact details and lead times." />
          )}
        </GlassCard>
      </section>
    </FactoryShell>
  );
}