import type { AlfatecFiiAnalysis, FiiScoreKey } from "@/lib/analysis/alfatec-fii";

const labels: Record<FiiScoreKey, string> = {
  qualidade: "Qualidade",
  renda: "Renda",
  risco: "Risco",
  valuation: "Valuation",
  gestao: "Gestão",
  liquidez: "Liquidez",
  diversificacao: "Diversificação"
};

export function FiiScoreBreakdown({ analysis }: { analysis: AlfatecFiiAnalysis }) {
  const keys = Object.keys(analysis.weights) as FiiScoreKey[];

  return (
    <div className="rounded-3xl border border-slate-200 p-4 dark:border-white/10">
      <h4 className="font-black">Composição do Score AlfaTec FIIs</h4>
      <div className="mt-4 space-y-3">
        {keys.map((key) => {
          const score = analysis.scores[key];
          const width = score === null ? 0 : Math.max(4, Math.min(100, score));
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{labels[key]}</span>
                <strong>{score === null ? "Dado indisponível" : `${Math.round(score)}/100`} · peso {analysis.weights[key]}%</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
        {analysis.scoreExplanation.map((item) => <p key={item}>{item}</p>)}
      </div>
    </div>
  );
}

