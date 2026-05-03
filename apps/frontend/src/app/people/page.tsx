import { Users } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { loadOperationsData } from "@/lib/operations-data";

export default async function PeoplePage() {
  const data = await loadOperationsData();

  return (
    <FactoryShell description="Users, roles, and employee references are managed as part of the factory app, not a separate admin portal." eyebrow="Access and people" title="People">
      <section className="ops-two-column">
        <GlassCard className="ops-panel">
          <PanelHeader><div><p className="eyebrow">App users</p><h2>Access roles</h2></div><Users aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          <div className="ops-list">{data.catalog.users.map((user) => <div className="ops-list-row" key={user.id}><span><strong>{user.display_name}</strong><small>{user.email ?? "No email"}</small></span><Badge tone={user.role === "owner_admin" ? "cyan" : "neutral"}>{user.role.replaceAll("_", " ")}</Badge></div>)}</div>
        </GlassCard>
        <GlassCard className="ops-panel">
          <PanelHeader><div><p className="eyebrow">Employees</p><h2>Factory staff</h2></div><Users aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          <div className="ops-list">{data.catalog.employees.map((employee) => <div className="ops-list-row" key={employee.id}><span><strong>{employee.full_name}</strong><small>{employee.employee_code} / {employee.department ?? "No department"}</small></span><Badge tone="neutral">{employee.job_title ?? "Staff"}</Badge></div>)}</div>
        </GlassCard>
      </section>
    </FactoryShell>
  );
}