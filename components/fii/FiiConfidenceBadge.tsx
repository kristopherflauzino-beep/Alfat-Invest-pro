import type { FiiConfidence } from "@/lib/analysis/alfatec-fii";

const styles: Record<FiiConfidence, string> = {
  Alta: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Media: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  Baixa: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Insuficiente: "bg-red-500/10 text-red-700 dark:text-red-300"
};

export function confidenceLabel(confidence: FiiConfidence) {
  return confidence === "Media" ? "Média" : confidence;
}

export function FiiConfidenceBadge({ confidence, reasons = [] }: { confidence: FiiConfidence; reasons?: string[] }) {
  return (
    <div className={`rounded-2xl px-3 py-2 text-sm font-bold ${styles[confidence]}`}>
      Confiança dos dados: {confidenceLabel(confidence)}
      {reasons[0] && <p className="mt-1 text-xs font-medium opacity-90">{reasons[0]}</p>}
    </div>
  );
}

