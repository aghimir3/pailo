"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Factory,
  Gauge,
  PackageCheck,
  Printer,
  ShieldCheck,
  Users,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/", label: "Dashboard", icon: Gauge, exact: true },
  { href: "/operations", label: "Operations", icon: Factory },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/work-orders", label: "Work orders", icon: PackageCheck },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/quality", label: "Quality", icon: ShieldCheck },
  { href: "/labels", label: "Labels", icon: Printer },
  { href: "/people", label: "People", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

type FactoryShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function FactoryShell({ actions, children, description, eyebrow, title }: FactoryShellProps) {
  const pathname = usePathname();

  return (
    <main className="factory-shell">
      <aside className="factory-sidebar" aria-label="Factory navigation">
        <Link className="factory-brand" href="/">
          <span className="brand-mark">P</span>
          <span>
            <small>Pailo Shoes</small>
            <strong>Factory OS</strong>
          </span>
        </Link>

        <nav className="factory-nav" aria-label="Primary">
          {navigationItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link className={cn("factory-nav-item", isActive && "active")} href={item.href} key={item.href}>
                <item.icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="factory-sidebar-footer">
          <span className="status-dot" />
          <div>
            <strong>Floor online</strong>
            <span>Live database</span>
          </div>
        </div>
      </aside>

      <section className="factory-workspace">
        <header className="factory-topbar">
          <div className="factory-title">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
          </div>
          <div className="factory-actions">
            <ThemeToggle />
            {actions}
            <Button asChild variant="glass">
              <a href="http://127.0.0.1:8000/docs">API docs</a>
            </Button>
          </div>
        </header>

        <nav className="factory-section-nav" aria-label="All factory sections">
          {navigationItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link className={cn("factory-section-nav-item", isActive && "active")} href={item.href} key={item.href}>
                <item.icon aria-hidden="true" size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {children}
      </section>

      <nav className="factory-mobile-nav" aria-label="Mobile navigation">
        {navigationItems.slice(0, 5).map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link className={cn("factory-mobile-nav-item", isActive && "active")} href={item.href} key={item.href}>
              <item.icon aria-hidden="true" size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}