import { BarChart3, FileDown } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { loadOperationsData, operationsTotals } from "@/lib/operations-data";

export default async function ReportsPage() {
  const data = await loadOperationsData();
  const totals = operationsTotals(data);

  return (
    <FactoryShell description="Exports and operating snapshots live in a focused reporting surface." eyebrow="Owner view" title="Reports">
      <section className="ops-two-column">
        <GlassCard className="ops-panel">
          <PanelHeader><div><p className="eyebrow">Snapshot</p><h2>Current operating totals</h2></div><BarChart3 aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          <div className="ops-kpi-grid"><div className="ops-kpi"><span>Pairs planned</span><strong>{totals.plannedPairs}</strong></div><div className="ops-kpi"><span>Pairs complete</span><strong>{totals.completedPairs}</strong></div><div className="ops-kpi"><span>Blocked</span><strong>{totals.blockedCount}</strong></div><div className="ops-kpi"><span>Stock risks</span><strong>{totals.lowStockCount}</strong></div></div>
        </GlassCard>
        <GlassCard className="ops-panel">
          <PanelHeader><div><p className="eyebrow">Exports</p><h2>Download files</h2></div><FileDown aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          <div className="ops-button-row"><Button asChild variant="glass"><a href="http://127.0.0.1:8000/api/v1/reports/tasks.csv">Task CSV</a></Button><Button asChild variant="glass"><a href="http://127.0.0.1:8000/api/v1/reports/low-stock.csv">Low-stock CSV</a></Button><Button asChild><a href="http://127.0.0.1:8000/api/v1/reports/dashboard">Dashboard JSON</a></Button></div>
        </GlassCard>
      </section>
    </FactoryShell>
  );
}