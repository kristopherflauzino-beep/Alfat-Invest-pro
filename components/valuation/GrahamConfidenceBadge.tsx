"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { GrahamConfidence } from "@/lib/valuation/graham";

const styles: Record<GrahamConfidence, string> = {
  alta: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  media: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  baixa: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  insuficiente: "bg-red-500/10 text-red-700 dark:text-red-300"
};

export function GrahamConfidenceBadge({ confidence, reason }: { confidence: GrahamConfidence; reason: string }) {
  const Icon = confidence === "alta" ? CheckCircle2 : confidence === "insuficiente" ? AlertTriangle : Info;

  return (
    <div className={`rounded-2xl p-3 text-sm font-semibold ${styles[confidence]}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span>Confiança do cálculo: {confidence}</span>
      </div>
      <p className="mt-1 text-xs opacity-90">{reason}</p>
    </div>
  );
}
