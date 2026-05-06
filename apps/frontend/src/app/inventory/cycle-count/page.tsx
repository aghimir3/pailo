"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
} from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { apiFetch, apiPost } from "@/lib/api";

interface CycleCount {
  id: string;
  count_number: string;
  count_date: string;
  status: string;
  count_type: string;
  total_items_counted: number;
  discrepancies_found: number;
  total_variance_npr: number;
}

interface CycleCountDetail {
  id: string;
  count_number: string;
  count_date: string;
  status: string;
  count_type: string;
  items: {
    id: string;
    material_id: string;
    material_name: string;
    material_code: string;
    system_quantity: number;
    counted_quantity: number | null;
    variance: number | null;
    variance_pct: number | null;
    unit_cost_npr: number | null;
    variance_value_npr: number | null;
    adjustment_approved: boolean;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-blue-500/20 text-blue-300",
  completed: "bg-amber-500/20 text-amber-300",
  approved: "bg-emerald-500/20 text-emerald-300",
};

export default function CycleCountPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCount, setSelectedCount] = useState<string | null>(null);

  const { data: counts, isLoading } = useQuery({
    queryKey: ["cycle-counts"],
    queryFn: () => apiFetch<CycleCount[]>("/inventory-ext/cycle-counts"),
  });

  const { data: detail } = useQuery({
    queryKey: ["cycle-count-detail", selectedCount],
    queryFn: () => apiFetch<CycleCountDetail>(`/inventory-ext/cycle-counts/${selectedCount}`),
    enabled: !!selectedCount,
  });

  const startMutation = useMutation({
    mutationFn: (data: { count_type: string; category_filter?: string }) =>
      apiPost("/inventory-ext/cycle-counts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-counts"] });
      setShowCreate(false);
    },
  });

  if (isLoading) {
    return (
      <FactoryShell eyebrow="Inventory" title="Cycle Counts">
        <LoadingSkeleton />
      </FactoryShell>
    );
  }

  // Detail View
  if (selectedCount && detail) {
    return (
      <FactoryShell
        eyebrow="Inventory"
        title={detail.count_number}
        actions={
          <Button size="sm" variant="ghost" onClick={() => setSelectedCount(null)}>
            ← Back
          </Button>
        }
      >
        <CycleCountDetailView detail={detail} />
      </FactoryShell>
    );
  }

  return (
    <FactoryShell
      eyebrow="Inventory"
      title="Cycle Counts"
      actions={
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Start Count
        </Button>
      }
    >
      {!counts || counts.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-10 w-10" />}
          title="No cycle counts"
          description="Start a cycle count to verify inventory accuracy"
        />
      ) : (
        <div className="space-y-3">
          {counts.map((cc) => (
            <GlassCard
              key={cc.id}
              className="p-4 cursor-pointer hover:border-white/20 transition-colors"
              onClick={() => setSelectedCount(cc.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">
                      {cc.count_number}
                    </span>
                    <Badge className={STATUS_COLORS[cc.status] || ""}>
                      {cc.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {cc.count_type} • {new Date(cc.count_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white">{cc.total_items_counted} items</p>
                  {cc.discrepancies_found > 0 && (
                    <p className="text-xs text-amber-400">
                      {cc.discrepancies_found} discrepancies
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Start Count Sheet */}
      <BottomSheet open={showCreate} onClose={() => setShowCreate(false)} title="Start Cycle Count">
        <StartCountForm onSubmit={(data) => startMutation.mutate(data)} />
      </BottomSheet>
    </FactoryShell>
  );
}

function StartCountForm({
  onSubmit,
}: {
  onSubmit: (data: { count_type: string; category_filter?: string }) => void;
}) {
  const [countType, setCountType] = useState("full");
  const [category, setCategory] = useState("");

  return (
    <div className="space-y-4 p-4">
      <FormSelect
        label="Count Type"
        value={countType}
        onChange={(val) => setCountType(val)}
        options={[
          { value: "full", label: "Full Count" },
          { value: "category", label: "By Category" },
          { value: "abc_class_a", label: "ABC Class A (High Value)" },
          { value: "random_sample", label: "Random Sample" },
        ]}
      />
      {countType === "category" && (
        <FormInput
          label="Category"
          value={category}
          onChange={(val) => setCategory(val)}
          placeholder="e.g., leather, sole, adhesive"
        />
      )}
      <Button
        className="w-full"
        onClick={() =>
          onSubmit({
            count_type: countType,
            category_filter: countType === "category" ? category : undefined,
          })
        }
      >
        <ClipboardCheck className="h-4 w-4 mr-1" /> Start Count
      </Button>
    </div>
  );
}

function CycleCountDetailView({ detail }: { detail: CycleCountDetail }) {
  const queryClient = useQueryClient();
  const [countValues, setCountValues] = useState<Record<string, string>>({});

  const recordMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      apiPost(`/inventory-ext/cycle-counts/items/${itemId}/record`, {
        counted_quantity: quantity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-count-detail", detail.id] });
    },
  });

  const uncounted = detail.items.filter((i) => i.counted_quantity === null);
  const discrepancies = detail.items.filter(
    (i) => i.counted_quantity !== null && i.variance !== null && i.variance !== 0
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <GlassCard className="p-3 text-center">
          <p className="text-lg font-bold text-white">{detail.items.length}</p>
          <p className="text-[10px] text-zinc-400">Total Items</p>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{uncounted.length}</p>
          <p className="text-[10px] text-zinc-400">Uncounted</p>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <p className="text-lg font-bold text-red-400">{discrepancies.length}</p>
          <p className="text-[10px] text-zinc-400">Variances</p>
        </GlassCard>
      </div>

      {/* Items to count */}
      {detail.status === "in_progress" && uncounted.length > 0 && (
        <div>
          <p className="text-sm font-medium text-zinc-300 mb-2">Items to Count</p>
          <div className="space-y-2">
            {uncounted.slice(0, 10).map((item) => (
              <GlassCard key={item.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{item.material_name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{item.material_code}</p>
                    <p className="text-xs text-zinc-400">
                      System: {item.system_quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded-md text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-white/20"
                      placeholder="Qty"
                      value={countValues[item.id] || ""}
                      onChange={(e) =>
                        setCountValues({ ...countValues, [item.id]: e.target.value })
                      }
                    />
                    <Button
                      size="sm"
                      disabled={!countValues[item.id]}
                      onClick={() =>
                        recordMutation.mutate({
                          itemId: item.id,
                          quantity: Number(countValues[item.id]),
                        })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Discrepancies */}
      {discrepancies.length > 0 && (
        <div>
          <p className="text-sm font-medium text-amber-400 mb-2">Discrepancies</p>
          <div className="space-y-2">
            {discrepancies.map((item) => (
              <GlassCard key={item.id} className="p-3 border-amber-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{item.material_name}</p>
                    <p className="text-xs text-zinc-400">
                      System: {item.system_quantity} → Counted: {item.counted_quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        (item.variance || 0) > 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {(item.variance || 0) > 0 ? "+" : ""}
                      {item.variance}
                    </p>
                    {item.variance_value_npr !== null && (
                      <p className="text-[10px] text-zinc-500">
                        रू {Math.abs(item.variance_value_npr).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
