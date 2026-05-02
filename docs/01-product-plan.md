# Pailo Factory Software Plan

## Vision

Build a clean, practical factory management app for Pailo that helps the team run production every day and scale from about 100 pairs/day to 1000 pairs/day.

The app should become the single place where Pailo manages:

- Shoe styles and gallery photos.
- Product specifications, bills of materials, and costing.
- Employee task/project management with manufacturing-style Kanban boards.
- Daily production plans and work orders.
- Raw material and finished goods inventory.
- Employees, attendance, skills, and assignments.
- Supplier contacts, purchase orders, and price history.
- Label templates and printable labels.
- Quality control, defects, rework, and returns.
- Reports for production, stock, cost, profit, and bottlenecks.

## Business Context

Pailo is starting in a price-sensitive market where popular Nike/Puma-style copies are common. The software should support the real factory workflow today, but it should also help Pailo move toward its own brand identity and original designs.

Pailo owns `pailoshoes.com`. Keep the internal factory app on `app.pailoshoes.com` so the root domain can later become the public brand site, catalog, product verification page, or ecommerce storefront.

Important recommendation: keep competitor trademarks, logos, and brand names out of Pailo-generated labels, product names, packaging, invoices, and customer-facing catalog exports. If the team needs to track inspiration, store it internally as reference photos or notes, not as public branding. This reduces legal risk and helps Pailo build long-term brand value.

## Product Principles

- Mobile-first: workers and managers should be able to use phones or tablets on the factory floor.
- Fast daily entry: production and inventory updates should take seconds, not minutes.
- Offline-tolerant: the app should keep working during weak internet and sync later.
- Simple roles: each user should see only what they need for their job.
- One source of truth: stock, costs, production status, labels, and employee records should not live in separate spreadsheets.
- Audit-friendly: important edits should be tracked so the owner can see who changed what.
- Nepal-ready: use NPR currency, local supplier details, simple tax fields, and optional Nepali date support later.

## Users And Roles

- Owner/Admin: full access, dashboards, pricing, cost, profit, settings.
- Factory Manager: production plan, work orders, task boards, bottlenecks, QC, daily output.
- Inventory Clerk: raw material stock, finished goods stock, stock counts, material issue.
- Product/Design Lead: shoe gallery, specifications, BOM, samples, photos.
- Purchasing Lead: suppliers, purchase orders, price comparisons, delivery status.
- HR/Office Admin: employee records, attendance, payroll inputs, documents.
- Quality Inspector: inspections, defects, rework, approvals.
- Sales/Dispatch: customer orders, packing, delivery, finished stock availability.
- Worker: assigned tasks, status updates, stage completion, attendance, piece-rate data if used.

## Core Modules

### 1. Product Gallery And Style Library

Each shoe style should have:

- Pailo style code.
- Name and category.
- Photos from multiple angles.
- Colorways and size range.
- Material list and construction notes.
- Sample approval status.
- Cost estimate and target selling price.
- Internal reference or inspiration notes.
- Related labels, packaging, and print templates.

Suggested style code format:

```text
PAI-2026-SNK-001
PAI-2026-SDL-001
PAI-2026-SCH-001
```

Where `SNK` means sneaker, `SDL` means sandal, and `SCH` means school shoe. The exact categories can be changed.

### 2. Product Specifications And BOM

For each style, store a bill of materials so costing and production are controlled.

Example BOM items:

- Upper material.
- Lining.
- Foam.
- Insole.
- Outsole.
- Lace.
- Thread.
- Adhesive.
- Label.
- Box.
- Packing material.

The BOM should calculate estimated material cost per pair and support wastage percentage. This is important if the current cost is about 900 NPR and Pailo wants to protect margin while scaling.

### 3. Production Planning And Work Orders

The app should convert demand into production batches.

Example workflow:

1. Create or select a shoe style.
2. Choose size/color quantity.
3. Create a work order.
4. Reserve required materials.
5. Issue materials to production.
6. Track stages: cutting, stitching, lasting, sole attachment, finishing, QC, packing.
7. Receive finished goods into inventory.
8. Print labels and packing slips.

Daily production screen should show:

- Planned pairs today.
- Actual pairs completed.
- Work in progress by stage.
- Defective/rework pairs.
- Materials blocking production.
- Worker/team assignments.
- Notes for downtime and machine issues.

### 4. Task And Project Management

Pailo should have a task-management system similar to sprints or Kanban boards, but designed for shoe manufacturing instead of software teams.

The app should support:

- Task boards for production, sampling, purchasing, maintenance, QC, packaging, and office work.
- Columns such as backlog, ready, in progress, blocked, review/QC, done.
- Tasks linked to work orders, shoe styles, suppliers, materials, employees, customers, or machines.
- Individual employee task queues so each person can see what they need to do today.
- Status updates from employees with notes, quantities, photos, and blockers.
- Task assignment to one person or a team.
- Due dates, priorities, tags, and dependencies.
- Completion history so managers can see who completed what and when.
- Manager review or approval for important tasks before they are marked fully complete.

Manufacturing task examples:

- Cut 120 pairs of upper material for work order WO-2026-0001.
- Stitch size 42 black sneaker uppers.
- Check glue stock before tomorrow's production.
- Inspect 30 rejected pairs and assign rework.
- Print labels for completed size 40-44 batch.
- Call supplier about delayed outsole delivery.
- Repair stitching machine 2.
- Photograph new sample for the product gallery.

Each employee should have a simple task screen with:

- My tasks today.
- Priority and due time.
- Current status.
- Start, pause, block, request review, and complete actions.
- Comment/update box.
- Photo upload for proof, defects, or progress.

See [06-task-management-plan.md](06-task-management-plan.md) for detail.

### 5. Inventory Management

Inventory should cover both raw material and finished goods.

Raw material stock should track:

- SKU/material code.
- Name and category.
- Supplier.
- Unit of measure.
- Current stock.
- Minimum stock.
- Average cost.
- Last purchase cost.
- Lot/batch number.
- Location/bin.
- Expiry date for adhesives or chemicals where relevant.

Finished goods stock should track:

- Style.
- Color.
- Size.
- Quantity.
- Production batch.
- QC status.
- Label status.
- Warehouse location.
- Reserved quantity for orders.

Stock movements should be recorded for receiving, issuing, adjustment, wastage, return, and transfer.

### 6. Supplier And Purchasing Management

Supplier records should include:

- Company/contact name.
- Phone, email, address, location.
- Material categories supplied.
- Payment terms.
- Lead time.
- Price history.
- Quality rating.
- Notes and documents.

Purchase order workflow:

1. Low-stock alert identifies material need.
2. Create purchase request or purchase order.
3. Select supplier and expected delivery date.
4. Receive goods into stock.
5. Record invoice and payment status.
6. Update actual cost and supplier score.

### 7. Employee And HR Records

Employee module should start simple and expand over time.

MVP employee fields:

- Name.
- Phone.
- Address.
- Emergency contact.
- Role/department.
- Start date.
- Wage type: salary, daily wage, piece rate, or mixed.
- Skills: cutting, stitching, lasting, finishing, QC, packing.
- Status: active, inactive, probation.
- Documents and notes.

Future HR features:

- Attendance.
- Leave.
- Advances and deductions.
- Payroll export.
- Training records.
- Safety incidents.
- Productivity by team or stage.

### 8. Label Printing And Template Editor

Pailo needs a web-based label template editor so label data is easy to change without editing Word documents manually.

The app should support:

- Editable label templates.
- Variables from product, batch, and order data.
- QR codes or barcodes.
- PDF print output.
- Batch printing for many sizes and quantities.
- Template versioning.
- Optional import/export for DOCX later.

See [04-label-printing-plan.md](04-label-printing-plan.md) for detail.

### 9. Costing, Pricing, And Margin

Costing should be visible before production starts.

Cost inputs:

- Materials from BOM.
- Labor cost.
- Factory overhead allocation.
- Wastage allowance.
- Packaging.
- Label/printing.
- Transport if needed.

Outputs:

- Estimated cost per pair.
- Actual cost per pair after production.
- Wholesale price.
- Retail price.
- Target margin.
- Margin by style, size, order, and customer.

### 10. Quality Control

Quality control should be attached to production batches and finished goods.

Track:

- Inspection checklist by style/category.
- Defect type.
- Defect severity.
- Photo evidence.
- Rework assignment.
- Pass/fail decision.
- Final approval before packing.

Useful defect categories:

- Glue mark.
- Stitching issue.
- Wrong size.
- Color mismatch.
- Sole alignment.
- Material damage.
- Label/packing error.

### 11. Orders, Dispatch, And Customers

Even if the first version is internal, Pailo should prepare for sales/order management.

Track:

- Customer/shop name.
- Sales order.
- Ordered style, color, size, quantity.
- Reserved stock.
- Production requirement if stock is not available.
- Delivery note.
- Invoice number.
- Payment status.

## Dashboards And Reports

Start with these dashboards:

- Daily production: planned vs completed pairs.
- Task board: overdue tasks, blocked tasks, tasks completed today, employee workload.
- Stage bottlenecks: where shoes are waiting.
- Inventory health: low stock, dead stock, fast-moving material.
- Cost and margin: estimated vs actual cost per pair.
- Supplier performance: lead time, price changes, quality issues.
- Employee/team productivity: pairs completed by stage or work order.
- Quality: defect rate, rework rate, top defect causes.

## Recommended Technology Direction

Recommended app type:

- Web app / PWA for desktop, tablet, and phone.
- Local-friendly printing from browser to PDF/label printer.
- Role-based login.
- PostgreSQL database.
- Regular cloud backup.
- Offline-first features added after the core workflow is stable.

The detailed 2026 implementation plan is split into connected technical documents:

- [07-technical-implementation-overview.md](07-technical-implementation-overview.md)
- [08-frontend-implementation-plan.md](08-frontend-implementation-plan.md)
- [09-backend-implementation-plan.md](09-backend-implementation-plan.md)
- [10-database-implementation-plan.md](10-database-implementation-plan.md)
- [11-aws-ecs-deployment-cost-plan.md](11-aws-ecs-deployment-cost-plan.md)
- [12-api-integration-quality-plan.md](12-api-integration-quality-plan.md)

Chosen implementation direction:

- Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui for the frontend.
- FastAPI, Pydantic, SQLAlchemy, and Alembic for the backend.
- PostgreSQL on Amazon RDS for the database.
- Amazon S3 for photos, documents, label assets, and generated PDFs.
- Amazon Cognito for authentication.
- AWS ECS on Fargate for container deployment.

## MVP Scope

The first usable version should include:

- Login and roles.
- Product gallery and style records.
- Task boards and employee task lists.
- Supplier contacts.
- Employee records.
- Raw material inventory.
- Finished goods inventory.
- Basic production work orders.
- Employee status updates and task completion tracking.
- Basic BOM and cost calculation.
- Label template management.
- PDF label printing.
- Dashboard for daily production and low stock.

Do not build ecommerce, complex payroll, accounting, or advanced forecasting first. Those should come after factory data is reliable.

## Risks To Manage Early

- Bad data entry: solve with simple forms, required fields, defaults, and barcode/QR scanning later.
- Task confusion: solve with clear owners, statuses, due dates, and one visible task queue per employee.
- Label layout problems: solve by using fixed print sizes and test sheets before production use.
- Inventory mismatch: solve by recording every receive, issue, adjustment, and stock count.
- Scaling complexity: solve by using work orders and stage tracking early, even if the first version is simple.
- Brand risk: keep Pailo labels and catalog outputs clean of competitor trademarks.
