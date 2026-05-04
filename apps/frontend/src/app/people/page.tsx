import { Users } from "lucide-react";
import Link from "next/link";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { loadOperationsData } from "@/lib/operations-data";

export default async function PeoplePage() {
  const data = await loadOperationsData();

  return (
    <FactoryShell
      description="Users, roles, and employee references are managed as part of the factory app, not a separate admin portal."
      eyebrow="Access and people"
      title="People"
      actions={
        <Button asChild variant="glass">
          <Link href="/people/users">Manage Users</Link>
        </Button>
      }
    >
      <section className="ops-two-column">
        <GlassCard className="ops-panel">
          <PanelHeader><div><p className="eyebrow">App users</p><h2>Access roles</h2></div><Users aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          {data.catalog.users.length > 0 ? (
          <div className="ops-list">{data.catalog.users.map((user) => <div className="ops-list-row" key={user.id}><span><strong>{user.display_name}</strong><small>{user.email ?? "No email"}</small></span><Badge tone={user.role === "owner_admin" ? "cyan" : "neutral"}>{user.role.replaceAll("_", " ")}</Badge></div>)}</div>
          ) : (
            <EmptyState icon={<Users size={28} />} title="No users yet" description="Invite team members to give them access to the factory app." />
          )}
        </GlassCard>
        <GlassCard className="ops-panel">
          <PanelHeader><div><p className="eyebrow">Employees</p><h2>Factory staff</h2></div><Users aria-hidden="true" className="panel-icon" size={22} /></PanelHeader>
          {data.catalog.employees.length > 0 ? (
          <div className="ops-list">{data.catalog.employees.map((employee) => <div className="ops-list-row" key={employee.id}><span><strong>{employee.full_name}</strong><small>{employee.employee_code} / {employee.department ?? "No department"}</small></span><Badge tone="neutral">{employee.job_title ?? "Staff"}</Badge></div>)}</div>
          ) : (
            <EmptyState icon={<Users size={28} />} title="No employees registered" description="Add employees with their department and wage details to assign tasks." />
          )}
        </GlassCard>
      </section>
    </FactoryShell>
  );
}