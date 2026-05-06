"use client";

import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Calculator,
} from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch } from "@/lib/api";

interface CostVariance {
  work_order_code: string;
  planned_pairs: number;
  completed_pairs: number;
  estimated_cost_per_pair: number;
  actual_cost_per_pair: number | null;
  variance_pct: number | null;
  total_impact_npr: number | null;
}

export default function CostVariancePage() {
  const { data: variances, isLoading } = useQuery({
    queryKey: ["cost-variance"],
    queryFn: () => apiFetch<CostVariance[]>("/costing/variance"),
  });

  if (isLoading) {
    return (
      <FactoryShell eyebrow="Reports" title="Cost Variance">
        <LoadingSkeleton />
      </FactoryShell>
    );
  }

  if (!variances || variances.length === 0) {
    return (
      <FactoryShell eyebrow="Reports" title="Cost Variance">
        <EmptyState
          icon={<Calculator className="h-10 w-10" />}
          title="No cost data"
          description="Complete work orders with BOM snapshots to see variance analysis"
        />
      </FactoryShell>
    );
  }

  const totalImpact = variances.reduce(
    (sum, v) => sum + (v.total_impact_npr || 0),
    0
  );
  const avgVariance =
    variances.filter((v) => v.variance_pct !== null).reduce((sum, v) => sum + (v.variance_pct || 0), 0) /
    variances.filter((v) => v.variance_pct !== null).length;

  return (
    <FactoryShell eyebrow="Reports" title="Cost Variance">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <GlassCard className="p-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wider">Total Impact</p>
          <p
            className={`text-xl font-bold ${
              totalImpact > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {totalImpact > 0 ? "+" : ""}रू {Math.abs(totalImpact).toLocaleString()}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wider">Avg Variance</p>
          <p
            className={`text-xl font-bold ${
              avgVariance > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {avgVariance > 0 ? "+" : ""}
            {avgVariance.toFixed(1)}%
          </p>
        </GlassCard>
      </div>

      {/* Variance List */}
      <div className="space-y-3">
        {variances.map((item) => (
          <GlassCard
            key={item.work_order_code}
            className={`p-4 ${
              (item.variance_pct || 0) > 5 ? "border-red-500/20" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-sm font-semibold text-white">
                  {item.work_order_code}
                </span>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {item.completed_pairs} / {item.planned_pairs} pairs
                </p>
              </div>
              <div className="text-right">
                {item.variance_pct !== null && (
                  <div className="flex items-center gap-1">
                    {item.variance_pct > 0 ? (
                      <TrendingUp className="h-4 w-4 text-red-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-emerald-400" />
                    )}
                    <span
                      className={`text-sm font-bold ${
                        item.variance_pct > 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {item.variance_pct > 0 ? "+" : ""}
                      {item.variance_pct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
              <div className="text-xs text-zinc-400">
                <span>Est: रू {item.estimated_cost_per_pair.toFixed(0)}/pair</span>
                {item.actual_cost_per_pair && (
                  <span className="ml-3">
                    Act: रू {item.actual_cost_per_pair.toFixed(0)}/pair
                  </span>
                )}
              </div>
              {item.total_impact_npr !== null && (
                <span
                  className={`text-xs font-semibold ${
                    item.total_impact_npr > 0 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {item.total_impact_npr > 0 ? "+" : ""}रू{" "}
                  {Math.abs(item.total_impact_npr).toLocaleString()}
                </span>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </FactoryShell>
  );
}
