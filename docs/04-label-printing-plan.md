# Pailo Label Printing Plan

## Goal

Create a web-based label system so Pailo can design, edit, preview, and print shoe labels without manually editing Word files for every change.

The current workspace includes a sample label file: `../Sticker 42.doc`.

## Recommended Direction

Use the web app as the source of truth for label templates. Generate precise PDF files for printing.

Why PDF first:

- More predictable print output than browser-only printing.
- Easier to print many labels in one batch.
- Works well with standard office printers and label printers.
- Easier to archive print history.

DOCX can still be supported later as import/export, but the production workflow should not depend on manually editing DOCX files.

## Label Template Types

Pailo may need several template types:

- Shoe sticker label.
- Box label.
- Hang tag.
- Size sticker.
- Barcode/QR sticker.
- Packing slip.
- Dispatch label.

## Editable Template Features

The template editor should allow:

- Page size selection.
- Label size selection in millimeters.
- Margin and gap settings.
- Text boxes.
- Image/logo placement.
- Barcode/QR placement.
- Variable fields.
- Font size, weight, and alignment.
- Border and background options.
- Duplicate labels per page.
- Live preview with sample product data.
- Template versioning.

Keep the first editor simple. The MVP can start with fixed templates plus editable text, fields, and dimensions. A drag-and-drop editor can come after print accuracy is proven.

## Common Label Variables

Product fields:

- brand_name
- style_code
- style_name
- category
- color
- size
- sku
- barcode
- qr_code

Production fields:

- work_order_code
- batch_no
- manufacture_date
- qc_status
- pair_number

Pricing fields:

- mrp_npr
- wholesale_price_npr

Compliance and packaging fields:

- made_in
- upper_material
- sole_material
- care_instruction
- importer_or_manufacturer
- customer_order_no

## Suggested MVP Label Data

The first label template should probably include:

- Pailo logo/name.
- Style code.
- Size.
- Color.
- MRP in NPR.
- Batch/work order code.
- Made in Nepal.
- Barcode or QR code.

For QR codes, reserve `pailoshoes.com` as the trusted public domain. Early labels can point to simple future product or verification URLs such as:

```text
https://pailoshoes.com/p/PAI-2026-SNK-001
https://pailoshoes.com/verify/WO-2026-0001-42
```

The internal factory app should not be exposed through public label QR codes. Use public product or verification pages only when Pailo is ready for customer-facing traffic.

Example placeholder format:

```text
{{brand_name}}
Style: {{style_code}}
Size: {{size}}
Color: {{color}}
MRP: NPR {{mrp_npr}}
Batch: {{batch_no}}
Made in {{made_in}}
```

## Print Workflow

1. User selects label template.
2. User selects style, color, size, batch, or work order.
3. App loads product and production data.
4. User enters print quantity.
5. App previews labels exactly as they will print.
6. User downloads or prints PDF.
7. App records print history.

## Batch Printing Examples

Example work order:

- Size 39: 10 pairs.
- Size 40: 20 pairs.
- Size 41: 25 pairs.
- Size 42: 30 pairs.
- Size 43: 15 pairs.

The app should generate the correct number of labels for each size automatically.

## Template Storage

Store templates in the database with both structured design data and printable output data.

Suggested fields:

- name
- template_code
- type
- version
- page_width_mm
- page_height_mm
- label_width_mm
- label_height_mm
- margin_top_mm
- margin_left_mm
- gap_x_mm
- gap_y_mm
- design_json
- html_template
- css_template
- status

## DOCX Handling

The existing `../Sticker 42.doc` can be used as a visual reference.

Possible DOCX support path:

1. Manually inspect the sample label.
2. Recreate it as an app template.
3. Use placeholders for dynamic data.
4. Generate PDF from the app.
5. Later, add DOCX export if the team still needs Word-compatible files.

If DOCX import is required later, use a library that can read Word documents and map placeholders to fields. Do not build label generation by manually editing binary Word files.

## Print Accuracy Checklist

- Test on A4 paper first.
- Measure printed label width and height with a ruler.
- Adjust margins and gaps.
- Save printer profile if possible.
- Lock approved template versions.
- Do not overwrite old templates used for past batches.
- Record template version in print history.

## Brand And Legal Safety

Pailo labels should use Pailo branding and Pailo style codes. Avoid competitor logos, competitor names, and confusingly similar marks in generated labels and customer-facing documents. This protects the factory as Pailo grows.
