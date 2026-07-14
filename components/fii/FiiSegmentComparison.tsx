import type { FiiSegmentComparison as SegmentComparison } from "@/lib/analysis/alfatec-fii";

export function FiiSegmentComparison({ comparison, ticker, score }: { comparison: SegmentComparison; ticker: string; score: number | null }) {
  return (
    <div className="rounded-3xl border border-slate-200 p-4 dark:border-white/10">
      <h4 className="font-black">Comparação por segmento</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric label="Posição no segmento" value={comparison.position === null ? "Dados insuficientes" : `${comparison.position}º de ${comparison.total}`} />
        <Metric label="Média do segmento" value={comparison.averageScore === null ? "Dados insuficientes" : `${comparison.averageScore}/100`} />
        <Metric label={`Score ${ticker}`} value={score === null ? "Dados insuficientes" : `${score}/100`} />
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Comparação feita apenas com fundos do mesmo segmento. Tickers considerados: {comparison.compatibleTickers.length ? comparison.compatibleTickers.join(", ") : "dados insuficientes"}.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

