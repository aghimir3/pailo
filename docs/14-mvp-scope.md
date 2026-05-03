# Pailo MVP Scope

## MVP Goal

The MVP is a factory control system for Pailo Shoes. It should let Pailo run one real production batch from style setup through work order, tasks, stock movement, QC, labels, and finished goods without relying on a spreadsheet as the source of truth.

The MVP is not an ecommerce site, public catalog, payroll system, or advanced ERP. It is the first internal operating system for daily factory visibility and control.

## Target Users

- Owner/Admin: sees factory health, costs, bottlenecks, stock risks, and production progress.
- Factory Manager: creates work orders, assigns tasks, reviews blocked work, and tracks stages.
- Worker: sees assigned tasks and updates progress quickly from a phone.
- Inventory Clerk: receives materials, issues materials, and checks low stock.
- Quality Inspector: records QC results, defects, rework, and approvals.
- Product/Office Admin: maintains styles, BOMs, suppliers, employees, and label templates.

## Admin Experience Decision

The MVP should include admin capabilities, but not a separate admin portal. Admin and manager tools should live inside the same authenticated factory app with role-aware navigation, permissions, and settings screens.

This keeps the product simpler at launch: one login, one app shell, one API contract, one deployment, and no duplicated screens. It also matches factory reality because owners and managers need to move between dashboard, work orders, tasks, inventory, employees, labels, and settings during the same work session.

MVP admin capabilities should include:

- User and role management.
- Employee setup and role assignment.
- Production stages, task statuses, and board settings.
- Material categories, units of measure, and supplier setup.
- Label template approval and version control.
- Inventory adjustment permissions and required reasons.
- Costing settings such as default wastage and target cost thresholds.
- Audit log access for sensitive changes.

A separate admin portal can be reconsidered later if Pailo adds public customer portals, wholesale users, multi-factory administration, or external partner access.

## MVP Feature Set

### 1. Authentication And Roles

- Login through Cognito-backed identity.
- Invite-only user creation; no public self-signup in the MVP.
- First owner/admin is the deployment-configured `initial_owner_admin_email`, not an inferred AWS root, GitHub, or domain account.
- Gmail addresses are allowed as email usernames, but Google OAuth / `Continue with Google` is not required for MVP login.
- Local app roles for owner/admin, manager, worker, inventory, QC, and office admin.
- Role-aware navigation and permission checks in the backend.
- Basic user-to-employee mapping.

Acceptance:

- The first owner/admin can be invited through Cognito and bootstrapped into the local app role table.
- Public signup is disabled.
- Workers cannot update tasks not assigned to them unless authorized.
- Only managers/admins can create work orders, adjust stock, approve QC, and edit BOM/label templates.

### 2. Operating Dashboard

- Daily planned pairs vs completed pairs.
- Active work orders and current production stage.
- Blocked and overdue tasks.
- Low-stock material alerts.
- QC defect and rework signals.
- Cost pressure against the target cost per pair in NPR.
- Owner insight cards that explain what needs action today.

Acceptance:

- The first authenticated screen is the dashboard.
- The dashboard works on mobile around 390px width without horizontal page scroll.
- Owner can identify the top production blocker within one minute.

### 3. Product Styles And Simple BOM

- Product style list and detail screen.
- Pailo style codes, category, colorways, size range, photos, and notes.
- Simple BOM per style with materials, quantities, units, wastage, and estimated cost.
- Approved BOM version snapshot for work orders.

Acceptance:

- A manager can create a style and enough BOM data to estimate cost per pair.
- Work orders keep their cost snapshot even if material prices change later.

### 4. Materials And Inventory Control

- Raw material list with material code, supplier, unit, current stock, minimum stock, and cost.
- Finished goods stock by style, color, size, production batch, QC status, and label status.
- Inventory movements for receive, issue to work order, adjustment, wastage, and finished goods receipt.
- Manager-required reason for manual adjustments.

Acceptance:

- Stock quantity changes only through inventory movement records.
- Low-stock materials are visible before they block production.
- Finished goods cannot be received as sellable until QC is cleared.

### 5. Work Orders And Production Stages

- Create work order from style, color, size lines, quantity, due date, and priority.
- Track stages: cutting, stitching, lasting, sole attachment, finishing, QC, packing.
- Show planned quantity, completed quantity, blocked reason, and current stage.
- Material requirement preview from the BOM.

Acceptance:

- Pailo can run one production batch through the app from work order creation to finished goods receipt.
- Manager can see stage progress and bottlenecks without asking every worker verbally.

### 6. Task Boards And My Tasks

- Production board grouped by status and stage.
- My Tasks screen for each logged-in user, showing every task assigned directly to that user.
- Create tasks manually and auto-generate basic tasks from a work order.
- Assign tasks to a specific app user, with optional employee and team context for factory reporting.
- Task statuses: backlog, ready, in progress, blocked, waiting for review, done, cancelled.
- Quick worker actions: start, add quantity, add note, mark blocked, upload photo, request review, complete.
- Append-only task status history.
- Task comments on every task-board item. Every authorized participant can add comments, and users can edit only their own comments.
- Phone-friendly comment composer with a clear text area, send action, edit state, retry-safe client message id, and comfortable touch targets.

Acceptance:

- Workers can update assigned tasks from a phone in seconds.
- A user assigned to a task can see it in a focused My Tasks view with status, priority, due time, work order, blocker, and quick actions.
- Managers can assign or reassign a task to an app user without losing employee/team reporting context.
- Blocked tasks require a blocker reason.
- Review-required tasks cannot move to done without manager/QC approval.
- A worker, manager, inventory clerk, or QC user can add a comment to a visible task item from a phone.
- Comment edits are limited to the original author and preserve edit tracking.
- Send and edit controls work without hover, drag/drop, or precision tapping.

### 7. QC And Rework

- QC inspection record for work order or finished batch.
- Defect types, defect quantity, notes, and optional photo.
- Rework task creation from QC failure.
- QC approval gate before finished goods can be dispatched or marked ready.

Acceptance:

- Defects and rework are traceable to style, work order, batch, and task.
- Dashboard shows defect rate and rework count.

### 8. Label Templates And Print Jobs

- Label template list with approved template versions.
- High-priority 24-up A4 label template preset recreated from the root sample Word label document dimensions.
- One-sticker editor for fields the factory changes often: Art No., Colour, Size, MRP, Manufactured By, and origin text such as Made in Nepal.
- 24-up A4 sheet preview matching the current sticker paper: 3 columns x 8 rows.
- Quantity picker that fills slots left-to-right, top-to-bottom; 3 labels fill only the top row, and 25 labels create a second page.
- Per-size quantity entry for work-order label printing.
- Resolve label variables from style, work order, size, batch, price, and manufacturer data.
- Generate print-ready PDF labels from server-side millimeter coordinates, not browser scaling.
- Store print-job history with actor, template version, timestamp, and batch.
- Admin-only calibration offsets and template version approval.

Acceptance:

- Labels use Pailo branding and Pailo style codes only.
- A manager can edit one sticker's values, choose quantity, preview the exact 24-label sheet, and print a PDF for the current sticker paper.
- The first approved template preserves the measured sample Word label document page, label, gap, and slot positions.
- Print history is auditable.

### 9. Suppliers And Purchasing Basics

- Supplier contact list with phone, address, material categories, lead time, and notes.
- Material price history at receive time.
- Supplier shown on low-stock alerts.
- Simple purchasing follow-up task from a stock alert.

Acceptance:

- Owner can see who to call for a blocked or low-stock material.
- New prices do not silently rewrite old work-order cost snapshots.

### 10. Employee Records

- Employee list and detail screen.
- Name, phone, address, emergency contact, role, department, start date, wage type, skills, and status.
- Assign employee to tasks and roles.

Acceptance:

- Managers can assign tasks to real employees.
- Sensitive employee fields remain restricted to admin/HR roles.

### 11. Reports And Exports

- Daily production report.
- Task completion and blocked task report.
- Low-stock report.
- QC defect/rework report.
- Finished goods stock report.
- Basic CSV export for owner/admin.

Acceptance:

- Owner can answer: what was planned, what was completed, what blocked us, what is low, what failed QC, and what is ready.

### 12. Deployment And Operations

- Local Docker Compose run path.
- AWS Terraform infrastructure for `ap-south-1`.
- CI checks for frontend, backend, generated API client, and Terraform.
- ECS image build/deploy workflow after first AWS setup.
- Health endpoints and CloudWatch logs.

Acceptance:

- App can run locally through Docker Compose.
- App can be deployed to AWS ECS/Fargate after AWS account setup and Terraform apply.

## MVP Workflows

### Production Batch Workflow

1. Create product style.
2. Add simple BOM and target cost.
3. Add materials and starting stock.
4. Create work order with size/color quantities.
5. Auto-create production tasks.
6. Issue materials to the work order.
7. Workers update tasks and quantities.
8. Manager reviews blocked/review-needed tasks.
9. QC records inspection and rework if needed.
10. Receive finished goods.
11. Print labels by size and quantity.
12. Owner reviews daily dashboard and reports.

### Label Generator Workflow

1. User selects the approved 24-up A4 label template.
2. User chooses a style, work order, or manual label entry.
3. App shows one large sticker preview with editable Art No., Colour, Size, MRP, Manufactured By, and origin fields.
4. User enters total label quantity or per-size quantities.
5. App generates a 24-slot sheet preview using the measured A4 layout.
6. User prints or downloads the PDF.
7. App records the print job and template version.

### Worker Task Workflow

1. Worker opens My Tasks.
2. Starts assigned task.
3. Adds completed quantity, note, photo, or blocker.
4. Requests review or completes the task.
5. Manager/QC approves when required.

### Inventory Workflow

1. Receive material from supplier.
2. Issue material to work order.
3. Record wastage or adjustment with reason.
4. Receive QC-approved finished goods.
5. Watch low-stock dashboard alerts.

## Out Of Scope For MVP

- Public ecommerce or public marketing site.
- Full payroll and attendance automation.
- Advanced accounting, invoicing, and tax filing.
- Offline sync beyond basic connection-aware UI states.
- Multi-factory or multi-warehouse operations.
- Advanced capacity planning and machine scheduling.
- Customer CRM and wholesale portal.
- Full drag-and-drop label design studio.
- Editing the original binary Word `.doc` file in production.
- Public product verification pages.
- Redis, OpenSearch, Kafka, Kubernetes, or microservices.

## MVP Success Criteria

- One real production batch can be managed end-to-end in the app.
- Employees can see assigned tasks and update them on a phone.
- Manager can see work order progress, blocked tasks, and review-needed tasks.
- Inventory changes are traceable and low stock is visible.
- 24-up A4 labels can be printed accurately from editable label fields and batch/product data.
- QC failures create traceable rework.
- Owner dashboard explains daily output, stock risk, QC risk, cost pressure, and blockers.
- The app runs locally with Docker Compose and has a clear AWS deployment path.

## Suggested Build Order

1. Database foundation: SQLAlchemy models, Alembic, seed data, and permissions.
2. Auth/session shell and role-aware navigation.
3. Product styles, materials, suppliers, and employees CRUD.
4. Work orders and task auto-generation.
5. Worker My Tasks and manager task board.
6. Inventory movements and finished goods receipt.
7. Label generator, calibrated PDF generation, and print history.
8. QC inspections and rework tasks.
9. Reports and dashboard connected to live data.
10. Deployment smoke tests and operational hardening.
