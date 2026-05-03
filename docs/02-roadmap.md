# Pailo Software Roadmap

## Roadmap Goals

The roadmap is designed for a factory growing from 100 pairs/day to 1000 pairs/day. Each phase should leave the business with a usable system, not just unfinished software.

## Phase 0: Discovery And Setup

Estimated time: 1 to 2 weeks.

Goals:

- Map the current factory process from material purchase to final packing.
- Collect current label files, including the root Word label sample.
- Define Pailo style code rules.
- List all material categories and units of measure.
- List employee roles and production stages.
- Define task statuses, board columns, and who can assign or complete tasks.
- Decide which reports the owner needs every day.

Deliverables:

- Process map.
- Initial product/style list.
- Initial material list.
- Initial employee list.
- Initial task board workflow.
- Label template requirements.
- First database schema draft.

Success criteria:

- The team agrees on production stages.
- Every material has a clear unit of measure.
- Label fields are known before development starts.

## Phase 1: MVP Factory Control

Estimated time: 4 to 8 weeks.

Build:

- User login and roles.
- Product gallery with photos.
- Style details and simple BOM.
- Supplier contact list.
- Employee records.
- Raw material inventory.
- Finished goods inventory.
- Basic work orders.
- Basic task boards and employee task lists.
- Simple production status by stage.
- Employee task status updates and completion tracking.
- Label template list.
- PDF label generation and printing.
- Daily dashboard.

Main workflows:

1. Add style.
2. Add materials.
3. Create BOM.
4. Create work order.
5. Create and assign tasks.
6. Issue materials.
7. Employees update task status.
8. Mark production progress.
9. Complete and review tasks.
10. Receive finished goods.
11. Print labels.

Success criteria:

- Pailo can manage a full production batch without a spreadsheet.
- Employees can see assigned tasks and update their own status.
- Managers can see blocked, overdue, in-progress, and completed tasks.
- Labels can be printed from product and batch data.
- Low stock items are visible.
- Finished goods stock can be checked by style, color, and size.

## Phase 2: Production Accuracy

Estimated time: 2 to 4 months after MVP.

Build:

- Purchase orders and receiving.
- Material reservation for work orders.
- Inventory movement history.
- QC inspections and defect tracking.
- Rework flow.
- Cost comparison: estimated vs actual.
- Worker/team assignments.
- Task dependencies, blockers, comments, and attachments.
- Manager approval for tasks that require review.
- Attendance basics.
- Better production dashboard.

Success criteria:

- Managers can see which stage is blocking production.
- Managers can see which tasks or employees are blocking production.
- Material stock is updated automatically when issued to work orders.
- Defect rate is tracked by style and production batch.
- Cost variance can be explained.

## Phase 3: Scaling To 1000 Pairs/Day

Estimated time: 4 to 12 months after MVP.

Build:

- Barcode/QR scanning for materials, batches, and finished goods.
- Multi-location inventory if storage expands.
- Production capacity planning.
- Advanced task templates for recurring manufacturing work.
- Employee workload balancing across production lines.
- Machine and maintenance logs.
- Supplier scorecards.
- Batch-level traceability.
- Advanced role permissions.
- Offline sync for production floor devices.
- Stock count and cycle count tools.

Success criteria:

- Production managers can plan capacity by stage.
- Inventory movements are traceable and auditable.
- Stock counts are faster and more accurate.
- Pailo can support multiple teams or lines without losing visibility.
- Pailo can run multiple task boards for production, samples, purchasing, QC, and maintenance.

## Phase 4: Brand And Sales Growth

Estimated time: 12+ months.

Build:

- Customer CRM.
- Wholesale order portal.
- Sales order and dispatch workflow.
- Invoice export or accounting integration.
- Style performance analytics.
- Returns and warranty management.
- Product development pipeline for original Pailo designs.
- Project boards for new product launches, packaging updates, supplier changes, and factory improvement projects.
- Optional public catalog or ecommerce site.

Success criteria:

- Pailo can identify best-selling styles and profitable customers.
- Sales orders can reserve stock or trigger production.
- Returns and defects feed back into design and QC decisions.
- Pailo has data to support original designs, not only popular copies.

## Suggested First 30 Days

Week 1:

- Finalize modules for MVP.
- Photograph current shoe styles.
- List all materials and suppliers.
- Define production stages and labels fields.
- Define task board statuses and sample employee task templates.

Week 2:

- Build database and admin screens.
- Import products, materials, suppliers, and employees.
- Create first label template prototype.

Week 3:

- Build inventory receive/issue flow.
- Build work order flow.
- Build task assignment and employee status update flow.
- Connect label generation to product/batch data.

Week 4:

- Run one real production batch through the app.
- Run one daily task board through the app with real employee updates.
- Compare app stock with physical stock.
- Fix form fields and reports based on real use.

## Metrics To Track From Day One

- Pairs planned per day.
- Pairs completed per day.
- Tasks assigned per day.
- Tasks completed per day.
- Blocked and overdue tasks.
- Defect rate.
- Rework rate.
- Material stockout incidents.
- Average production cost per pair.
- Actual cost vs estimated cost.
- On-time supplier delivery rate.
- Inventory adjustment value.
- Finished goods stock by style/size.
