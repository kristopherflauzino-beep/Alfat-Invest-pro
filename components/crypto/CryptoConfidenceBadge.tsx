import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import type { CryptoConfidence } from "@/lib/analysis/alfatec-crypto";
export function CryptoConfidenceBadge({ value }: { value: CryptoConfidence }) {
  const Icon = value === "Alta" ? CheckCircle2 : value === "Insuficiente" ? AlertTriangle : HelpCircle;
  const label = value === "Media" ? "Media" : value;
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"><Icon className="h-3.5 w-3.5" />Confianca: {label}</span>;
}
