import { Factory, PackageCheck } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { loadOperationsData, numberLabel, percent, shortDate } from "@/lib/operations-data";

export default async function WorkOrdersPage() {
  const data = await loadOperationsData();

  return (
    <FactoryShell description="Batch state, size-line progress, and approved style/cost context live together here." eyebrow="Production planning" title="Work orders">
      <section className="ops-layout-wide">
        <GlassCard className="ops-panel ops-panel-wide">
          <PanelHeader><div><p className="eyebrow">Batches</p><h2>Active work orders</h2></div><PackageCheck aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          {data.catalog.work_orders.length > 0 ? (
          <div className="ops-card-grid">
            {data.catalog.work_orders.map((order) => (
              <section className="ops-order-card" key={order.id}>
                <div className="ops-row-head"><strong>{order.work_order_code}</strong><Badge tone={order.blocker ? "red" : "green"}>{order.status}</Badge></div>
                <h3>{order.style_name}</h3>
                <p>{order.current_stage ?? "Planning"} / Due {shortDate(order.due_date)} / NPR {numberLabel(order.cost_snapshot_npr)}</p>
                <div className="quantity-track"><span style={{ width: `${percent(order.completed_pairs, order.planned_pairs)}%` }} /></div>
                <div className="ops-size-grid">
                  {order.size_lines?.map((line) => <div key={line.id}><span>{line.color} {line.size}</span><strong>{line.completed_pairs}/{line.planned_pairs}</strong></div>)}
                </div>
              </section>
            ))}
          </div>
          ) : (
            <EmptyState icon={<PackageCheck size={28} />} title="No work orders yet" description="Create your first work order to start tracking production batches, size lines, and stage progress." />
          )}
        </GlassCard>

        <GlassCard className="ops-panel">
          <PanelHeader><div><p className="eyebrow">Styles</p><h2>Approved products</h2></div><Factory aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          {data.catalog.styles.length > 0 ? (
          <div className="ops-list">
            {data.catalog.styles.map((style) => <div className="ops-list-row" key={style.id}><span><strong>{style.style_code}</strong><small>{style.name} / {style.category}</small></span><Badge tone="cyan">NPR {numberLabel(style.target_cost_npr)}</Badge></div>)}
          </div>
          ) : (
            <EmptyState icon={<Factory size={28} />} title="No product styles" description="Add product styles with BOM and costing to plan work orders." />
          )}
        </GlassCard>
      </section>
    </FactoryShell>
  );
}