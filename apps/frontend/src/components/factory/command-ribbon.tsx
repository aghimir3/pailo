"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, Construction, Printer, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeatureInfo = {
  label: string;
  description: string;
};

const features: Record<string, FeatureInfo> = {
  scan: {
    label: "Scan Batch",
    description: "Scan batch QR codes to instantly track production status and update work orders on the factory floor.",
  },
  receive: {
    label: "Receive Material",
    description: "Record incoming raw materials, update inventory counts, and link deliveries to purchase orders.",
  },
  print: {
    label: "Print Labels",
    description: "Generate and print product labels, batch tags, and shipping labels with Pailo branding.",
  },
};

export function CommandRibbon() {
  const [openFeature, setOpenFeature] = useState<string | null>(null);

  return (
    <>
      <section className="command-ribbon" aria-label="Factory actions">
        <Button type="button" variant="glass" onClick={() => setOpenFeature("scan")}>
          <ScanLine aria-hidden="true" size={17} />
          Scan batch
        </Button>
        <Button type="button" variant="glass" onClick={() => setOpenFeature("receive")}>
          <Boxes aria-hidden="true" size={17} />
          Receive material
        </Button>
        <Button variant="glass" asChild>
          <Link href="/labels">
            <Printer aria-hidden="true" size={17} />
            Print labels
          </Link>
        </Button>
      </section>

      {openFeature && (
        <div
          className="coming-soon-backdrop"
          role="presentation"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenFeature(null); }}
        >
          <div className="coming-soon-modal" role="dialog" aria-modal="true" aria-labelledby="coming-soon-title">
            <button className="coming-soon-close" onClick={() => setOpenFeature(null)} type="button" aria-label="Close">
              <X size={18} />
            </button>
            <div className="coming-soon-icon">
              <Construction size={32} />
            </div>
            <h2 id="coming-soon-title">{features[openFeature].label}</h2>
            <p className="coming-soon-description">{features[openFeature].description}</p>
            <p className="coming-soon-status">This feature is under development and will be available soon.</p>
            <Button type="button" variant="glass" onClick={() => setOpenFeature(null)}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
