"use client";

import { useState, type ReactNode } from "react";
import { PartnerFormDialog } from "./partner-form-dialog";

export function PartnerCTA({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="partner-cta-trigger"
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <PartnerFormDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
