"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type FABProps = {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
};

export function FactoryFAB({ icon: Icon, label, href, onClick }: FABProps) {
  const className = "factory-fab";

  if (href) {
    return (
      <Link className={className} href={href} aria-label={label} title={label}>
        <Icon aria-hidden="true" size={22} />
      </Link>
    );
  }

  return (
    <button className={className} onClick={onClick} type="button" aria-label={label} title={label}>
      <Icon aria-hidden="true" size={22} />
    </button>
  );
}
