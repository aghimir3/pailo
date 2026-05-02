# Pailo Suggested Data Model

This is a starting data model for the Pailo factory app. It should be refined after mapping the real workflow.

## Naming Rules

- Use clear IDs for every important object.
- Keep human-friendly codes separate from database IDs.
- Never use supplier or competitor brand names as the main Pailo product code.
- Keep all money values in NPR unless another currency is explicitly needed.
- Track created date, updated date, and updated by for important records.

## Core Entities

### User

For app access, permissions, and mapping Cognito identities to local employee records. Cognito stores passwords, MFA, password reset state, and hosted-login identity data. The Pailo database should not store password hashes.

Fields:

- id
- name
- email
- phone
- cognito_sub
- role_id
- employee_id
- invite_status
- status
- invited_at
- invited_by_user_id
- accepted_invite_at
- last_login_at

Notes:

- `users` is for people who can log in to the app.
- `employees` is for factory/HR records. An employee can exist without a user account.
- A user usually links to one employee through `employee_id`.
- The first owner/admin is bootstrapped from the deployment-configured `initial_owner_admin_email`.
- New users are invite-only for the MVP.

### Role

Controls access.

Fields:

- id
- name
- permissions

Example roles:

- owner_admin
- factory_manager
- inventory_clerk
- purchasing
- hr_admin
- quality_inspector
- sales_dispatch
- worker

### Employee

Stores employment data.

Fields:

- id
- employee_code
- full_name
- phone
- address
- emergency_contact_name
- emergency_contact_phone
- department
- job_title
- wage_type
- wage_rate
- start_date
- status
- skills
- notes

### Supplier

Stores supplier contacts and performance.

Fields:

- id
- supplier_code
- name
- contact_person
- phone
- email
- address
- material_categories
- payment_terms
- usual_lead_time_days
- rating
- notes

### Material

Raw material master data.

Fields:

- id
- material_code
- name
- category
- unit_of_measure
- default_supplier_id
- minimum_stock
- reorder_quantity
- current_average_cost_npr
- active

### MaterialBatch

Tracks actual stock received.

Fields:

- id
- material_id
- supplier_id
- lot_number
- purchase_order_id
- received_date
- expiry_date
- quantity_received
- quantity_available
- unit_cost_npr
- storage_location

### InventoryMovement

Audit log for all stock movement.

Fields:

- id
- item_type
- item_id
- movement_type
- quantity
- unit_of_measure
- from_location
- to_location
- work_order_id
- purchase_order_id
- reason
- created_by
- created_at

Movement types:

- receive
- issue_to_work_order
- return_from_work_order
- adjustment
- wastage
- transfer
- finished_goods_receive
- sale_dispatch

### ProductStyle

Main shoe style record.

Fields:

- id
- style_code
- name
- category
- description
- size_range
- status
- target_cost_npr
- target_wholesale_price_npr
- target_retail_price_npr
- created_by
- approved_by
- approved_at

### ProductColorway

Color variation for a style.

Fields:

- id
- style_id
- color_name
- color_code
- image_id
- status

### ProductVariant

Specific saleable item by style, color, and size.

Fields:

- id
- style_id
- colorway_id
- size
- sku
- barcode
- active

Example SKU:

```text
PAI-2026-SNK-001-BLK-42
```

### Attachment

Stores file/photo references.

Fields:

- id
- owner_type
- owner_id
- file_name
- file_type
- storage_path
- caption
- created_by
- created_at

Used for:

- Product photos.
- Supplier documents.
- Employee documents.
- QC photos.
- Label template assets.

### BOM

Bill of materials for a product style.

Fields:

- id
- style_id
- version
- status
- notes
- approved_by
- approved_at

### BOMItem

Material line inside a BOM.

Fields:

- id
- bom_id
- material_id
- quantity_per_pair
- wastage_percent
- unit_cost_npr
- notes

### WorkOrder

Production batch.

Fields:

- id
- work_order_code
- style_id
- colorway_id
- planned_start_date
- planned_end_date
- status
- priority
- notes
- created_by

### WorkOrderSizeLine

Quantity by size inside a work order.

Fields:

- id
- work_order_id
- size
- planned_quantity
- completed_quantity
- rejected_quantity
- rework_quantity

### ProductionStage

Master list of production stages.

Fields:

- id
- name
- sequence_number
- active

Suggested stages:

- cutting
- stitching
- lasting
- sole_attachment
- finishing
- qc
- packing

### WorkOrderStageLog

Tracks movement through production stages.

Fields:

- id
- work_order_id
- stage_id
- size
- quantity_in
- quantity_out
- quantity_rework
- quantity_rejected
- assigned_employee_id
- started_at
- completed_at
- notes

### TaskBoard

Manufacturing or office task board.

Fields:

- id
- board_code
- name
- board_type
- description
- default_statuses
- owner_employee_id
- active

Example board types:

- production
- sampling
- purchasing
- quality
- maintenance
- packaging
- office

### Task

Employee-owned work item. This is the project-management layer for Pailo.

Fields:

- id
- task_code
- board_id
- title
- description
- status
- priority
- assigned_to_employee_id
- assigned_team
- created_by
- due_date
- started_at
- completed_at
- reviewed_by
- reviewed_at
- work_order_id
- product_style_id
- material_id
- supplier_id
- customer_id
- parent_task_id
- blocked_reason
- estimated_quantity
- completed_quantity
- unit_of_measure
- notes

Suggested task statuses:

- backlog
- ready
- in_progress
- blocked
- waiting_for_review
- done
- cancelled

### TaskStatusUpdate

Employee progress update on a task.

Fields:

- id
- task_id
- employee_id
- old_status
- new_status
- quantity_completed
- update_text
- blocker_reason
- photo_attachment_id
- created_at

### TaskComment

Comments and discussion on a task.

Fields:

- id
- task_id
- employee_id
- comment_text
- attachment_id
- created_at

### TaskTemplate

Reusable task pattern for common factory work.

Fields:

- id
- name
- board_type
- title_template
- description_template
- default_priority
- default_assigned_team
- estimated_duration_minutes
- linked_stage_id
- active

### FinishedGoodStock

Stock by variant and batch.

Fields:

- id
- variant_id
- work_order_id
- quantity_available
- quantity_reserved
- quality_status
- label_status
- storage_location

### QualityInspection

QC result for work order, variant, or stock.

Fields:

- id
- work_order_id
- variant_id
- inspected_by
- inspected_at
- inspected_quantity
- passed_quantity
- failed_quantity
- rework_quantity
- notes

### Defect

Defect detail.

Fields:

- id
- quality_inspection_id
- defect_type
- severity
- quantity
- photo_attachment_id
- corrective_action

### LabelTemplate

Reusable print design.

Fields:

- id
- template_code
- name
- template_type
- version
- page_width_mm
- page_height_mm
- label_width_mm
- label_height_mm
- design_json
- html_template
- css_template
- status
- created_by
- updated_by

### LabelPrintJob

Stores label print history.

Fields:

- id
- template_id
- work_order_id
- variant_id
- quantity
- printed_by
- printed_at
- output_file_path
- status

### PurchaseOrder

Supplier purchase order.

Fields:

- id
- po_number
- supplier_id
- order_date
- expected_delivery_date
- status
- subtotal_npr
- tax_npr
- total_npr
- payment_status
- notes

### PurchaseOrderItem

Material line inside a purchase order.

Fields:

- id
- purchase_order_id
- material_id
- quantity_ordered
- quantity_received
- unit_cost_npr

### Customer

Shop, distributor, or direct customer.

Fields:

- id
- customer_code
- name
- contact_person
- phone
- address
- customer_type
- payment_terms
- notes

### SalesOrder

Customer order.

Fields:

- id
- sales_order_number
- customer_id
- order_date
- required_date
- status
- payment_status
- notes

### SalesOrderItem

Style/variant order line.

Fields:

- id
- sales_order_id
- variant_id
- quantity_ordered
- quantity_reserved
- quantity_dispatched
- unit_price_npr

### AuditLog

Tracks important changes.

Fields:

- id
- user_id
- entity_type
- entity_id
- action
- old_value
- new_value
- created_at

## Key Relationships

- ProductStyle has many ProductColorways.
- ProductColorway has many ProductVariants.
- ProductStyle has many BOM versions.
- BOM has many BOMItems.
- WorkOrder belongs to ProductStyle and ProductColorway.
- WorkOrder has many WorkOrderSizeLines.
- WorkOrder has many WorkOrderStageLogs.
- WorkOrder has many Tasks.
- TaskBoard has many Tasks.
- Task has many TaskStatusUpdates.
- Task has many TaskComments.
- Task can belong to WorkOrder, ProductStyle, Material, Supplier, Customer, or another parent Task.
- FinishedGoodStock belongs to ProductVariant and WorkOrder.
- QualityInspection belongs to WorkOrder and optionally ProductVariant.
- Supplier has many PurchaseOrders.
- Material has many MaterialBatches.
- InventoryMovement can reference materials, finished goods, work orders, and purchase orders.
- LabelTemplate has many LabelPrintJobs.

## Example Product Record

```json
{
  "style_code": "PAI-2026-SNK-001",
  "name": "Pailo City Runner",
  "category": "sneaker",
  "size_range": "39-44",
  "target_cost_npr": 900,
  "target_wholesale_price_npr": 1250,
  "target_retail_price_npr": 1600,
  "status": "sample_approved"
}
```

## Example Label Variables

```json
{
  "brand_name": "Pailo",
  "style_code": "PAI-2026-SNK-001",
  "size": "42",
  "color": "Black",
  "mrp_npr": "1600",
  "batch_no": "WO-2026-0001",
  "manufacture_date": "2026-05-02",
  "made_in": "Nepal"
}
```

## Data Quality Rules

- Product style code must be unique.
- Material code must be unique.
- SKU must be unique.
- Inventory quantity should never become negative without manager approval.
- Work order cannot start unless required materials are checked.
- Task cannot be marked done unless required completion fields are filled.
- Blocked task should require a blocker reason.
- Important task types can require manager review before final completion.
- Employee task status updates should be saved as history, not overwritten.
- Finished goods cannot be dispatched unless QC status is approved.
- Label print job should record who printed and when.
- Any manual stock adjustment should require a reason.
