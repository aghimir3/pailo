# Pailo Task And Project Management Plan

## Goal

Pailo should include a task and project management system where managers can create work, assign it to employees, track progress, see blockers, and mark tasks complete. It should feel similar to sprints or Kanban boards, but the language and workflow should match shoe manufacturing.

This should cover both production tasks and general business projects.

## Why This Matters

At 100 pairs/day, many tasks can be managed verbally. At 1000 pairs/day, verbal tracking will break down. The app should make it clear:

- What needs to be done.
- Who owns each task.
- What is in progress.
- What is blocked.
- What is waiting for review.
- What was completed and when.

## Task Board Types

Pailo can start with a few boards:

- Production Board: daily production tasks tied to work orders.
- Sampling Board: new shoe samples, design changes, approval steps.
- Purchasing Board: supplier follow-ups, purchase orders, material delays.
- Quality Board: inspections, defects, rework, corrective actions.
- Maintenance Board: machine repair, preventive maintenance, tool issues.
- Packaging Board: label printing, box preparation, packing tasks.
- Office Board: HR, payroll inputs, documents, admin work.

## Suggested Board Columns

Keep statuses simple at first:

- Backlog: not ready or not scheduled yet.
- Ready: ready to start.
- In Progress: actively being worked on.
- Blocked: cannot continue because something is missing.
- Waiting For Review: worker says it is done, manager or QC needs to check.
- Done: completed and accepted.
- Cancelled: no longer needed.

Manufacturing-specific boards can show the same tasks grouped by production stage:

- Cutting.
- Stitching.
- Lasting.
- Sole attachment.
- Finishing.
- QC.
- Packing.

## Task Fields

Each task should include:

- Task code.
- Title.
- Description.
- Board.
- Status.
- Priority.
- Assigned employee or team.
- Due date or due time.
- Related work order.
- Related shoe style, color, and size if applicable.
- Related material, supplier, customer, or machine if applicable.
- Estimated quantity.
- Completed quantity.
- Unit of measure.
- Attachments or photos.
- Comments.
- Blocker reason.
- Completion time.
- Reviewer/approver.

## Employee Experience

Each employee should have a simple `My Tasks` screen.

The screen should show:

- Tasks assigned to me today.
- Overdue tasks.
- Priority tasks.
- Tasks waiting for my update.
- Tasks I blocked.
- Tasks waiting for manager review.

Employee actions should be quick:

- Start task.
- Pause task.
- Mark blocked.
- Add update.
- Add quantity completed.
- Upload photo.
- Request review.
- Mark complete if review is not required.

Avoid long forms for workers. Use big buttons, dropdowns, quantity inputs, and optional photo upload.

## Manager Experience

Managers should see:

- Board view by status.
- Calendar/today view.
- Employee workload view.
- Work order task view.
- Blocked task list.
- Overdue task list.
- Tasks waiting for approval.
- Completed task history.

Managers should be able to:

- Create tasks manually.
- Create tasks from templates.
- Auto-generate tasks from a work order.
- Assign or reassign tasks.
- Change due dates and priorities.
- Add comments or attachments.
- Approve/reject completion.
- Convert a blocked task into a purchasing, maintenance, or QC task.

## Auto-Generated Manufacturing Tasks

When a work order is created, the app should be able to generate tasks from templates.

Example for work order `WO-2026-0001`:

- Confirm raw material availability.
- Cut upper material.
- Stitch uppers.
- Prepare soles.
- Attach soles.
- Finish and clean pairs.
- QC inspection.
- Rework failed pairs.
- Print labels.
- Pack finished pairs.
- Receive finished goods into inventory.

Each task can be assigned to the correct employee or team and linked back to the work order.

## Task Templates

Task templates should reduce repeated manual entry.

Useful templates:

- Cutting task.
- Stitching task.
- QC inspection task.
- Label printing task.
- Supplier follow-up task.
- Material receiving task.
- Machine maintenance task.
- New sample approval task.
- Product photo task.

Templates should include default title, description, board, priority, assigned team, expected duration, and required completion fields.

## Status Updates And History

Every task status change should be stored as history.

Example update:

```text
Task: Cut 120 pairs for WO-2026-0001
Employee: Ram
Old status: Ready
New status: In Progress
Update: Started cutting black upper material.
Time: 2026-05-02 09:15
```

Example blocker:

```text
Task: Stitch size 42 uppers
Employee: Sita
Old status: In Progress
New status: Blocked
Blocker: Thread color is not available.
Time: 2026-05-02 11:40
```

This history helps managers understand delays and protects against confusion later.

## Completion And Review

Some tasks can be completed directly by the employee. Others should require review.

Tasks that should usually require review:

- QC inspection.
- Rework completion.
- Material stock adjustment.
- Label template changes.
- Purchase order receiving.
- Finished goods receiving.
- Machine repair completion.

Completion should record:

- Completed by.
- Completed quantity.
- Completion note.
- Photos if needed.
- Completed at.
- Reviewed by if required.
- Reviewed at if required.

## Useful Reports

- Tasks completed today.
- Tasks overdue.
- Tasks blocked by reason.
- Tasks completed by employee.
- Average task completion time.
- Production tasks by work order.
- Tasks waiting for review.
- Repeated blockers by supplier, material, stage, or machine.

## MVP Scope

First version:

- Create task.
- Assign task to employee or team.
- Kanban-style task board.
- My Tasks screen for employees.
- Status updates.
- Comments.
- Blocked reason.
- Completion tracking.
- Basic task history.
- Link task to work order, product style, supplier, or material.

Later versions:

- Auto-generated tasks from work orders.
- Task templates.
- Manager approval workflow.
- Photo proof requirements.
- Calendar view.
- Employee workload balancing.
- QR code scan to open work order task list.
- Offline task updates from factory floor devices.

## Design Note

This should not feel like generic software project management. The board names, task templates, filters, and reports should use factory language: work orders, stages, materials, sizes, pairs, defects, labels, packing, suppliers, and machines.
