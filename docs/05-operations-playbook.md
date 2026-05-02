# Pailo Operations Playbook For Software

This document lists operational habits and software features that can help Pailo scale from 100 pairs/day to 1000 pairs/day.

## Daily Factory Rhythm

Morning:

- Review yesterday's production output.
- Review today's work orders.
- Review today's task board and blocked employee tasks.
- Check material shortages.
- Assign teams to stages.
- Assign task owners and due times.
- Confirm urgent customer orders.

During production:

- Update completed quantities by stage.
- Employees update their task status as work starts, pauses, gets blocked, or finishes.
- Record defects and rework immediately.
- Issue extra material only with a reason.
- Note downtime and machine problems.

End of day:

- Confirm completed pairs.
- Confirm completed tasks and review tasks waiting for approval.
- Receive finished goods into stock.
- Record rejected/rework pairs.
- Compare planned vs actual output.
- Review low stock alerts.
- Print or prepare labels for packed goods.

## Weekly Management Rhythm

- Review best-selling styles.
- Review slow-moving stock.
- Review material usage and wastage.
- Review supplier delivery performance.
- Review defect reasons and rework cost.
- Review worker/team productivity.
- Review overdue, blocked, and completed tasks by employee/team.
- Check whether production cost is staying near target.

## KPIs To Watch

Production:

- Planned pairs/day.
- Completed pairs/day.
- Output by stage.
- Work in progress by stage.
- Bottleneck stage.
- Production lead time.

Inventory:

- Low-stock materials.
- Stockout incidents.
- Inventory adjustment value.
- Dead stock value.
- Material wastage percentage.

Cost:

- Estimated cost per pair.
- Actual cost per pair.
- Labor cost per pair.
- Wastage cost per pair.
- Gross margin by style.

Quality:

- Defect rate.
- Rework rate.
- Rejection rate.
- Top defect categories.
- Defect rate by style and team.

People:

- Attendance rate.
- Tasks assigned per employee.
- Tasks completed per employee.
- Blocked tasks by reason.
- Output by team.
- Skill coverage by production stage.
- Overtime hours.
- Training needs.

## Inventory Discipline

Rules:

- Every purchase receipt must create stock.
- Every production issue must reduce stock.
- Every manual adjustment must require a reason.
- Materials should have minimum stock levels.
- Expiring chemicals should be tracked by batch.
- Stock count should happen regularly, not only when there is a problem.

Suggested stock count approach:

- Count high-value materials weekly.
- Count fast-moving materials weekly.
- Count all materials monthly.
- Compare physical count with app count.
- Investigate large differences.

## Quality Process

Quality should not only happen at the end. Add checks at important stages.

Suggested checks:

- Cutting: material damage, correct pattern, correct quantity.
- Stitching: stitch line, thread color, sizing match.
- Lasting: shape consistency, upper alignment.
- Sole attachment: glue coverage, sole alignment, bonding strength.
- Finishing: marks, excess glue, cleaning.
- Packing: correct size, correct pair, correct label, correct box.

The app should make defect recording fast: select defect type, quantity, severity, photo, and action.

## Scaling From 100 To 1000 Pairs/Day

At 100 pairs/day, one manager can remember many details. At 1000 pairs/day, memory will fail and the system must carry the truth.

Prepare early for:

- Clear stage ownership.
- Material reservations before production starts.
- Barcode/QR labels for batches and stock.
- Separate raw material and finished goods storage locations.
- Maintenance records for machines.
- Training records for workers.
- Supplier lead time tracking.
- Daily dashboards visible to managers.

## Useful Extra Features

These are not all MVP features, but they may help Pailo grow faster.

- QR code on labels that opens a product authenticity or product info page.
- Product development board for new original Pailo styles.
- Photo-based QC history for recurring defects.
- Supplier price comparison by material.
- Automated low-stock WhatsApp/SMS reminders.
- Owner dashboard on phone.
- CSV import/export for accountants.
- Backup export every day.
- Nepali/English interface option.
- Nepali date support if the team needs it.
- Simple customer ordering portal for wholesale buyers.

## Recommended Data Entry Strategy

Do not ask workers to type long forms on the factory floor. Use:

- Dropdowns.
- Big buttons.
- QR/barcode scanning.
- Defaults from the work order.
- Quick quantity inputs.
- Photo upload where text would be slow.

Office/admin users can handle longer forms for product setup, BOM, suppliers, and employee records.

## Brand Growth Notes

Pailo should use the software to learn what sells, what costs too much, and what causes defects. That data can guide original Pailo designs.

Good long-term brand signals:

- Consistent Pailo labels and boxes.
- Clean style codes.
- Better quality consistency than cheaper copies.
- Reliable sizing.
- Clear product photos.
- A few strong signature models instead of too many random designs.

## Suggested Next Documents

After this plan, create:

- Current factory process map.
- Current materials master list.
- Current product/style list.
- Label field checklist.
- MVP screen list.
- Detailed development estimate.
