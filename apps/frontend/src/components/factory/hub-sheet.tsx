"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Factory,
  Globe,
  Printer,
  ScanLine,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const hubNavigationItems = [
  { href: "/operations", label: "Operations", icon: Factory },
  { href: "/quality", label: "Quality", icon: ShieldCheck },
  { href: "/labels", label: "Labels", icon: Printer },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/people/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Globe },
];

const quickActions = [
  { id: "scan", label: "Scan Batch", icon: ScanLine },
  { id: "receive", label: "Receive Material", icon: Boxes },
  { id: "print", label: "Print Labels", icon: Printer, href: "/labels" },
];

type HubSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function HubSheet({ open, onClose }: HubSheetProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Close when navigating
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  return (
    <div
      className="hub-sheet-backdrop"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="hub-sheet" role="dialog" aria-modal="true" aria-label="Factory navigation hub">
        <div className="hub-sheet-header">
          <div className="hub-sheet-brand">
            <span className="brand-mark">P</span>
            <span>Factory OS</span>
          </div>
          <button className="hub-sheet-close" onClick={onClose} type="button" aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="hub-sheet-grid" aria-label="All sections">
          {hubNavigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                className={cn("hub-sheet-item", isActive && "active")}
                href={item.href}
                key={item.href}
              >
                <item.icon aria-hidden="true" size={24} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hub-sheet-divider" />

        <section className="hub-sheet-actions" aria-label="Quick actions">
          <h3>Quick Actions</h3>
          <div className="hub-sheet-action-grid">
            {quickActions.map((action) =>
              action.href ? (
                <Link className="hub-sheet-action" href={action.href} key={action.id}>
                  <action.icon aria-hidden="true" size={18} />
                  <span>{action.label}</span>
                </Link>
              ) : (
                <button className="hub-sheet-action" key={action.id} type="button" disabled>
                  <action.icon aria-hidden="true" size={18} />
                  <span>{action.label}</span>
                  <small>Coming soon</small>
                </button>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
