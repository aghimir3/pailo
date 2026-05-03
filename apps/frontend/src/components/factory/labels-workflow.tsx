"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Eye, Printer, RefreshCw } from "lucide-react";

import {
  previewLabelSheet,
  type LabelPreviewRequest,
  type LabelPreviewResponse,
  type LabelTemplateRecord,
  type OperationsCatalogResponse,
} from "@pailo/api-client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";

type ProductStyle = OperationsCatalogResponse["styles"][number];

type LabelsWorkflowProps = {
  initialPreview: LabelPreviewResponse;
  styles: ProductStyle[];
  templates: LabelTemplateRecord[];
};

type LabelFormState = {
  templateId: string;
  quantity: string;
  art_no: string;
  colour: string;
  size: string;
  mrp_npr: string;
  manufactured_by: string;
  origin_text: string;
};

type SheetSlot = {
  page: number;
  slot: number;
  row: number;
  column: number;
  x_mm: string;
  y_mm: string;
  width_mm: string;
  height_mm: string;
  filled: boolean;
};

const defaultManufacturer = "AB Fashion & Wears";
const defaultQuantity = "24";
const labelFormStorageKey = "pailo:label-generator:last-values:v1";

export function LabelsWorkflow({ initialPreview, styles, templates }: LabelsWorkflowProps) {
  const [preview, setPreview] = useState(initialPreview);
  const [form, setForm] = useState<LabelFormState>(() => createInitialForm(initialPreview));
  const [showGuides, setShowGuides] = useState(false);
  const [status, setStatus] = useState("Preview ready");
  const [isDirty, setIsDirty] = useState(false);
  const hasLoadedSavedForm = useRef(false);
  const canPersistForm = useRef(false);
  const [isPending, startTransition] = useTransition();

  const selectedTemplate = templates.find((template) => template.id === form.templateId) ?? preview.template;
  const pages = useMemo(() => buildSheetPages(preview), [preview]);
  const filledCount = preview.slots.length;
  const emptySlotsOnLastPage = (preview.page_count * preview.template.slots_per_page) - filledCount;

  useEffect(() => {
    if (hasLoadedSavedForm.current) return;
    hasLoadedSavedForm.current = true;

    const savedForm = readSavedForm(templates, initialPreview);
    if (!savedForm) {
      canPersistForm.current = true;
      return;
    }

    const timerId = window.setTimeout(() => {
      const template = templates.find((candidate) => candidate.id === savedForm.templateId) ?? initialPreview.template;
      const payload = formPayload(savedForm);
      setForm(savedForm);
      setPreview(buildLocalPreview(template, payload));
      setIsDirty(false);
      setStatus("Restored last label setup");
      canPersistForm.current = true;

      void previewLabelSheet(template.id, payload)
        .then((nextPreview) => {
          setPreview(nextPreview);
          setStatus(`Preview ready: ${nextPreview.page_count} page${nextPreview.page_count === 1 ? "" : "s"}`);
        })
        .catch(() => {
          setStatus("Preview ready from saved values");
        });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [initialPreview, templates]);

  useEffect(() => {
    if (!canPersistForm.current) return;
    writeSavedForm(form);
  }, [form]);

  function setField(field: keyof LabelFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setIsDirty(true);
    setStatus("Preview needs update");
  }

  function applyStyle(styleId: string) {
    const style = styles.find((candidate) => candidate.id === styleId);
    if (!style) return;
    setForm((current) => ({
      ...current,
      art_no: style.style_code,
      mrp_npr: String(style.target_mrp_npr ?? current.mrp_npr),
    }));
    setIsDirty(true);
    setStatus("Preview needs update");
  }

  async function requestPreview() {
    const payload = formPayload(form);
    try {
      const nextPreview = await previewLabelSheet(selectedTemplate.id, payload);
      setPreview(nextPreview);
      setIsDirty(false);
      setStatus(`Preview ready: ${nextPreview.page_count} page${nextPreview.page_count === 1 ? "" : "s"}`);
      return nextPreview;
    } catch {
      const localPreview = buildLocalPreview(selectedTemplate, payload);
      setPreview(localPreview);
      setIsDirty(false);
      setStatus("Preview ready from local template geometry");
      return localPreview;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(() => {
      void requestPreview();
    });
  }

  function handlePrint() {
    startTransition(() => {
      void (async () => {
        if (isDirty) {
          await requestPreview();
        }
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => window.print());
        });
      })();
    });
  }

  return (
    <section className="label-room-grid">
      <GlassCard className="ops-panel label-editor-panel">
        <PanelHeader>
          <div>
            <p className="eyebrow">Label values</p>
            <h2>Label print setup</h2>
          </div>
          <Printer aria-hidden="true" className="panel-icon" size={22} />
        </PanelHeader>

        <form className="label-editor-form" onSubmit={handleSubmit}>
          <label>
            Template
            <select value={form.templateId} onChange={(event) => setField("templateId", event.target.value)}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{templateDisplayName(template)}</option>
              ))}
            </select>
          </label>

          <label>
            Style
            <select defaultValue="" onChange={(event) => applyStyle(event.target.value)}>
              <option value="">Manual</option>
              {styles.map((style) => (
                <option key={style.id} value={style.id}>{style.style_code} / {style.name}</option>
              ))}
            </select>
          </label>

          <label>
            Quantity
            <input inputMode="numeric" max={240} min={1} type="number" value={form.quantity} onChange={(event) => setField("quantity", event.target.value)} />
          </label>

          <label>
            Size
            <input value={form.size} onChange={(event) => setField("size", event.target.value)} />
          </label>

          <label>
            Art No.
            <input value={form.art_no} onChange={(event) => setField("art_no", event.target.value)} />
          </label>

          <label>
            Colour
            <input value={form.colour} onChange={(event) => setField("colour", event.target.value)} />
          </label>

          <label>
            MRP
            <input inputMode="decimal" value={form.mrp_npr} onChange={(event) => setField("mrp_npr", event.target.value)} />
          </label>

          <label>
            Manufactured By
            <input value={form.manufactured_by} onChange={(event) => setField("manufactured_by", event.target.value)} />
          </label>

          <label className="label-form-wide">
            Origin
            <input value={form.origin_text} onChange={(event) => setField("origin_text", event.target.value)} />
          </label>

          <label className="label-guide-toggle">
            <input checked={showGuides} type="checkbox" onChange={(event) => setShowGuides(event.target.checked)} />
            Alignment guides
          </label>

          <div className="label-action-row">
            <Button disabled={isPending} type="submit" variant="glass">
              <RefreshCw aria-hidden="true" size={17} />
              Update preview
            </Button>
            <Button disabled={isPending} type="button" onClick={handlePrint}>
              <Printer aria-hidden="true" size={17} />
              Print labels
            </Button>
          </div>
        </form>

        <div className="label-status-row">
          {isDirty ? <AlertCircle aria-hidden="true" size={17} /> : <CheckCircle2 aria-hidden="true" size={17} />}
          <span>{status}</span>
        </div>
      </GlassCard>

      <div className="label-side-stack">
        <GlassCard className="ops-panel label-template-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Template</p>
              <h2>Approved geometry</h2>
            </div>
            <Eye aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="label-template-metrics">
            <div><span>Sheet</span><strong>{selectedTemplate.page_width_mm} x {selectedTemplate.page_height_mm} mm</strong></div>
            <div><span>Labels</span><strong>{selectedTemplate.columns} x {selectedTemplate.rows}</strong></div>
            <div><span>Label size</span><strong>{selectedTemplate.label_width_mm} x {selectedTemplate.label_height_mm} mm</strong></div>
            <div><span>Pages</span><strong>{preview.page_count}</strong></div>
          </div>
          <div className="label-template-footer">
            <Badge tone={selectedTemplate.status === "approved" ? "green" : "amber"}>{selectedTemplate.status}</Badge>
            <span>{templateDisplayName(selectedTemplate)} / v{selectedTemplate.version}</span>
          </div>
        </GlassCard>

        <GlassCard className="ops-panel label-single-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Label</p>
              <h2>Single label preview</h2>
            </div>
            <Eye aria-hidden="true" className="panel-icon" size={22} />
          </PanelHeader>
          <div className="single-label-preview">
            <StickerContent values={preview.values} />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="ops-panel label-preview-panel">
        <PanelHeader>
          <div>
            <p className="eyebrow">Print preview</p>
            <h2>{filledCount} labels across {preview.page_count} page{preview.page_count === 1 ? "" : "s"}</h2>
          </div>
          <Badge tone={emptySlotsOnLastPage > 0 ? "amber" : "green"}>{emptySlotsOnLastPage} empty</Badge>
        </PanelHeader>

        <div className="label-print-scroll">
          <div className={showGuides ? "label-print-area print-guides" : "label-print-area"} aria-label="Label sheet print preview">
            {pages.map((pageSlots, pageIndex) => (
              <section
                aria-label={`Page ${pageIndex + 1}`}
                className="label-print-page"
                key={pageIndex}
                style={pageStyle(preview.template)}
              >
                {pageSlots.map((slot) => (
                  <div
                    className={slot.filled ? "label-sheet-slot label-filled-slot" : "label-sheet-slot label-empty-slot"}
                    key={`${slot.page}-${slot.slot}`}
                    style={slotStyle(slot)}
                  >
                    {slot.filled ? <StickerContent values={preview.values} /> : null}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

function formPayload(form: LabelFormState): LabelPreviewRequest {
  return {
    quantity: clampQuantity(form.quantity),
    art_no: form.art_no.trim() || "PAILO-STYLE",
    colour: form.colour.trim() || "Black",
    size: form.size.trim() || "42",
    mrp_npr: form.mrp_npr.trim() || "0",
    manufactured_by: form.manufactured_by.trim() || defaultManufacturer,
    origin_text: form.origin_text.trim() || "Made in Nepal",
  };
}

function createInitialForm(preview: LabelPreviewResponse): LabelFormState {
  return {
    templateId: preview.template.id,
    quantity: String(preview.values.quantity || defaultQuantity),
    art_no: preview.values.art_no,
    colour: preview.values.colour,
    size: preview.values.size,
    mrp_npr: String(preview.values.mrp_npr),
    manufactured_by: preview.values.manufactured_by || defaultManufacturer,
    origin_text: preview.values.origin_text,
  };
}

function readSavedForm(templates: LabelTemplateRecord[], initialPreview: LabelPreviewResponse): LabelFormState | null {
  try {
    const rawValue = window.localStorage.getItem(labelFormStorageKey);
    if (!rawValue) return null;
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isRecord(parsedValue)) return null;
    return normalizeSavedForm(parsedValue, templates, initialPreview);
  } catch {
    return null;
  }
}

function writeSavedForm(form: LabelFormState) {
  try {
    window.localStorage.setItem(labelFormStorageKey, JSON.stringify(form));
  } catch {
    // Ignore storage failures; preview and print should keep working.
  }
}

function normalizeSavedForm(
  value: Record<string, unknown>,
  templates: LabelTemplateRecord[],
  initialPreview: LabelPreviewResponse,
): LabelFormState {
  const initialForm = createInitialForm(initialPreview);
  const savedTemplateId = stringFromRecord(value, "templateId", initialForm.templateId);
  const hasSavedTemplate = templates.some((template) => template.id === savedTemplateId);
  return {
    templateId: hasSavedTemplate ? savedTemplateId : initialForm.templateId,
    quantity: String(clampQuantity(stringFromRecord(value, "quantity", defaultQuantity))),
    art_no: stringFromRecord(value, "art_no", initialForm.art_no),
    colour: stringFromRecord(value, "colour", initialForm.colour),
    size: stringFromRecord(value, "size", initialForm.size),
    mrp_npr: stringFromRecord(value, "mrp_npr", initialForm.mrp_npr),
    manufactured_by: stringFromRecord(value, "manufactured_by", defaultManufacturer),
    origin_text: stringFromRecord(value, "origin_text", initialForm.origin_text),
  };
}

function stringFromRecord(value: Record<string, unknown>, key: keyof LabelFormState, fallback: string) {
  return typeof value[key] === "string" && value[key].trim() ? value[key] : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampQuantity(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(240, Math.max(1, parsed));
}

function buildSheetPages(preview: LabelPreviewResponse) {
  return Array.from({ length: preview.page_count }).map((_, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const filledSlots = new Map(preview.slots.filter((slot) => slot.page === pageNumber).map((slot) => [slot.slot, slot]));
    return buildTemplateSlots(preview.template, pageNumber).map((slot) => ({
      ...slot,
      ...(filledSlots.get(slot.slot) ?? {}),
      filled: filledSlots.has(slot.slot),
    }));
  });
}

function buildTemplateSlots(template: LabelTemplateRecord, pageNumber: number): SheetSlot[] {
  return Array.from({ length: template.slots_per_page }).map((_, index) => {
    const rowIndex = Math.floor(index / template.columns);
    const columnIndex = index % template.columns;
    const xPosition = mm(template.margin_left_mm) + (columnIndex * (mm(template.label_width_mm) + mm(template.gap_x_mm)));
    const yPosition = mm(template.margin_top_mm) + (rowIndex * (mm(template.label_height_mm) + mm(template.gap_y_mm)));
    return {
      page: pageNumber,
      slot: index + 1,
      row: rowIndex + 1,
      column: columnIndex + 1,
      x_mm: formatMm(xPosition),
      y_mm: formatMm(yPosition),
      width_mm: template.label_width_mm,
      height_mm: template.label_height_mm,
      filled: false,
    };
  });
}

function buildLocalPreview(template: LabelTemplateRecord, payload: LabelPreviewRequest): LabelPreviewResponse {
  const pageCount = Math.ceil(payload.quantity / template.slots_per_page);
  const slots = Array.from({ length: payload.quantity }).map((_, index) => {
    const pageNumber = Math.floor(index / template.slots_per_page) + 1;
    return buildTemplateSlots(template, pageNumber)[index % template.slots_per_page];
  });
  return {
    template,
    page_count: pageCount,
    slots,
    values: {
      ...payload,
      mrp_npr: String(payload.mrp_npr),
    },
  };
}

function StickerContent({ values }: { values: LabelPreviewResponse["values"] }) {
  return (
    <div className="sticker-content">
      <div className="sticker-left-block">
        <div className="sticker-manufacturer-label">Manufactured By:</div>
        <div className="sticker-manufacturer-name">{values.manufactured_by}</div>
        <div className="sticker-detail-line"><span>Art. NO.</span><strong>{values.art_no}</strong></div>
        <div className="sticker-detail-line"><span>Colour :</span><strong>{values.colour}</strong></div>
        <div className="sticker-detail-line"><span>MRP:</span><strong>{formatMrp(values.mrp_npr)}</strong></div>
      </div>
      <div className="sticker-size-block">
        <div className="sticker-size-box">
          <span>SIZE</span>
          <strong>{values.size}</strong>
        </div>
        <div className="sticker-origin-text">{values.origin_text}</div>
      </div>
    </div>
  );
}

function formatMrp(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue.toLowerCase().startsWith("rs")) {
    return trimmedValue;
  }
  const numericValue = Number(trimmedValue);
  const label = Number.isFinite(numericValue)
    ? (Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2))
    : trimmedValue;
  return `Rs ${label}/-`;
}

function templateDisplayName(template: LabelTemplateRecord) {
  const isDefaultA4Template = template.slots_per_page === 24 && template.columns === 3 && template.rows === 8;
  if (isDefaultA4Template) {
    return "24-up A4 label template";
  }
  return template.name;
}

function pageStyle(template: LabelTemplateRecord): CSSProperties {
  return {
    height: `${template.page_height_mm}mm`,
    width: `${template.page_width_mm}mm`,
  };
}

function slotStyle(slot: SheetSlot): CSSProperties {
  return {
    height: `${slot.height_mm}mm`,
    left: `${slot.x_mm}mm`,
    top: `${slot.y_mm}mm`,
    width: `${slot.width_mm}mm`,
  };
}

function mm(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatMm(value: number) {
  return value.toFixed(2);
}