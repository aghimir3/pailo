import { AlertTriangle, CheckCircle2, ClipboardList, MessageSquare } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { formatStatus, groupTasks, loadOperationsData, numberLabel, priorityTone, shortDate, taskProgressWidth, taskTone } from "@/lib/operations-data";

export default async function TasksPage() {
  const data = await loadOperationsData();

  return (
    <FactoryShell
      description="Managers see the whole floor; workers get a compact phone-first assigned-task queue."
      eyebrow="Task control"
      title="Production task board"
    >
      <section className="ops-layout-wide">
        <GlassCard className="ops-panel ops-panel-wide ops-board-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Board</p>
              <h2>Work by status</h2>
            </div>
            <ClipboardList aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="ops-board-grid">
            {groupTasks(data.tasks).map((column) => (
              <section className="ops-board-column" key={column.status}>
                <div className="ops-row-head">
                  <span>{formatStatus(column.status)}</span>
                  <Badge tone={column.tasks.length ? taskTone(column.status) : "neutral"}>{column.tasks.length}</Badge>
                </div>
                {column.tasks.map((task) => (
                  <article className="ops-task-card" key={task.id}>
                    <div className="ops-row-head">
                      <Badge tone={taskTone(task.status)}>{formatStatus(task.status)}</Badge>
                      <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                    </div>
                    <h3>{task.title}</h3>
                    <p>{task.work_order_code ?? "General"} / {task.assignee?.display_name ?? "Unassigned"}</p>
                    <div className="quantity-track"><span style={{ width: taskProgressWidth(task) }} /></div>
                    <div className="ops-metadata"><span>{numberLabel(task.completed_quantity)} / {numberLabel(task.estimated_quantity)} {task.unit_of_measure ?? ""}</span><span>{shortDate(task.due_at)}</span></div>
                    {task.blocked_reason ? <p className="ops-warning"><AlertTriangle aria-hidden="true" size={15} />{task.blocked_reason}</p> : null}
                    {task.comments?.slice(0, 2).map((comment) => (
                      <p className="ops-comment" key={comment.id}><MessageSquare aria-hidden="true" size={14} />{comment.author_name}: {comment.comment_text}</p>
                    ))}
                  </article>
                ))}
              </section>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="ops-panel ops-worker-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Worker view</p>
              <h2>My assigned tasks</h2>
            </div>
            <CheckCircle2 aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="ops-phone-list">
            {data.myTasks.map((task) => (
              <section className="ops-phone-task" key={task.id}>
                <div className="ops-row-head"><Badge tone={taskTone(task.status)}>{formatStatus(task.status)}</Badge><span>{task.work_order_code}</span></div>
                <h3>{task.title}</h3>
                <div className="ops-form-grid">
                  <select aria-label="Task status" defaultValue={task.status}>
                    <option value="ready">Ready</option>
                    <option value="in_progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="waiting_for_review">Review</option>
                  </select>
                  <input aria-label="Completed quantity" defaultValue={task.completed_quantity} inputMode="decimal" />
                </div>
                <textarea aria-label="Task note" defaultValue={task.comments?.[0]?.comment_text ?? ""} rows={3} />
                <div className="ops-button-row"><Button size="sm" type="button" variant="glass">Start</Button><Button size="sm" type="button" variant="glass">Block</Button><Button size="sm" type="button">Send</Button></div>
              </section>
            ))}
          </div>
        </GlassCard>
      </section>
    </FactoryShell>
  );
}