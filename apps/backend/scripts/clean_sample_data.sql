-- =============================================================================
-- Pailo: Remove ALL sample/demo data from the database
-- Keeps schema, roles, boards, and sequences intact.
-- Run this against the hosted RDS instance to start fresh.
-- =============================================================================

BEGIN;

-- 1. Delete in reverse dependency order
-- Label print jobs reference templates, work orders, products, users
DELETE FROM label_print_jobs;

-- Label templates reference users
DELETE FROM label_templates;

-- Quality defects reference inspections and tasks
DELETE FROM quality_defects;

-- Quality inspections reference work orders, products, users
DELETE FROM quality_inspections;

-- Task comments reference tasks and users
DELETE FROM task_comments;

-- Task status updates reference tasks and users
DELETE FROM task_status_updates;

-- Tasks reference boards, employees, users, work orders, products, materials, suppliers
DELETE FROM tasks;

-- Inventory movements reference stock, materials, variants, work orders, users
DELETE FROM inventory_movements;

-- Inventory stock reference materials, product variants
DELETE FROM inventory_stock;

-- Work order size lines reference work orders
DELETE FROM work_order_size_lines;

-- Work orders reference product styles, bom versions
DELETE FROM work_orders;

-- BOM items reference bom versions, materials
DELETE FROM bom_items;

-- BOM versions reference product styles, users
DELETE FROM bom_versions;

-- Materials reference suppliers
DELETE FROM materials;

-- Product variants reference product styles
DELETE FROM product_variants;

-- Product styles
DELETE FROM product_styles;

-- Suppliers
DELETE FROM suppliers;

-- Saved labels (user-saved label field snapshots)
DELETE FROM saved_labels;

-- Partner inquiries (public landing page form submissions)
DELETE FROM partner_inquiries;

-- Users reference employees, roles
DELETE FROM users;

-- Employees
DELETE FROM employees;

-- Verify counts
SELECT 'employees' AS table_name, COUNT(*) AS remaining FROM employees
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'product_styles', COUNT(*) FROM product_styles
UNION ALL SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL SELECT 'materials', COUNT(*) FROM materials
UNION ALL SELECT 'bom_versions', COUNT(*) FROM bom_versions
UNION ALL SELECT 'bom_items', COUNT(*) FROM bom_items
UNION ALL SELECT 'work_orders', COUNT(*) FROM work_orders
UNION ALL SELECT 'work_order_size_lines', COUNT(*) FROM work_order_size_lines
UNION ALL SELECT 'inventory_stock', COUNT(*) FROM inventory_stock
UNION ALL SELECT 'inventory_movements', COUNT(*) FROM inventory_movements
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'task_status_updates', COUNT(*) FROM task_status_updates
UNION ALL SELECT 'task_comments', COUNT(*) FROM task_comments
UNION ALL SELECT 'quality_inspections', COUNT(*) FROM quality_inspections
UNION ALL SELECT 'quality_defects', COUNT(*) FROM quality_defects
UNION ALL SELECT 'label_templates', COUNT(*) FROM label_templates
UNION ALL SELECT 'label_print_jobs', COUNT(*) FROM label_print_jobs
UNION ALL SELECT 'saved_labels', COUNT(*) FROM saved_labels
UNION ALL SELECT 'partner_inquiries', COUNT(*) FROM partner_inquiries;

COMMIT;
