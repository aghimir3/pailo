"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  Timer,
  Truck,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

import { GlassCard } from "@/components/ui/glass-card";
import { apiFetch } from "@/lib/api";

interface PendingOrdersSummary {
  total_pending: number;
  total_value_npr: number;
  overdue_count: number;
}

interface OverdueDelivery {
  id: string;
  po_number: string;
  supplier_name: string;
  days_overdue: number;
}

export function OperationsSummary() {
  const { data: pendingOrders } = useQuery({
    queryKey: ["dashboard-pending-orders"],
    queryFn: () => apiFetch<PendingOrdersSummary>("/sales/orders/pending-summary"),
    retry: false,
  });

  const { data: overduePOs } = useQuery({
    queryKey: ["dashboard-overdue-pos"],
    queryFn: () => apiFetch<OverdueDelivery[]>("/purchasing/overdue"),
    retry: false,
  });

  const hasAlerts =
    (pendingOrders && (pendingOrders.total_pending > 0 || pendingOrders.overdue_count > 0)) ||
    (overduePOs && overduePOs.length > 0);

  if (!hasAlerts) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Pending Sales Orders */}
      {pendingOrders && pendingOrders.total_pending > 0 && (
        <Link href="/sales" className="block">
          <GlassCard className="p-3 hover:border-white/20 transition-colors h-full">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart size={14} className="text-blue-400" />
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider">Orders</span>
            </div>
            <p className="text-xl font-bold text-white">{pendingOrders.total_pending}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              NPR {(pendingOrders.total_value_npr / 1000).toFixed(0)}K pending
            </p>
          </GlassCard>
        </Link>
      )}

      {/* Overdue Sales */}
      {pendingOrders && pendingOrders.overdue_count > 0 && (
        <Link href="/sales" className="block">
          <GlassCard className="p-3 border-amber-500/30 hover:border-amber-500/50 transition-colors h-full">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-[11px] text-amber-400 uppercase tracking-wider">Late</span>
            </div>
            <p className="text-xl font-bold text-amber-300">{pendingOrders.overdue_count}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">orders past due</p>
          </GlassCard>
        </Link>
      )}

      {/* Overdue Purchase Orders */}
      {overduePOs && overduePOs.length > 0 && (
        <Link href="/purchasing" className="block">
          <GlassCard className="p-3 border-red-500/30 hover:border-red-500/50 transition-colors h-full">
            <div className="flex items-center gap-2 mb-1">
              <Truck size={14} className="text-red-400" />
              <span className="text-[11px] text-red-400 uppercase tracking-wider">Overdue PO</span>
            </div>
            <p className="text-xl font-bold text-red-300">{overduePOs.length}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {overduePOs[0]?.supplier_name}
              {overduePOs.length > 1 && ` +${overduePOs.length - 1}`}
            </p>
          </GlassCard>
        </Link>
      )}

      {/* Production Link */}
      <Link href="/production" className="block">
        <GlassCard className="p-3 hover:border-white/20 transition-colors h-full">
          <div className="flex items-center gap-2 mb-1">
            <Timer size={14} className="text-emerald-400" />
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider">Production</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-sm text-zinc-300">View today</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Stage tracking &amp; plan</p>
        </GlassCard>
      </Link>

      {/* Cycle Count Link */}
      <Link href="/inventory/cycle-count" className="block">
        <GlassCard className="p-3 hover:border-white/20 transition-colors h-full">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck size={14} className="text-cyan-400" />
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider">Counts</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <ClipboardCheck size={14} className="text-cyan-400" />
            <span className="text-sm text-zinc-300">Cycle count</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Verify stock accuracy</p>
        </GlassCard>
      </Link>
    </div>
  );
}
