"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Clock,
  DollarSign,
  Target,
} from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch } from "@/lib/api";

interface WorkerRanking {
  employee_id: string;
  employee_name: string;
  total_pairs: number;
  total_hours: number;
  pairs_per_hour: number;
  avg_quality_rate: number | null;
  rank: number;
}

export default function ProductivityPage() {
  const [tab, setTab] = useState<"rankings" | "pay">("rankings");
  const [stage, setStage] = useState<string>("");

  const { data: rankings, isLoading } = useQuery({
    queryKey: ["productivity-rankings", stage],
    queryFn: () =>
      apiFetch<WorkerRanking[]>(
        `/productivity/rankings${stage ? `?stage=${stage}` : ""}`
      ),
  });

  if (isLoading) {
    return (
      <FactoryShell eyebrow="People" title="Worker Productivity">
        <LoadingSkeleton />
      </FactoryShell>
    );
  }

  return (
    <FactoryShell eyebrow="People" title="Worker Productivity">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-lg w-fit">
        {(["rankings", "pay"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t === "rankings" ? "Rankings" : "Piece Rate Pay"}
          </button>
        ))}
      </div>

      {tab === "rankings" && (
        <>
          {/* Stage Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {["", "cutting", "stitching", "lasting", "sole_attachment", "finishing"].map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    stage === s
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {s ? s.replace("_", " ") : "All Stages"}
                </button>
              )
            )}
          </div>

          {/* Rankings */}
          {!rankings || rankings.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-10 w-10" />}
              title="No production data"
              description="Log worker production to see rankings"
            />
          ) : (
            <div className="space-y-2">
              {rankings.map((worker, idx) => (
                <GlassCard key={worker.employee_id} className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        idx === 0
                          ? "bg-yellow-500/20 text-yellow-300"
                          : idx === 1
                          ? "bg-zinc-300/20 text-zinc-300"
                          : idx === 2
                          ? "bg-amber-600/20 text-amber-400"
                          : "bg-white/5 text-zinc-500"
                      }`}
                    >
                      {worker.rank}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {worker.employee_name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {worker.total_pairs} pairs
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {worker.total_hours.toFixed(1)}h
                        </span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">
                        {worker.pairs_per_hour.toFixed(1)}
                        <span className="text-xs text-zinc-500 ml-0.5">p/h</span>
                      </p>
                      {worker.avg_quality_rate !== null && (
                        <p className="text-[10px] text-zinc-500">
                          {worker.avg_quality_rate.toFixed(0)}% quality
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "pay" && <PieceRateView />}
    </FactoryShell>
  );
}

function PieceRateView() {
  const { data: rates, isLoading } = useQuery({
    queryKey: ["piece-rates"],
    queryFn: () =>
      apiFetch<
        {
          id: string;
          stage: string;
          style_category: string | null;
          rate_per_pair: number;
          effective_from: string;
          effective_to: string | null;
        }[]
      >("/productivity/piece-rates"),
  });

  if (isLoading) return <LoadingSkeleton />;

  if (!rates || rates.length === 0) {
    return (
      <EmptyState
        icon={<DollarSign className="h-10 w-10" />}
        title="No piece rates configured"
        description="Set up piece rates to calculate worker pay"
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400 mb-2">Active piece rates per pair produced:</p>
      {rates.map((rate) => (
        <GlassCard key={rate.id} className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-white capitalize">
                {rate.stage.replace("_", " ")}
              </span>
              {rate.style_category && (
                <Badge className="ml-2 bg-white/5 text-zinc-400 text-[10px]">
                  {rate.style_category}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">
                रू {rate.rate_per_pair}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            From {new Date(rate.effective_from).toLocaleDateString()}
            {rate.effective_to && ` to ${new Date(rate.effective_to).toLocaleDateString()}`}
          </p>
        </GlassCard>
      ))}
    </div>
  );
}
