"use client";

import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
}

/**
 * Confirmation dialog for destructive or important actions.
 */
export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <>
      <div className="confirm-backdrop" onClick={onCancel} aria-hidden="true" />
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-description">{description}</p>
        <div className="confirm-actions">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "..." : confirmLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
