import type { AlfatecFiiAnalysis } from "@/lib/analysis/alfatec-fii";
import { FiiConfidenceBadge } from "@/components/fii/FiiConfidenceBadge";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

function valueText(value: string | number | null | undefined, format?: "money" | "percent" | "compact") {
  if (value === null || value === undefined || value === "") return "Dado indisponível";
  if (typeof value === "number" && format === "money") return money.format(value);
  if (typeof value === "number" && format === "compact") return compactMoney.format(value);
  if (typeof value === "number" && format === "percent") return `${percent.format(value)}%`;
  return String(value);
}

function pps(value: string | number | null | undefined) {
  if (typeof value !== "number") return "Dado indisponível";
  return `${percent.format(value)} p.p.`;
}

export function AlfatecFiiScoreCard({ analysis }: { analysis: AlfatecFiiAnalysis }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-500">Método AlfaTec FIIs</p>
          <h3 className="mt-2 text-3xl font-black">{analysis.ticker}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-300">{analysis.name}</p>
          <p className="mt-2 text-sm font-bold text-cyan-700 dark:text-cyan-300">{analysis.kindLabel} · {analysis.segment}</p>
        </div>
        <div className="rounded-3xl bg-slate-950 p-5 text-white dark:bg-white/10">
          <p className="text-sm text-slate-300">Score AlfaTec FIIs</p>
          <p className="mt-1 text-4xl font-black">{analysis.score === null ? "--" : `${analysis.score}/100`}</p>
          <p className="mt-1 text-sm font-bold text-cyan-200">{analysis.classification}</p>
        </div>
      </div>

      {!analysis.applicable && analysis.reason && (
        <p className="mt-4 rounded-2xl bg-amber-500/10 p-3 text-sm font-bold text-amber-700 dark:text-amber-300">{analysis.reason}</p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Preço atual" value={valueText(analysis.price.value, "money")} />
        <Metric label="P/VP" value={valueText(analysis.pvp.value)} />
        <Metric label="DY recorrente" value={valueText(analysis.recurrentDividendYield.value, "percent")} />
        <Metric label="Prêmio de risco" value={pps(analysis.riskPremium.value)} />
        <Metric label="Liquidez" value={valueText(analysis.liquidity.value, "compact")} />
        <Metric label="Patrimônio líquido" value={valueText(analysis.patrimony.value, "compact")} />
        <Metric label="Cotistas" value={valueText(analysis.shareholders.value)} />
        <Metric label="Vacância" value={analysis.vacancy.status === "nao_aplicavel" ? "Não aplicável" : valueText(analysis.vacancy.value, "percent")} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <FiiConfidenceBadge confidence={analysis.confidence} reasons={analysis.confidenceReasons} />
        <Metric label="Qualidade do rendimento" value={analysis.incomeQuality} />
        <Metric label="Valuation" value={analysis.valuationInterpretation} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-emerald-500/10 p-4">
          <h4 className="font-black text-emerald-700 dark:text-emerald-300">Pontos positivos</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
            {analysis.positivePoints.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="rounded-3xl bg-amber-500/10 p-4">
          <h4 className="font-black text-amber-700 dark:text-amber-300">Pontos de atenção</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
            {analysis.attentionPoints.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 dark:bg-white/5">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

