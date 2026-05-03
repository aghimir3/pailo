# Pailo Label Printing Plan

## Goal

Create a web-based label system so Pailo can design, edit, preview, and print shoe labels without manually editing Word files for every change.

The current workspace includes a sample Word label document in the repository root.

## Recommended Direction

Use the web app as the source of truth for label templates. Generate precise PDF files for printing.

Why PDF first:

- More predictable print output than browser-only printing.
- Easier to print many labels in one batch.
- Works well with standard office printers and label printers.
- Easier to archive print history.

DOCX can still be supported later as import/export, but the production workflow should not depend on manually editing DOCX files.

## MVP Priority: 24-Up A4 Production Labels

The first MVP label workflow must reproduce the physical layout of the sample Word label document because that file already works with Pailo's current sticker paper. Treat this Word file as the calibrated production reference, not as a file that users edit directly.

Measured from the sample Word label document on 2026-05-02:

- Page: A4 portrait, about 210.00 mm x 297.00 mm.
- Sticker count per page: 24 labels.
- Grid: 3 columns x 8 rows.
- Label size: about 63.50 mm wide x 33.87 mm high.
- Horizontal gap between label columns: about 2.54 mm.
- Vertical gap: 0 mm between label rows.
- Label left positions: about 7.20 mm, 73.24 mm, and 139.28 mm.
- Label top positions: about 13.09 mm, then every 33.86 mm down the page.
- Current editable content visible in the file: `Manufactured By`, manufacturer name, `Art. NO.`, `Colour`, `MRP`, `SIZE`, and `Made in Nepal`.
- Font: Calibri. `Manufactured By:` and manufacturer name are 10.5 pt, the Art/Colour/MRP lines are 12 pt, `SIZE` and the size value are 20 pt, and `Made in Nepal` is 9 pt.

The MVP should ship a locked 24-up A4 label template preset using these dimensions. Users should edit values and print quantities, but the template geometry should remain protected unless an admin intentionally creates a new approved template version.

## MVP Label UX

The high-value MVP experience should be simple and hard to misprint:

1. User opens Labels and chooses the approved 24-up A4 label template.
2. App shows one large editable sticker preview, not a cluttered 24-label editing canvas.
3. User edits structured fields:
	- Art No.
	- Colour.
	- Size.
	- MRP.
	- Manufactured By.
	- Made in / origin text.
	- Optional work order or batch reference when needed.
4. User enters the number of labels to print.
5. App shows a sheet preview using the real 24-slot A4 layout.
6. App fills labels in row-major order: left to right across the top row, then the next row. If the user prints 3 labels, only the first row is filled. If the user prints 25 labels, the app creates a second page and fills the first slot on that page.
7. User downloads or prints a PDF.
8. App stores a print-job record with template version, field values, quantity, actor, work order or style, and timestamp.

For work orders with multiple sizes, the app should let the user enter quantities per size and then generate labels in the selected order. The preview should make page breaks and partially filled pages obvious before printing.

## MVP Print Accuracy Strategy

Generate the final output as a backend-created PDF with millimeter-based coordinates from the approved template version. Do not rely on browser print scaling for production labels.

Implementation direction:

- Store the 24-up A4 label geometry in structured template data.
- Use exact page, label, gap, and offset dimensions from the measured file.
- Render the PDF server-side using a library that supports exact page sizes and millimeter positioning.
- Use embedded or controlled fonts so text measurements are predictable.
- Add an admin-only calibration setting for small printer offsets, such as `offset_x_mm` and `offset_y_mm`, without changing the approved template dimensions.
- Include a test-print mode that prints label borders or faint guides on plain A4 paper for alignment checks.
- Save every approved calibration as a template version.

The UI can render a browser preview for confidence, but the PDF is the source of truth for printing.

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

For the MVP 24-up A4 label workflow, the default screen should be even more direct: edit one sticker, enter quantity, preview the 24-up sheet, then print PDF.

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
- slots_per_page
- columns
- rows
- fill_order
- offset_x_mm
- offset_y_mm
- design_json
- html_template
- css_template
- status

## DOCX Handling

The existing sample Word label document can be used as a visual reference.

For the MVP, it is more than a visual reference: it is the calibrated source for the first production template dimensions. The application should recreate this layout in structured template data and generate PDFs from that data.

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
