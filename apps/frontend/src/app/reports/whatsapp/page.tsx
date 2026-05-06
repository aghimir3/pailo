"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageSquare, Send, Calendar } from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { apiFetch, apiPost } from "@/lib/api";

export default function WhatsAppReportsPage() {
  const [reportType, setReportType] = useState<"daily" | "weekly">("daily");

  const { data: dailyReport, isLoading: dailyLoading } = useQuery({
    queryKey: ["whatsapp-daily-report"],
    queryFn: () => apiFetch<{ report_date: string; text: string }>("/reports/whatsapp/daily-summary"),
    enabled: reportType === "daily",
  });

  const { data: weeklyReport, isLoading: weeklyLoading } = useQuery({
    queryKey: ["whatsapp-weekly-report"],
    queryFn: () => apiFetch<{ week_ending: string; text: string }>("/reports/whatsapp/weekly-summary"),
    enabled: reportType === "weekly",
  });

  const sendMutation = useMutation({
    mutationFn: () => apiPost("/reports/whatsapp/send-daily", {}),
  });

  const isLoading = reportType === "daily" ? dailyLoading : weeklyLoading;
  const reportText = reportType === "daily" ? dailyReport?.text : weeklyReport?.text;

  return (
    <FactoryShell
      eyebrow="Reports"
      title="WhatsApp Reports"
      actions={
        <Button
          size="sm"
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending}
        >
          <Send size={14} />
          Send Daily
        </Button>
      }
    >
      {/* Tab selector */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            reportType === "daily"
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={() => setReportType("daily")}
        >
          <Calendar size={14} className="inline mr-1.5" />
          Daily
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            reportType === "weekly"
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={() => setReportType("weekly")}
        >
          <Calendar size={14} className="inline mr-1.5" />
          Weekly
        </button>
      </div>

      {/* Status */}
      {sendMutation.isSuccess && (
        <div className="mb-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-sm text-emerald-300">
            Report sent successfully
          </p>
        </div>
      )}

      {/* Report Preview */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-green-400" />
              <span className="text-sm font-medium text-zinc-300">
                WhatsApp Preview
              </span>
            </div>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              {reportType === "daily" ? "Daily" : "Weekly"}
            </Badge>
          </div>

          {/* WhatsApp-style message bubble */}
          <div className="bg-[#1a2e1a] border border-green-900/40 rounded-xl p-4 font-mono text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
            {reportText || "No data available for this period."}
          </div>

          <p className="text-xs text-zinc-500 mt-3">
            This message will be sent to factory managers via WhatsApp when triggered.
            Messages use Unicode formatting compatible with WhatsApp.
          </p>
        </GlassCard>
      )}
    </FactoryShell>
  );
}
