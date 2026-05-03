import { FactoryShell } from "@/components/factory/factory-shell";
import { TasksWorkflow } from "@/components/factory/tasks-workflow";
import { loadOperationsData } from "@/lib/operations-data";

export default async function TasksPage() {
  const data = await loadOperationsData();

  return (
    <FactoryShell
      description="Managers see the whole floor; workers get a compact phone-first assigned-task queue."
      eyebrow="Task control"
      title="Production task board"
    >
      <TasksWorkflow catalog={data.catalog} initialMyTasks={data.myTasks} initialTasks={data.tasks} />
    </FactoryShell>
  );
}