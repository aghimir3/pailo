"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Pause,
  CheckCircle2,
  Timer,
  AlertTriangle,
  Factory,
  CalendarDays,
  Target,
} from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading";
import { apiFetch, apiPost } from "@/lib/api";

interface StageLog {
  id: string;
  work_order_id: string;
  work_order_code: string;
  stage: string;
  started_at: string;
  completed_at: string | null;
  paused_at: string | null;
  pairs_input: number | null;
  pairs_output: number | null;
  pairs_defect: number;
  worker_count: number | null;
  duration_minutes: number | null;
}

interface BottleneckData {
  stages: {
    stage: string;
    avg_duration_minutes: number;
    throughput_per_hour: number;
    total_defects: number;
    is_bottleneck: boolean;
  }[];
  bottleneck_stage: string | null;
}

interface DailyPlan {
  id: string;
  plan_date: string;
  status: string;
  target_pairs: number;
  actual_pairs: number;
  items: {
    id: string;
    work_order_code: string;
    target_pairs: number;
    actual_pairs: number;
    materials_ready: boolean;
    priority: number;
  }[];
}

const STAGES = [
  "cutting",
  "stitching",
  "lasting",
  "sole_attachment",
  "finishing",
  "qc",
  "packing",
];

const STAGE_COLORS: Record<string, string> = {
  cutting: "bg-rose-500/20 text-rose-300",
  stitching: "bg-amber-500/20 text-amber-300",
  lasting: "bg-yellow-500/20 text-yellow-300",
  sole_attachment: "bg-lime-500/20 text-lime-300",
  finishing: "bg-emerald-500/20 text-emerald-300",
  qc: "bg-cyan-500/20 text-cyan-300",
  packing: "bg-blue-500/20 text-blue-300",
};

export default function ProductionPage() {
  const [tab, setTab] = useState<"plan" | "stages" | "bottleneck">("plan");

  return (
    <FactoryShell eyebrow="Production" title="Daily Production">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-lg w-fit overflow-x-auto">
        {(["plan", "stages", "bottleneck"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t === "plan" ? "Today's Plan" : t === "stages" ? "Stage Tracking" : "Bottleneck"}
          </button>
        ))}
      </div>

      {tab === "plan" && <DailyPlanView />}
      {tab === "stages" && <StageTrackingView />}
      {tab === "bottleneck" && <BottleneckView />}
    </FactoryShell>
  );
}

function DailyPlanView() {
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ["daily-plan-today"],
    queryFn: () => apiFetch<DailyPlan | null>("/production/plans/today"),
  });

  const confirmMutation = useMutation({
    mutationFn: (planId: string) => apiPost(`/production/plans/${planId}/confirm`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["daily-plan-today"] }),
  });

  if (isLoading) return <LoadingSkeleton />;

  if (!plan) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-10 w-10" />}
        title="No plan for today"
        description="Create a production plan to set daily targets"
      />
    );
  }

  const progress = plan.target_pairs > 0 ? (plan.actual_pairs / plan.target_pairs) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Daily Target</p>
            <p className="text-2xl font-bold text-white">
              {plan.actual_pairs} / {plan.target_pairs}
            </p>
          </div>
          <div className="text-right">
            <Badge
              className={
                plan.status === "confirmed"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : plan.status === "draft"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-blue-500/20 text-blue-300"
              }
            >
              {plan.status}
            </Badge>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-1">{Math.round(progress)}% complete</p>

        {plan.status === "draft" && (
          <Button
            size="sm"
            className="mt-3 w-full"
            onClick={() => confirmMutation.mutate(plan.id)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Plan
          </Button>
        )}
      </GlassCard>

      {/* Plan Items */}
      <div className="space-y-2">
        {plan.items
          .sort((a, b) => a.priority - b.priority)
          .map((item) => {
            const itemProgress =
              item.target_pairs > 0 ? (item.actual_pairs / item.target_pairs) * 100 : 0;
            return (
              <GlassCard key={item.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-zinc-400" />
                    <span className="font-mono text-sm text-white">
                      {item.work_order_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.materials_ready ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">
                        Materials ✓
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-300 text-[10px]">
                        Materials ✗
                      </Badge>
                    )}
                    <span className="text-sm text-zinc-300">
                      {item.actual_pairs}/{item.target_pairs}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(itemProgress, 100)}%` }}
                  />
                </div>
              </GlassCard>
            );
          })}
      </div>
    </div>
  );
}

function StageTrackingView() {
  const { data: workOrders } = useQuery({
    queryKey: ["active-work-orders"],
    queryFn: () =>
      apiFetch<{ id: string; work_order_code: string; current_stage: string }[]>(
        "/work-orders?status=in_progress"
      ),
  });

  const [selectedWO, setSelectedWO] = useState<string>("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["stage-logs", selectedWO],
    queryFn: () => apiFetch<StageLog[]>(`/production/stages/work-order/${selectedWO}`),
    enabled: !!selectedWO,
  });

  return (
    <div className="space-y-4">
      {/* WO Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {workOrders?.map((wo) => (
          <button
            key={wo.id}
            onClick={() => setSelectedWO(wo.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors ${
              selectedWO === wo.id
                ? "bg-white/10 text-white border border-white/20"
                : "bg-white/5 text-zinc-400 border border-transparent"
            }`}
          >
            {wo.work_order_code}
          </button>
        ))}
      </div>

      {!selectedWO ? (
        <EmptyState
          icon={<Factory className="h-10 w-10" />}
          title="Select a work order"
          description="Choose a work order above to view stage progress"
        />
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-2">
          {STAGES.map((stage) => {
            const log = logs?.find((l) => l.stage === stage);
            const isActive = log && !log.completed_at && !log.paused_at;
            const isPaused = log && log.paused_at;
            const isComplete = log && log.completed_at;

            return (
              <GlassCard
                key={stage}
                className={`p-3 ${isActive ? "border-emerald-500/30" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={STAGE_COLORS[stage] || "bg-white/10 text-zinc-300"}>
                      {stage.replace("_", " ")}
                    </Badge>
                    {isActive && (
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isComplete && (
                      <span className="text-xs text-zinc-400">
                        {log.pairs_output} pairs • {log.duration_minutes}min
                      </span>
                    )}
                    {isActive && (
                      <Timer className="h-4 w-4 text-emerald-400 animate-pulse" />
                    )}
                    {isPaused && <Pause className="h-4 w-4 text-amber-400" />}
                    {isComplete && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    {!log && <span className="text-xs text-zinc-600">—</span>}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BottleneckView() {
  const { data, isLoading } = useQuery({
    queryKey: ["bottleneck-analysis"],
    queryFn: () => apiFetch<BottleneckData>("/production/bottleneck"),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data || !data.stages || data.stages.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10" />}
        title="No production data"
        description="Start tracking stages to see bottleneck analysis"
      />
    );
  }

  const maxDuration = Math.max(...data.stages.map((s) => s.avg_duration_minutes));

  return (
    <div className="space-y-4">
      {data.bottleneck_stage && (
        <GlassCard className="p-4 border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold text-sm">
              Bottleneck: {data.bottleneck_stage.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            This stage has the slowest throughput and may be limiting output
          </p>
        </GlassCard>
      )}

      <div className="space-y-2">
        {data.stages.map((stage) => {
          const barWidth = maxDuration > 0 ? (stage.avg_duration_minutes / maxDuration) * 100 : 0;
          return (
            <GlassCard
              key={stage.stage}
              className={`p-3 ${stage.is_bottleneck ? "border-amber-500/20" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white capitalize">
                  {stage.stage.replace("_", " ")}
                </span>
                <div className="text-right">
                  <span className="text-sm text-zinc-300">
                    {Math.round(stage.avg_duration_minutes)} min
                  </span>
                  <span className="text-xs text-zinc-500 ml-2">
                    {stage.throughput_per_hour.toFixed(1)} pairs/hr
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    stage.is_bottleneck ? "bg-amber-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              {stage.total_defects > 0 && (
                <p className="text-[10px] text-red-400 mt-1">
                  {stage.total_defects} defects
                </p>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
