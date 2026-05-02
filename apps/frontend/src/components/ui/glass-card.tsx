import type * as React from "react";

import { cn } from "@/lib/utils";

export function GlassCard({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <article className={cn("glass-card", className)} {...props} />;
}

export function GlassSection({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("glass-card", className)} {...props} />;
}

export function PanelHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("panel-heading", className)} {...props} />;
}
