"use client";

import type { DragEvent, FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Filter,
  GripVertical,
  Loader2,
  Plus,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import {
  createTask,
  updateTaskStatus,
  type OperationsCatalogResponse,
  type TaskCreateRequest,
  type TaskRecord,
} from "@pailo/api-client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";
import { formatStatus, numberLabel, priorityTone, shortDate, taskProgressWidth, taskTone } from "@/lib/operations-data";

type TasksWorkflowProps = {
  catalog: OperationsCatalogResponse;
  initialTasks: TaskRecord[];
  initialMyTasks: TaskRecord[];
};

type TaskStatus = "backlog" | "ready" | "in_progress" | "blocked" | "waiting_for_review" | "done" | "cancelled";

type TaskFormState = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: string;
  assignedToUserId: string;
  assignedToEmployeeId: string;
  assignedTeam: string;
  workOrderId: string;
  dueAt: string;
  estimatedQuantity: string;
  unitOfMeasure: string;
  requiresReview: boolean;
};

const taskStatuses: TaskStatus[] = ["backlog", "ready", "in_progress", "blocked", "waiting_for_review", "done", "cancelled"];
const createStatuses: TaskStatus[] = ["backlog", "ready", "in_progress", "waiting_for_review"];
const priorities = ["low", "normal", "medium", "high", "urgent"];

export function TasksWorkflow({ catalog, initialMyTasks, initialTasks }: TasksWorkflowProps) {
  const defaultUser = catalog.users.find((user) => user.role === "worker") ?? catalog.users[0];
  const defaultEmployee = catalog.employees.find((employee) => employee.full_name.toLowerCase().includes("ram")) ?? catalog.employees[0];
  const managerUsers = catalog.users.filter((user) => ["owner_admin", "factory_manager"].includes(user.role));
  const managerUser = managerUsers.find((user) => user.role === "factory_manager") ?? managerUsers[0] ?? catalog.users[0];
  const workerUserId = initialMyTasks[0]?.assignee?.id ?? defaultUser?.id ?? "";

  const [tasks, setTasks] = useState(initialTasks);
  const [form, setForm] = useState<TaskFormState>(() => initialTaskForm(defaultUser?.id, defaultEmployee?.id));
  const [operatorEmail, setOperatorEmail] = useState(managerUser?.email ?? "milan@pailoshoes.com");
  const [query, setQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Ready to assign work");
  const [isPending, startTransition] = useTransition();

  const filteredTasks = useMemo(
    () => filterTasks(tasks, query, assigneeFilter),
    [assigneeFilter, query, tasks],
  );
  const groupedTasks = useMemo(() => groupByStatus(filteredTasks), [filteredTasks]);
  const myTasks = tasks.filter((task) => task.assignee?.id === workerUserId && !["done", "cancelled"].includes(task.status));
  const taskStats = useMemo(() => buildTaskStats(tasks), [tasks]);

  function setField<TKey extends keyof TaskFormState>(field: TKey, value: TaskFormState[TKey]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setStatusMessage("Task title is required");
      return;
    }

    const payload = taskPayload(form, catalog);
    startTransition(() => {
      void createTask(payload, { userEmail: operatorEmail })
        .then((task) => {
          setTasks((current) => [task, ...current]);
          setForm(initialTaskForm(form.assignedToUserId, form.assignedToEmployeeId));
          setStatusMessage(`Created ${task.task_code} for ${task.assignee?.display_name ?? task.assigned_team ?? "the floor"}`);
        })
        .catch((error: Error) => setStatusMessage(error.message));
    });
  }

  function handleDrop(status: TaskStatus) {
    const task = tasks.find((candidate) => candidate.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task || task.status === status) return;
    moveTask(task, status);
  }

  function moveTask(task: TaskRecord, status: TaskStatus) {
    const blockerReason = blockerReasonForMove(task, status);
    if (status === "blocked" && !blockerReason) {
      setStatusMessage("Blocked tasks need a reason");
      return;
    }

    const completedQuantity = status === "done"
      ? task.estimated_quantity ?? task.completed_quantity
      : task.completed_quantity;

    startTransition(() => {
      void updateTaskStatus(
        task.id,
        {
          new_status: status,
          completed_quantity: completedQuantity,
          blocker_reason: blockerReason,
          update_note: `Moved from ${formatStatus(task.status)} to ${formatStatus(status)} on the board`,
          version: task.version,
        },
        { userEmail: operatorEmail },
      )
        .then((updatedTask) => {
          setTasks((current) => current.map((candidate) => candidate.id === updatedTask.id ? updatedTask : candidate));
          setStatusMessage(`${updatedTask.task_code} moved to ${formatStatus(updatedTask.status)}`);
        })
        .catch((error: Error) => setStatusMessage(error.message));
    });
  }

  return (
    <section className="task-workspace">
      <div className="task-command-grid">
        <GlassCard className="ops-panel task-create-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Create</p>
              <h2>Assign a new task</h2>
            </div>
            <Plus aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>

          <form className="task-create-form" onSubmit={handleCreateTask}>
            <label className="task-form-wide">
              Title
              <input value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="Cut uppers for WO-2026-000001" />
            </label>
            <label>
              App user
              <select value={form.assignedToUserId} onChange={(event) => setField("assignedToUserId", event.target.value)}>
                <option value="">Unassigned</option>
                {catalog.users.map((user) => (
                  <option key={user.id} value={user.id}>{user.display_name} / {formatStatus(user.role)}</option>
                ))}
              </select>
            </label>
            <label>
              Employee
              <select value={form.assignedToEmployeeId} onChange={(event) => setField("assignedToEmployeeId", event.target.value)}>
                <option value="">No employee link</option>
                {catalog.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.employee_code} / {employee.full_name}</option>
                ))}
              </select>
            </label>
            <label>
              Team
              <input value={form.assignedTeam} onChange={(event) => setField("assignedTeam", event.target.value)} placeholder="Cutting" />
            </label>
            <label>
              Work order
              <select value={form.workOrderId} onChange={(event) => setField("workOrderId", event.target.value)}>
                <option value="">General task</option>
                {catalog.work_orders.map((order) => (
                  <option key={order.id} value={order.id}>{order.work_order_code} / {order.style_code}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(event) => setField("priority", event.target.value)}>
                {priorities.map((priority) => <option key={priority} value={priority}>{formatStatus(priority)}</option>)}
              </select>
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => setField("status", event.target.value as TaskStatus)}>
                {createStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
            </label>
            <label>
              Due
              <input type="datetime-local" value={form.dueAt} onChange={(event) => setField("dueAt", event.target.value)} />
            </label>
            <label>
              Estimate
              <input inputMode="decimal" value={form.estimatedQuantity} onChange={(event) => setField("estimatedQuantity", event.target.value)} placeholder="120" />
            </label>
            <label>
              Unit
              <input value={form.unitOfMeasure} onChange={(event) => setField("unitOfMeasure", event.target.value)} placeholder="pairs" />
            </label>
            <label>
              Acting as
              <select value={operatorEmail} onChange={(event) => setOperatorEmail(event.target.value)}>
                {managerUsers.map((user) => (
                  <option key={user.id} value={user.email ?? ""}>{user.display_name} / {formatStatus(user.role)}</option>
                ))}
              </select>
            </label>
            <label className="task-review-toggle">
              <input checked={form.requiresReview} type="checkbox" onChange={(event) => setField("requiresReview", event.target.checked)} />
              Requires manager or QC review
            </label>
            <label className="task-form-wide">
              Description
              <textarea rows={3} value={form.description} onChange={(event) => setField("description", event.target.value)} />
            </label>
            <div className="task-action-row">
              <span>{statusMessage}</span>
              <Button disabled={isPending} type="submit">
                {isPending ? <Loader2 aria-hidden="true" className="spin-icon" size={17} /> : <Send aria-hidden="true" size={17} />}
                Create task
              </Button>
            </div>
          </form>
        </GlassCard>

        <GlassCard className="ops-panel task-control-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Control</p>
              <h2>Live board tools</h2>
            </div>
            <Filter aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="task-stats-grid">
            {taskStats.map((stat) => (
              <div className="task-stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
          <div className="task-filter-grid">
            <label>
              <Search aria-hidden="true" size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, title, work order" />
            </label>
            <label>
              <UserRound aria-hidden="true" size={16} />
              <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
                <option value="all">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {catalog.users.map((user) => <option key={user.id} value={user.id}>{user.display_name}</option>)}
              </select>
            </label>
          </div>
          <div className="task-worker-strip">
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>{myTasks.length} active task{myTasks.length === 1 ? "" : "s"} assigned to {defaultUser?.display_name ?? "the current worker"}</span>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="ops-panel ops-panel-wide ops-board-panel task-board-shell">
        <PanelHeader>
          <div>
            <p className="eyebrow">Board</p>
            <h2>Move work by status</h2>
          </div>
          <ClipboardList aria-hidden="true" className="panel-icon" size={22} />
        </PanelHeader>
        <div className="ops-board-grid task-board-grid">
          {groupedTasks.map((column) => (
            <section
              className={`ops-board-column task-board-column ${draggedTaskId ? "drop-ready" : ""}`}
              key={column.status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(column.status)}
            >
              <div className="ops-row-head">
                <span>{formatStatus(column.status)}</span>
                <Badge tone={column.tasks.length ? taskTone(column.status) : "neutral"}>{column.tasks.length}</Badge>
              </div>
              {column.tasks.length ? column.tasks.map((task) => (
                <TaskCard
                  isBusy={isPending}
                  isDragging={draggedTaskId === task.id}
                  onDragEnd={() => setDraggedTaskId(null)}
                  key={task.id}
                  onDragStart={() => setDraggedTaskId(task.id)}
                  onMove={moveTask}
                  task={task}
                />
              )) : <p className="task-empty-column">No tasks here</p>}
            </section>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="ops-panel ops-worker-panel task-worker-panel">
        <PanelHeader>
          <div>
            <p className="eyebrow">Worker view</p>
            <h2>My assigned tasks</h2>
          </div>
          <CheckCircle2 aria-hidden="true" className="panel-icon" size={22} />
        </PanelHeader>
        <div className="ops-phone-list task-phone-list">
          {myTasks.map((task) => (
            <section className="ops-phone-task" key={task.id}>
              <div className="ops-row-head"><Badge tone={taskTone(task.status)}>{formatStatus(task.status)}</Badge><span>{task.work_order_code ?? "General"}</span></div>
              <h3>{task.title}</h3>
              <p>{quantityLabel(task)} / {shortDate(task.due_at)}</p>
              <div className="quantity-track"><span style={{ width: taskProgressWidth(task) }} /></div>
              {task.blocked_reason ? <p className="ops-warning"><AlertTriangle aria-hidden="true" size={15} />{task.blocked_reason}</p> : null}
              <div className="ops-button-row task-worker-actions">
                <Button disabled={isPending} size="sm" type="button" variant="glass" onClick={() => moveTask(task, "in_progress")}>Start</Button>
                <Button disabled={isPending} size="sm" type="button" variant="glass" onClick={() => moveTask(task, "blocked")}>Block</Button>
                <Button disabled={isPending} size="sm" type="button" onClick={() => moveTask(task, task.requires_review ? "waiting_for_review" : "done")}>{task.requires_review ? "Review" : "Done"}</Button>
              </div>
            </section>
          ))}
          {myTasks.length === 0 ? <p className="task-empty-column">No active assigned tasks</p> : null}
        </div>
      </GlassCard>
    </section>
  );
}

function TaskCard({ isBusy, isDragging, onDragEnd, onDragStart, onMove, task }: {
  isBusy: boolean;
  isDragging: boolean;
  onDragEnd: () => void;
  onDragStart: () => void;
  onMove: (task: TaskRecord, status: TaskStatus) => void;
  task: TaskRecord;
}) {
  return (
    <article
      className={`ops-task-card task-kanban-card ${isDragging ? "dragging" : ""}`}
      draggable={!isBusy}
      onDragEnd={onDragEnd}
      onDragStart={(event: DragEvent<HTMLElement>) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
    >
      <div className="task-card-handle"><GripVertical aria-hidden="true" size={17} /><span>{task.task_code}</span></div>
      <div className="ops-row-head">
        <Badge tone={taskTone(task.status)}>{formatStatus(task.status)}</Badge>
        <Badge tone={priorityTone(task.priority)}>{formatStatus(task.priority)}</Badge>
      </div>
      <h3>{task.title}</h3>
      {task.description ? <p>{task.description}</p> : null}
      <p>{task.work_order_code ?? "General"} / {task.assignee?.display_name ?? task.assigned_employee?.full_name ?? task.assigned_team ?? "Unassigned"}</p>
      <div className="quantity-track"><span style={{ width: taskProgressWidth(task) }} /></div>
      <div className="ops-metadata"><span>{quantityLabel(task)}</span><span>{shortDate(task.due_at)}</span></div>
      {task.blocked_reason ? <p className="ops-warning"><AlertTriangle aria-hidden="true" size={15} />{task.blocked_reason}</p> : null}
      <div className="task-card-controls">
        <select aria-label={`Move ${task.task_code}`} disabled={isBusy} value={task.status} onChange={(event) => onMove(task, event.target.value as TaskStatus)}>
          {taskStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
        </select>
      </div>
      {task.comments?.slice(-2).map((comment) => (
        <p className="ops-comment" key={comment.id}>{comment.author_name}: {comment.comment_text}</p>
      ))}
    </article>
  );
}

function initialTaskForm(assignedToUserId = "", assignedToEmployeeId = ""): TaskFormState {
  return {
    title: "",
    description: "",
    status: "ready",
    priority: "normal",
    assignedToUserId,
    assignedToEmployeeId,
    assignedTeam: "",
    workOrderId: "",
    dueAt: "",
    estimatedQuantity: "",
    unitOfMeasure: "pairs",
    requiresReview: false,
  };
}

function taskPayload(form: TaskFormState, catalog: OperationsCatalogResponse): TaskCreateRequest {
  const workOrder = catalog.work_orders.find((order) => order.id === form.workOrderId);
  const style = workOrder ? catalog.styles.find((candidate) => candidate.style_code === workOrder.style_code) : undefined;
  return {
    title: form.title.trim(),
    description: nullableText(form.description),
    status: form.status,
    priority: form.priority,
    assigned_to_user_id: form.assignedToUserId || null,
    assigned_to_employee_id: form.assignedToEmployeeId || null,
    assigned_team: nullableText(form.assignedTeam),
    work_order_id: form.workOrderId || null,
    product_style_id: style?.id ?? null,
    due_at: form.dueAt ? new Date(form.dueAt).toISOString() : null,
    estimated_quantity: nullableText(form.estimatedQuantity),
    unit_of_measure: nullableText(form.unitOfMeasure),
    requires_review: form.requiresReview,
  };
}

function nullableText(value: string) {
  const cleanValue = value.trim();
  return cleanValue ? cleanValue : null;
}

function filterTasks(tasks: TaskRecord[], query: string, assigneeFilter: string) {
  const cleanQuery = query.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesQuery = !cleanQuery || [task.task_code, task.title, task.work_order_code, task.assignee?.display_name, task.assigned_team]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(cleanQuery));
    const matchesAssignee = assigneeFilter === "all"
      || (assigneeFilter === "unassigned" && !task.assignee)
      || task.assignee?.id === assigneeFilter;
    return matchesQuery && matchesAssignee;
  });
}

function groupByStatus(tasks: TaskRecord[]) {
  return taskStatuses.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status),
  }));
}

function buildTaskStats(tasks: TaskRecord[]) {
  return [
    { label: "Open", value: tasks.filter((task) => !["done", "cancelled"].includes(task.status)).length },
    { label: "Blocked", value: tasks.filter((task) => task.status === "blocked").length },
    { label: "Review", value: tasks.filter((task) => task.status === "waiting_for_review").length },
    { label: "Done", value: tasks.filter((task) => task.status === "done").length },
  ];
}

function quantityLabel(task: TaskRecord) {
  const unit = task.unit_of_measure ? ` ${task.unit_of_measure}` : "";
  return `${numberLabel(task.completed_quantity)} / ${numberLabel(task.estimated_quantity)}${unit}`;
}

function blockerReasonForMove(task: TaskRecord, status: TaskStatus) {
  if (status !== "blocked") return null;
  if (task.blocked_reason) return task.blocked_reason;
  return window.prompt(`Why is ${task.task_code} blocked?`)?.trim() || null;
}