"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Factory,
  Gauge,
  Globe,
  Grid3X3,
  LogOut,
  PackageCheck,
  Printer,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { AuthGuard } from "@/components/auth-guard";
import { ThemeToggle } from "@/components/theme-toggle";
import { HubSheet } from "@/components/factory/hub-sheet";
import { cn } from "@/lib/utils";
import { useScrollDirection } from "@/lib/use-scroll-direction";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, exact: true },
  { href: "/operations", label: "Operations", icon: Factory },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/work-orders", label: "Work orders", icon: PackageCheck },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/quality", label: "Quality", icon: ShieldCheck },
  { href: "/labels", label: "Labels", icon: Printer },
  { href: "/people", label: "People", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Landing Page", icon: Globe },
];

// Bottom nav: 4 primary destinations + center hub
const mobileNavItems = [
  { href: "/dashboard", label: "Home", icon: Gauge, exact: true },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  // hub button inserted between these
  { href: "/work-orders", label: "Orders", icon: PackageCheck },
  { href: "/inventory", label: "Stock", icon: Boxes },
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
  const { user, logout, isLoggedIn } = useAuth();
  const [hubOpen, setHubOpen] = useState(false);
  const navHidden = useScrollDirection();

  return (
    <AuthGuard>
    <main className="factory-shell">
      <aside className="factory-sidebar" aria-label="Factory navigation">
        <Link className="factory-brand" href="/dashboard">
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

        <a
          href="/api/v1/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="factory-nav-item opacity-50 hover:opacity-80 text-xs mt-auto"
        >
          API docs
        </a>

        <div className="factory-sidebar-footer">
          {isLoggedIn && user ? (
            <>
              <span className="status-dot" />
              <div className="flex-1 min-w-0">
                <strong className="block truncate text-xs">{user.display_name}</strong>
                <span className="block truncate text-xs opacity-70">{user.role}</span>
              </div>
              <button
                onClick={logout}
                className="ml-auto p-1 opacity-60 hover:opacity-100 transition-opacity"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <span className="status-dot" />
              <div>
                <strong>Floor online</strong>
                <span>Live database</span>
              </div>
            </>
          )}
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
          </div>
        </header>

        {children}
      </section>

      {/* Mobile bottom nav: 4 items + center hub button */}
      <nav className={cn("factory-mobile-nav", navHidden && "nav-hidden")} aria-label="Mobile navigation">
        {mobileNavItems.slice(0, 2).map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link className={cn("factory-mobile-nav-item", isActive && "active")} href={item.href} key={item.href}>
              <item.icon aria-hidden="true" size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          className={cn("factory-mobile-nav-hub", hubOpen && "active")}
          onClick={() => setHubOpen(true)}
          type="button"
          aria-label="Open navigation hub"
          aria-expanded={hubOpen}
        >
          <Grid3X3 aria-hidden="true" size={20} />
        </button>

        {mobileNavItems.slice(2).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link className={cn("factory-mobile-nav-item", isActive && "active")} href={item.href} key={item.href}>
              <item.icon aria-hidden="true" size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <HubSheet open={hubOpen} onClose={() => setHubOpen(false)} />
    </main>
    </AuthGuard>
  );
}