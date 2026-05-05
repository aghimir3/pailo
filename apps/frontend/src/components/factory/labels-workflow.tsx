"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, Archive, CheckCircle2, Copy, FolderOpen, Printer, RefreshCw, Ruler, Save, Search, X } from "lucide-react";

import {
  archiveSavedLabel,
  createLabelPrintJob,
  createSavedLabel,
  duplicateSavedLabel,
  patchSavedLabel,
  previewLabelSheet,
  previewSavedLabel,
  type LabelPreviewRequest,
  type LabelPreviewResponse,
  type LabelTemplateRecord,
  type OperationsCatalogResponse,
  type SavedLabelCreateRequest,
  type SavedLabelRecord,
} from "@pailo/api-client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, PanelHeader } from "@/components/ui/glass-card";

type ProductStyle = OperationsCatalogResponse["styles"][number];

type LabelsWorkflowProps = {
  initialPreview: LabelPreviewResponse;
  initialSavedLabels: SavedLabelRecord[];
  styles: ProductStyle[];
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
const defaultArtNo = "AFL 02";
const labelFormStorageKey = "pailo:label-generator:last-values:v1";

export function LabelsWorkflow({ initialPreview, initialSavedLabels, styles }: LabelsWorkflowProps) {
  const [preview, setPreview] = useState(initialPreview);
  const [form, setForm] = useState<LabelFormState>(() => createInitialForm(initialPreview));
  const [savedLabels, setSavedLabels] = useState(initialSavedLabels);
  const [activeSavedLabelId, setActiveSavedLabelId] = useState<string | null>(null);
  const [savedLabelSearch, setSavedLabelSearch] = useState("");
  const [isFindLabelOpen, setIsFindLabelOpen] = useState(false);
  const [isGeometryOpen, setIsGeometryOpen] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [status, setStatus] = useState("Preview ready");
  const [isDirty, setIsDirty] = useState(false);
  const hasLoadedSavedForm = useRef(false);
  const canPersistForm = useRef(false);
  const [isPending, startTransition] = useTransition();

  const selectedTemplate = preview.template;
  const geometryDetails = templateGeometryDetails(selectedTemplate);
  const pages = useMemo(() => buildSheetPages(preview), [preview]);
  const filledCount = preview.slots.length;
  const emptySlotsOnLastPage = (preview.page_count * preview.template.slots_per_page) - filledCount;
  const activeSavedLabel = savedLabels.find((savedLabel) => savedLabel.id === activeSavedLabelId) ?? null;
  const filteredSavedLabels = useMemo(
    () => filterSavedLabels(savedLabels, savedLabelSearch),
    [savedLabelSearch, savedLabels],
  );
  const geometryMetrics = [
    { label: "Sheet", value: `${selectedTemplate.page_width_mm} x ${selectedTemplate.page_height_mm} mm` },
    { label: "Labels", value: `${selectedTemplate.columns} x ${selectedTemplate.rows}` },
    { label: "Outer border", value: `${selectedTemplate.label_width_mm} x ${selectedTemplate.label_height_mm} mm` },
    { label: "Border origin", value: `${selectedTemplate.margin_left_mm} L / ${selectedTemplate.margin_top_mm} T mm` },
    { label: "Page margins", value: `${selectedTemplate.margin_left_mm} L / ${geometryDetails.rightMarginMm} R mm` },
    { label: "Gutters", value: `${selectedTemplate.gap_x_mm} X / ${selectedTemplate.gap_y_mm} Y mm` },
    { label: "Text inset", value: `${geometryDetails.textInsetXMm} X / ${geometryDetails.textInsetYMm} Y mm` },
    { label: "Outline", value: `${geometryDetails.outlineWidthPt} pt / rounded` },
  ];

  useEffect(() => {
    if (hasLoadedSavedForm.current) return;
    hasLoadedSavedForm.current = true;

    const savedForm = readSavedForm(initialPreview);
    if (!savedForm) {
      canPersistForm.current = true;
      return;
    }

    const timerId = window.setTimeout(() => {
      const template = initialPreview.template;
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
  }, [initialPreview]);

  useEffect(() => {
    if (!canPersistForm.current) return;
    writeSavedForm(form);
  }, [form]);

  useEffect(() => {
    if (!isFindLabelOpen && !isGeometryOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsFindLabelOpen(false);
      setIsGeometryOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFindLabelOpen, isGeometryOpen]);

  function setField(field: keyof LabelFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setIsDirty(true);
    setStatus("Preview needs update");
  }

  function applySavedLabel(savedLabel: SavedLabelRecord) {
    const nextForm = formFromSavedLabel(savedLabel);
    const template = selectedTemplate;
    const payload = formPayload(nextForm);
    setForm(nextForm);
    setActiveSavedLabelId(savedLabel.id);
    setPreview(buildLocalPreview(template, payload));
    setIsDirty(false);
    setIsFindLabelOpen(false);
    setStatus(`Loaded ${savedLabel.name}`);

    void previewSavedLabel(savedLabel.id, { quantity: payload.quantity })
      .then((nextPreview) => {
        setPreview(nextPreview);
        setStatus(`Loaded ${savedLabel.name}`);
      })
      .catch(() => {
        setStatus("Loaded saved label from local template geometry");
      });
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
        const shouldRecordPrintJob = activeSavedLabel !== null && !isDirty;
        if (isDirty) {
          await requestPreview();
        }
        if (shouldRecordPrintJob && activeSavedLabel) {
          try {
            await createLabelPrintJob(activeSavedLabel.id, { quantity: clampQuantity(form.quantity) });
            setStatus(`Print job recorded for ${activeSavedLabel.name}`);
          } catch {
            setStatus("Print preview ready; print history could not be recorded");
          }
        }
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => window.print());
        });
      })();
    });
  }

  function handleSaveLabel() {
    startTransition(() => {
      void (async () => {
        const nextPreview = await requestPreview();
        const payload = savedLabelPayload(form, nextPreview.values, nextPreview.template.id);
        try {
          const savedLabel = activeSavedLabel
            ? await patchSavedLabel(activeSavedLabel.id, { ...payload, version: activeSavedLabel.version })
            : await createSavedLabel(payload);
          setSavedLabels((current) => upsertSavedLabel(current, savedLabel));
          setActiveSavedLabelId(savedLabel.id);
          setIsDirty(false);
          setStatus(`Saved ${savedLabel.name}`);
        } catch {
          setStatus("Could not save label");
        }
      })();
    });
  }

  function handleDuplicateSavedLabel(savedLabel: SavedLabelRecord) {
    startTransition(() => {
      void duplicateSavedLabel(savedLabel.id, { name: `${savedLabel.name} copy` })
        .then((duplicate) => {
          setSavedLabels((current) => upsertSavedLabel(current, duplicate));
          applySavedLabel(duplicate);
        })
        .catch(() => setStatus("Could not duplicate saved label"));
    });
  }

  function handleArchiveSavedLabel(savedLabel: SavedLabelRecord) {
    startTransition(() => {
      void archiveSavedLabel(savedLabel.id, savedLabel.version)
        .then(() => {
          setSavedLabels((current) => current.filter((candidate) => candidate.id !== savedLabel.id));
          if (activeSavedLabelId === savedLabel.id) {
            setActiveSavedLabelId(null);
          }
          setStatus(`Archived ${savedLabel.name}`);
        })
        .catch(() => setStatus("Could not archive saved label"));
    });
  }

  return (
    <>
    <section className="label-room-grid">
      <GlassCard className="ops-panel label-editor-panel">
        <PanelHeader>
          <div>
            <p className="eyebrow">Label values</p>
            <h2>Label print setup</h2>
          </div>
          <Button size="sm" type="button" variant="glass" onClick={() => setIsFindLabelOpen(true)}>
            <FolderOpen aria-hidden="true" size={16} />
            Find label
          </Button>
        </PanelHeader>

        <form className="label-editor-form" onSubmit={handleSubmit}>
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
            <Button disabled={isPending} type="button" variant="glass" onClick={handleSaveLabel}>
              <Save aria-hidden="true" size={17} />
              {activeSavedLabel ? "Update saved" : "Save label"}
            </Button>
            <Button disabled={isPending} type="button" onClick={handlePrint}>
              <Printer aria-hidden="true" size={17} />
              Print labels
            </Button>
          </div>
        </form>

        <div className="label-run-summary" aria-label="Current print run">
          <div><span>Labels</span><strong>{filledCount}</strong></div>
          <div><span>Pages</span><strong>{preview.page_count}</strong></div>
          <div><span>Empty</span><strong>{emptySlotsOnLastPage}</strong></div>
        </div>

        <div className="label-active-card">
          <div>
            <span>{activeSavedLabel ? "Loaded saved label" : "Saved label"}</span>
            <strong>{activeSavedLabel ? activeSavedLabel.name : "No saved label loaded"}</strong>
          </div>
          <Button size="sm" type="button" variant="glass" onClick={() => setIsFindLabelOpen(true)}>
            <Search aria-hidden="true" size={15} />
            Find
          </Button>
        </div>

        <div className="label-status-row">
          {isDirty ? <AlertCircle aria-hidden="true" size={17} /> : <CheckCircle2 aria-hidden="true" size={17} />}
          <span>{status}</span>
        </div>
      </GlassCard>

      <div className="label-preview-stack">
        <GlassCard className="ops-panel label-single-panel">
          <PanelHeader>
            <div>
              <p className="eyebrow">Label</p>
              <h2>Single label preview</h2>
            </div>
            <div className="label-panel-actions">
              <Badge tone={selectedTemplate.status === "approved" ? "green" : "amber"}>{selectedTemplate.status}</Badge>
              <Button size="sm" type="button" variant="glass" onClick={() => setIsGeometryOpen(true)}>
                <Ruler aria-hidden="true" size={15} />
                Geometry
              </Button>
            </div>
          </PanelHeader>
          <div className="label-template-strip">
            <span>{templateDisplayName(selectedTemplate)} / v{selectedTemplate.version}</span>
            <strong>{selectedTemplate.columns} x {selectedTemplate.rows} / {selectedTemplate.label_width_mm} x {selectedTemplate.label_height_mm} mm</strong>
          </div>
          <div className="single-label-preview" style={singleLabelStyle(preview.template)}>
            <StickerContent values={preview.values} />
          </div>
        </GlassCard>

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
      </div>
    </section>
    {isFindLabelOpen ? (
      <div className="label-modal-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsFindLabelOpen(false);
      }}>
        <section aria-describedby="find-label-description" aria-labelledby="find-label-title" aria-modal="true" className="glass-card label-modal label-find-modal" role="dialog">
          <div className="label-modal-header">
            <div>
              <p className="eyebrow">Saved labels</p>
              <h2 id="find-label-title">Find label</h2>
              <p id="find-label-description">Search reusable labels by art number, colour, size, price, or saved name.</p>
            </div>
            <Button aria-label="Close find label" size="icon" type="button" variant="ghost" onClick={() => setIsFindLabelOpen(false)}>
              <X aria-hidden="true" size={18} />
            </Button>
          </div>
          <label className="label-library-search label-modal-search">
            <Search aria-hidden="true" size={16} />
            <input autoFocus value={savedLabelSearch} placeholder="Search saved labels" onChange={(event) => setSavedLabelSearch(event.target.value)} />
          </label>
          <div className="label-modal-list">
            {filteredSavedLabels.length ? filteredSavedLabels.map((savedLabel) => (
              <article className={savedLabel.id === activeSavedLabelId ? "label-saved-item active" : "label-saved-item"} key={savedLabel.id}>
                <button type="button" className="label-saved-main" onClick={() => applySavedLabel(savedLabel)}>
                  <strong>{savedLabel.name}</strong>
                  <span>{savedLabel.art_no} / {savedLabel.colour} / {savedLabel.size} / Rs {savedLabel.mrp_npr} / {savedLabel.default_quantity} labels</span>
                </button>
                <div className="label-saved-actions">
                  <Button aria-label={`Duplicate ${savedLabel.name}`} disabled={isPending} size="icon" type="button" variant="glass" onClick={() => handleDuplicateSavedLabel(savedLabel)}>
                    <Copy aria-hidden="true" size={15} />
                  </Button>
                  <Button aria-label={`Archive ${savedLabel.name}`} disabled={isPending} size="icon" type="button" variant="ghost" onClick={() => handleArchiveSavedLabel(savedLabel)}>
                    <Archive aria-hidden="true" size={15} />
                  </Button>
                </div>
              </article>
            )) : (
              <p className="label-library-empty">No saved labels yet</p>
            )}
          </div>
        </section>
      </div>
    ) : null}
    {isGeometryOpen ? (
      <div className="label-modal-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsGeometryOpen(false);
      }}>
        <section aria-describedby="geometry-description" aria-labelledby="geometry-title" aria-modal="true" className="glass-card label-modal label-geometry-modal" role="dialog">
          <div className="label-modal-header">
            <div>
              <p className="eyebrow">Template</p>
              <h2 id="geometry-title">Approved geometry</h2>
              <p id="geometry-description">Locked measurements from the approved 24-up A4 label template.</p>
            </div>
            <Button aria-label="Close approved geometry" size="icon" type="button" variant="ghost" onClick={() => setIsGeometryOpen(false)}>
              <X aria-hidden="true" size={18} />
            </Button>
          </div>
          <div className="label-template-metrics label-modal-metrics">
            {geometryMetrics.map((metric) => (
              <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>
            ))}
          </div>
          <div className="label-template-footer">
            <Badge tone={selectedTemplate.status === "approved" ? "green" : "amber"}>{selectedTemplate.status}</Badge>
            <span>{templateDisplayName(selectedTemplate)} / v{selectedTemplate.version}</span>
          </div>
        </section>
      </div>
    ) : null}
    </>
  );
}

function formPayload(form: LabelFormState): LabelPreviewRequest {
  return {
    quantity: clampQuantity(form.quantity),
    art_no: form.art_no.trim() || defaultArtNo,
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
    art_no: preview.values.art_no || defaultArtNo,
    colour: preview.values.colour,
    size: preview.values.size,
    mrp_npr: String(preview.values.mrp_npr),
    manufactured_by: preview.values.manufactured_by || defaultManufacturer,
    origin_text: preview.values.origin_text,
  };
}

function formFromSavedLabel(savedLabel: SavedLabelRecord): LabelFormState {
  return {
    templateId: savedLabel.template_id,
    quantity: String(savedLabel.default_quantity || defaultQuantity),
    art_no: savedLabel.art_no || defaultArtNo,
    colour: savedLabel.colour,
    size: savedLabel.size,
    mrp_npr: String(savedLabel.mrp_npr),
    manufactured_by: savedLabel.manufactured_by || defaultManufacturer,
    origin_text: savedLabel.origin_text,
  };
}

function savedLabelPayload(
  form: LabelFormState,
  values: LabelPreviewRequest,
  templateId: string,
): SavedLabelCreateRequest {
  return {
    template_id: templateId,
    art_no: values.art_no,
    colour: values.colour,
    size: values.size,
    mrp_npr: values.mrp_npr,
    manufactured_by: values.manufactured_by,
    origin_text: values.origin_text,
    default_quantity: clampQuantity(form.quantity),
  };
}

function upsertSavedLabel(current: SavedLabelRecord[], nextSavedLabel: SavedLabelRecord) {
  const withoutExisting = current.filter((savedLabel) => savedLabel.id !== nextSavedLabel.id);
  return [nextSavedLabel, ...withoutExisting];
}

function filterSavedLabels(savedLabels: SavedLabelRecord[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return savedLabels;
  return savedLabels.filter((savedLabel) => (
    [
      savedLabel.name,
      savedLabel.label_code,
      savedLabel.art_no,
      savedLabel.colour,
      savedLabel.size,
      savedLabel.mrp_npr,
    ].some((value) => String(value).toLowerCase().includes(query))
  ));
}

function readSavedForm(initialPreview: LabelPreviewResponse): LabelFormState | null {
  try {
    const rawValue = window.localStorage.getItem(labelFormStorageKey);
    if (!rawValue) return null;
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isRecord(parsedValue)) return null;
    return normalizeSavedForm(parsedValue, initialPreview);
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
  initialPreview: LabelPreviewResponse,
): LabelFormState {
  const initialForm = createInitialForm(initialPreview);
  return {
    templateId: initialForm.templateId,
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

function singleLabelStyle(template: LabelTemplateRecord): CSSProperties {
  return {
    "--label-height": `${template.label_height_mm}mm`,
    "--label-width": `${template.label_width_mm}mm`,
  } as CSSProperties;
}

function templateGeometryDetails(template: LabelTemplateRecord) {
  const measuredGeometry = isRecord(template.design_json.measured_geometry_mm)
    ? template.design_json.measured_geometry_mm
    : {};
  const pageWidth = mm(template.page_width_mm);
  const pageHeight = mm(template.page_height_mm);
  const labelWidth = mm(template.label_width_mm);
  const labelHeight = mm(template.label_height_mm);
  const leftMargin = mm(template.margin_left_mm);
  const topMargin = mm(template.margin_top_mm);
  const horizontalGap = mm(template.gap_x_mm);
  const verticalGap = mm(template.gap_y_mm);
  const rightMargin = pageWidth - leftMargin - (template.columns * labelWidth) - ((template.columns - 1) * horizontalGap);
  const bottomMargin = pageHeight - topMargin - (template.rows * labelHeight) - ((template.rows - 1) * verticalGap);
  const textInsetX = numberFromRecord(measuredGeometry, "text_table_inset_x", 1.53);
  const textInsetY = numberFromRecord(measuredGeometry, "text_table_inset_y", 0.32);
  return {
    rightMarginMm: formatMm(rightMargin),
    bottomMarginMm: formatMm(bottomMargin),
    textInsetXMm: formatMm(textInsetX),
    textInsetYMm: formatMm(textInsetY),
    outlineWidthPt: formatNumber(numberFromRecord(measuredGeometry, "border_line_weight_pt", 0.25)),
  };
}

function numberFromRecord(value: Record<string, unknown>, key: string, fallback: number) {
  const rawValue = value[key];
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) return rawValue;
  if (typeof rawValue === "string") {
    const parsed = Number.parseFloat(rawValue);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function mm(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatMm(value: number) {
  return value.toFixed(2);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}