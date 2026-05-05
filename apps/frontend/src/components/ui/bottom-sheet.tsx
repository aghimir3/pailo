"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Mobile-first bottom sheet that becomes a centered dialog on desktop.
 * Uses native dialog element for accessibility.
 */
export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <>
      <div
        ref={backdropRef}
        className="bottom-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn("bottom-sheet", className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="bottom-sheet-header">
          <div className="bottom-sheet-handle" />
          <div className="bottom-sheet-title-row">
            <h2 className="bottom-sheet-title">{title}</h2>
            <button
              onClick={onClose}
              className="bottom-sheet-close"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </>
  );
}
