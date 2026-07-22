"use client";

import { AlertCircle, Calculator, CalendarClock, CheckCircle2, ExternalLink, Info, LineChart as LineChartIcon, RefreshCw, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateFixedIncome, parseBrazilianCurrencyToCents } from "@/lib/fixed-income/calculator";
import { fixedIncomeIndexers, type FixedIncomeCalculationInput, type FixedIncomeCalculationResult, type FixedIncomeIndexer, type FixedIncomeReferenceRates, type ReferenceRate } from "@/lib/fixed-income/types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactBrl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const dateFormat = new Intl.DateTimeFormat("pt-BR");
const panelClass = "rounded-lg border border-slate-200 bg-white p-4 text-slate-950 dark:border-white/10 dark:bg-[#0f172a] dark:text-[#f8fafc] sm:p-5";
const inputClass = "mt-1 h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-[#020817] dark:text-[#f8fafc]";
const today = () => new Date().toISOString().slice(0, 10);
const future = (days: number) => { const value = new Date(); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); };
const numberValue = (value: string) => { const parsed = Number(value.replace(",", ".")); return Number.isFinite(parsed) ? parsed : undefined; };
const money = (cents: number) => brl.format(cents / 100);
const formatDate = (value?: string) => value ? dateFormat.format(new Date(value + (value.length === 10 ? "T12:00:00" : ""))) : "Não informada";

type CalculatorForm = {
  principal: string; monthly: string; startDate: string; endDate: string; product: string;
  indexer: FixedIncomeIndexer; rateMode: "automatic" | "manual"; rateMethod: "percentage" | "spread";
  percentage: string; spread: string; fixed: string; manualReference: string; inflationScenario: string;
  taxExempt: boolean; iof: boolean; custody: string; fixedFee: string; dayCountBasis: "252" | "360" | "365";
  contributionTiming: "end" | "beginning";
};

const initialForm: CalculatorForm = {
  principal: "10.000,00", monthly: "0,00", startDate: today(), endDate: future(365), product: "CDB",
  indexer: "CDI", rateMode: "automatic", rateMethod: "percentage", percentage: "100", spread: "0",
  fixed: "0", manualReference: "", inflationScenario: "", taxExempt: false, iof: true, custody: "0",
  fixedFee: "0,00", dayCountBasis: "365", contributionTiming: "end"
};

type Comparison = { name: string; result: FixedIncomeCalculationResult | null; liquidity: string; risk: string; protection: string; note: string };

export function FixedIncomeCalculator({ rates }: { rates: FixedIncomeReferenceRates | null }) {
  const [form, setForm] = useState(initialForm);
  const [view, setView] = useState<"monthly" | "annual">("monthly");
  const [calculatedAt, setCalculatedAt] = useState<number | null>(null);
  const officialRate = rateForIndexer(form.indexer, rates);

  const calculationInput = useMemo<FixedIncomeCalculationInput>(() => ({
    principalInCents: parseBrazilianCurrencyToCents(form.principal) ?? 0,
    monthlyContributionInCents: parseBrazilianCurrencyToCents(form.monthly) ?? 0,
    startDate: form.startDate, endDate: form.endDate, productName: form.product, indexer: form.indexer,
    indexerPercentage: numberValue(form.percentage), fixedRateAnnual: numberValue(form.fixed),
    spreadAnnual: numberValue(form.spread), cdiAnnual: rates?.cdi.annualPercent, selicAnnual: rates?.selic.annualPercent,
    inflationAnnual: form.indexer === "IPCA" ? rates?.ipca.annualPercent : numberValue(form.inflationScenario) ?? rates?.ipca.annualPercent,
    manualReferenceAnnual: numberValue(form.manualReference), rateMode: form.rateMode, rateMethod: form.rateMethod,
    taxExempt: form.taxExempt, iofApplicable: form.iof, custodyFeeAnnual: numberValue(form.custody),
    brokerageFeeInCents: parseBrazilianCurrencyToCents(form.fixedFee) ?? 0,
    dayCountBasis: Number(form.dayCountBasis) as 252 | 360 | 365, contributionTiming: form.contributionTiming
  }), [form, rates]);

  const result = useMemo(() => calculateFixedIncome(calculationInput), [calculationInput]);
  const automaticUnavailable = form.indexer !== "PREFIXED" && form.rateMode === "automatic" && officialRate?.annualPercent === undefined;
  const manualUnavailable = form.indexer !== "PREFIXED" && form.rateMode === "manual" && numberValue(form.manualReference) === undefined;
  const chartData = useMemo(() => {
    if (!result) return [];
    const source = view === "annual" && result.evolution.length > 2
      ? result.evolution.filter((point, index, items) => index === 0 || index === items.length - 1 || index % 12 === 0)
      : result.evolution;
    return source.map((point) => ({ date: formatDate(point.date), investido: point.investedInCents / 100, bruto: point.grossBalanceInCents / 100, liquido: point.netBalanceInCents / 100 }));
  }, [result, view]);
  const comparisons = useMemo(() => buildComparisons(calculationInput, result, rates), [calculationInput, result, rates]);

  function update<K extends keyof CalculatorForm>(key: K, value: CalculatorForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function switchToManual() {
    setForm((current) => ({ ...current, manualReference: officialRate?.annualPercent === undefined ? "" : String(officialRate.annualPercent), rateMode: "manual" }));
  }

  return <div className="space-y-5">
    <section className={panelClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-300">Simulação detalhada</p><h3 className="mt-1 flex items-center gap-2 text-xl font-black"><Calculator className="h-5 w-5 text-cyan-500" />Calculadora de renda fixa</h3><p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-[#cbd5e1]">Compare o valor aplicado com o valor líquido estimado após rendimentos, IR, IOF, custódia e taxas.</p></div>
        <span className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-[#cbd5e1]">Cálculo em tempo real</span>
      </div>

      <div className="mt-5"><span className="text-xs font-bold text-slate-600 dark:text-[#cbd5e1]">Origem da taxa de referência</span><div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1 dark:bg-[#020817]">
        <button type="button" onClick={() => update("rateMode", "automatic")} disabled={form.indexer === "PREFIXED"} className={`min-h-10 rounded-md px-3 text-sm font-bold transition ${form.rateMode === "automatic" ? "bg-white text-cyan-700 shadow-sm dark:bg-[#0f172a] dark:text-cyan-300" : "text-slate-600 dark:text-slate-300"} disabled:opacity-50`}>Automática</button>
        <button type="button" onClick={switchToManual} disabled={form.indexer === "PREFIXED"} className={`min-h-10 rounded-md px-3 text-sm font-bold transition ${form.rateMode === "manual" ? "bg-white text-cyan-700 shadow-sm dark:bg-[#0f172a] dark:text-cyan-300" : "text-slate-600 dark:text-slate-300"} disabled:opacity-50`}>Manual</button>
      </div></div>

      <RateSourceInfo indexer={form.indexer} mode={form.rateMode} rate={officialRate} manualValue={form.manualReference} onUseManual={switchToManual} />

      <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Valor inicial (R$)" value={form.principal} onChange={(value) => update("principal", value)} inputMode="decimal" />
        <Field label="Aporte mensal (R$)" value={form.monthly} onChange={(value) => update("monthly", value)} inputMode="decimal" />
        <Select label="Produto" value={form.product} onChange={(value) => update("product", value)} options={[["CDB","CDB"],["LCI","LCI"],["LCA","LCA"],["TESOURO_SELIC","Tesouro Selic"],["TESOURO_PREFIXADO","Tesouro Prefixado"],["TESOURO_IPCA","Tesouro IPCA+"],["DEBENTURE","Debênture"],["POUPANCA","Poupança"],["OUTRO","Outro"]]} />
        <Field label="Data inicial" value={form.startDate} onChange={(value) => update("startDate", value)} type="date" />
        <Field label="Data final" value={form.endDate} onChange={(value) => update("endDate", value)} type="date" />
        <Select label="Indexador" value={form.indexer} onChange={(value) => { const indexer = value as FixedIncomeIndexer; setForm((current) => ({ ...current, indexer, rateMode: indexer === "PREFIXED" ? "manual" : current.rateMode })); }} options={fixedIncomeIndexers.map((value) => [value, indexerLabel(value)])} />
        {(form.indexer === "CDI" || form.indexer === "SELIC" || form.indexer === "OTHER" || form.indexer === "IGPM" || form.indexer === "TR") && <>
          <Select label="Forma de remuneração" value={form.rateMethod} onChange={(value) => update("rateMethod", value as CalculatorForm["rateMethod"])} options={[["percentage","% do indexador"],["spread","Indexador + spread"]]} />
          {form.rateMethod === "percentage" ? <Field label="Percentual do indexador (%)" value={form.percentage} onChange={(value) => update("percentage", value)} type="number" step="0.01" /> : <Field label="Spread adicional (% a.a.)" value={form.spread} onChange={(value) => update("spread", value)} type="number" step="0.01" />}
        </>}
        {(form.indexer === "PREFIXED" || form.indexer === "IPCA") && <Field label={form.indexer === "IPCA" ? "Taxa real (% a.a.)" : "Taxa prefixada (% a.a.)"} value={form.fixed} onChange={(value) => update("fixed", value)} type="number" step="0.01" />}
        {form.rateMode === "manual" && form.indexer !== "PREFIXED" && <Field label={`${indexerLabel(form.indexer)} manual (% a.a.)`} value={form.manualReference} onChange={(value) => update("manualReference", value)} type="number" step="0.01" />}
        {form.indexer !== "IPCA" && <Field label="Inflação para retorno real (% a.a.)" value={form.inflationScenario} onChange={(value) => update("inflationScenario", value)} type="number" step="0.01" placeholder={rates?.ipca.annualPercent === undefined ? "Opcional" : String(rates.ipca.annualPercent)} />}
        <Field label="Custódia (% a.a.)" value={form.custody} onChange={(value) => update("custody", value)} type="number" step="0.01" />
        <Field label="Taxa fixa (R$)" value={form.fixedFee} onChange={(value) => update("fixedFee", value)} inputMode="decimal" />
        <Select label="Base da capitalização" value={form.dayCountBasis} onChange={(value) => update("dayCountBasis", value as CalculatorForm["dayCountBasis"])} options={[["252","252 dias úteis"],["360","360 dias"],["365","365 dias"]]} />
        <Select label="Momento do aporte" value={form.contributionTiming} onChange={(value) => update("contributionTiming", value as CalculatorForm["contributionTiming"])} options={[["end","Fim de cada mês"],["beginning","Início de cada mês"]]} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><Check label="Produto isento de IR" checked={form.taxExempt} onChange={(value) => update("taxExempt", value)} /><Check label="Aplicar IOF em resgates antes de 30 dias" checked={form.iof} onChange={(value) => update("iof", value)} /></div>
      <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={() => setCalculatedAt(Date.now())} disabled={!result} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-cyan-600 px-5 font-black text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className="h-4 w-4" />Calcular rendimento</button>{result && <span className="text-xs text-slate-500 dark:text-slate-400">Atualizado automaticamente{calculatedAt ? ` • confirmado às ${new Date(calculatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>}</div>
      {(automaticUnavailable || manualUnavailable || !result) && <div className="mt-4 flex items-start gap-3 rounded-md border border-amber-300/50 bg-amber-500/10 p-4 text-sm text-amber-900 dark:border-amber-300/20 dark:text-amber-100"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Não foi possível calcular.</strong><p className="mt-1">{automaticUnavailable ? "A taxa automática está indisponível. Atualize as taxas ou informe uma referência manual." : manualUnavailable ? "Informe a taxa anual de referência para usar o modo manual." : "Confira o valor inicial, as datas e as taxas informadas."}</p></div></div>}
    </section>

    {result && <><ResultSummary result={result} form={form} officialRate={officialRate} /><EvolutionChart data={chartData} view={view} setView={setView} /><EvolutionTable result={result} view={view} /><ProductComparison comparisons={comparisons} /><section className={panelClass}><h3 className="flex items-center gap-2 font-black"><Info className="h-5 w-5 text-cyan-500" />Premissas e limitações</h3><ul className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-[#cbd5e1]">{result.warnings.map((warning) => <li key={warning} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />{warning}</li>)}</ul><p className="mt-4 rounded-md bg-slate-100 p-3 text-xs text-slate-600 dark:bg-[#020817] dark:text-slate-300">Esta simulação é educativa, utiliza premissas informadas e taxas de referência identificadas. Não constitui recomendação de investimento, promessa de rentabilidade ou garantia do valor de resgate.</p></section></>}
  </div>;
}
function RateSourceInfo({ indexer, mode, rate, manualValue, onUseManual }: { indexer: FixedIncomeIndexer; mode: "automatic" | "manual"; rate: ReferenceRate | null; manualValue: string; onUseManual: () => void }) {
  if (indexer === "PREFIXED") return <div className="mt-3 flex items-start gap-3 rounded-md bg-cyan-500/10 p-3 text-sm text-cyan-900 dark:text-cyan-100"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Taxa prefixada informada pelo usuário.</strong> A plataforma não apresenta esse valor como cotação oficial.</span></div>;
  if (mode === "manual") return <div className="mt-3 flex items-start gap-3 rounded-md bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Referência manual:</strong> {manualValue || "não informada"}% a.a. • Fonte: usuário • Data: esta simulação.</span></div>;
  if (!rate || rate.annualPercent === undefined) return <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300/50 bg-amber-500/10 p-3 text-sm text-amber-900 dark:border-amber-300/20 dark:text-amber-100"><span><strong>Taxa automática indisponível.</strong> A simulação não usa valor fictício.</span><button type="button" onClick={onUseManual} className="min-h-9 rounded-md bg-amber-600 px-3 font-bold text-white">Usar taxa manual</button></div>;
  return <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-100"><span><strong>{indexer} automático:</strong> {pct.format(rate.annualPercent)}% a.a. • {rate.source} • Data-base: {formatDate(rate.referenceDate)} • Consulta: {formatDate(rate.consultedAt)}</span><a href={rate.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline">Ver fonte <ExternalLink className="h-3.5 w-3.5" /></a></div>;
}

function ResultSummary({ result, form, officialRate }: { result: FixedIncomeCalculationResult; form: CalculatorForm; officialRate: ReferenceRate | null }) {
  const durationMonths = Math.max(1, Math.round(result.days / 30.4375));
  const metrics = [
    ["Total aplicado", result.investedInCents, "Soma do valor inicial e dos aportes"],
    ["Valor bruto no vencimento", result.grossValueInCents, "Antes de impostos e taxas"],
    ["Rendimento bruto", result.grossIncomeInCents, "Juros acumulados na curva"],
    ["Imposto de Renda", -result.incomeTaxInCents, `Alíquota efetiva de ${pct.format(result.incomeTaxRate)}%`],
    ["IOF", -result.iofInCents, `Alíquota efetiva de ${pct.format(result.iofRate)}%`],
    ["Taxa de custódia", -result.custodyFeeInCents, "Custo proporcional ao prazo de cada lote"],
    ["Taxas fixas", -result.fixedFeesInCents, "Custos fixos informados"],
    ["Rendimento líquido", result.netIncomeInCents, "Resultado após impostos e custos"]
  ] as const;
  return <section className="space-y-4">
    <div className="rounded-lg border border-cyan-300 bg-cyan-50 p-5 text-slate-950 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-[#f8fafc]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase text-cyan-700 dark:text-cyan-300">Resultado principal</p><h3 className="mt-1 text-lg font-black">Valor líquido estimado a receber</h3><strong className="mt-2 block break-words text-3xl font-black text-cyan-800 dark:text-cyan-200 sm:text-4xl">{money(result.netValueInCents)}</strong><p className="mt-2 text-sm text-slate-600 dark:text-[#cbd5e1]">{form.product} • {indexerLabel(form.indexer)} • {result.days} dias corridos • aproximadamente {durationMonths} meses</p></div>
        <div className="grid min-w-[220px] gap-2 text-sm"><ResultLine label="Taxa anual usada" value={`${pct.format(result.annualRateUsed)}% a.a.`} /><ResultLine label="Equivalente mensal" value={`${pct.format(result.effectiveMonthlyPercent)}% a.m.`} /><ResultLine label="Base" value={`${result.dayCountBasis} ${result.dayCountBasis === 252 ? "dias úteis" : "dias"}`} /></div>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, note]) => <div key={label} className={panelClass}><small className="text-slate-500 dark:text-[#cbd5e1]">{label}</small><strong className={`mt-1 block break-words text-lg ${Number(value) < 0 ? "text-red-700 dark:text-red-300" : ""}`}>{money(Number(value))}</strong><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{note}</span></div>)}</div>
    <div className={panelClass}><h3 className="font-black">Detalhes do cálculo</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Detail label="Rentabilidade bruta" value={`${pct.format(result.grossReturnPercent)}%`} />
      <Detail label="Rentabilidade líquida" value={`${pct.format(result.netReturnPercent)}%`} />
      <Detail label="Retorno real anual" value={result.realReturnPercent === null ? "Indisponível" : `${pct.format(result.realReturnPercent)}%`} />
      <Detail label="Aportes computados" value={String(result.contributionCount)} />
      <Detail label="Taxa de referência" value={result.referenceAnnualPercent === null ? "Não aplicável" : `${pct.format(result.referenceAnnualPercent)}% a.a.`} />
      <Detail label="Origem" value={result.rateMode === "manual" ? "Informada pelo usuário" : officialRate?.source ?? "Taxa do produto"} />
      <Detail label="Data-base" value={result.rateMode === "manual" ? "Esta simulação" : formatDate(officialRate?.referenceDate)} />
      <Detail label="Capitalização" value={`${result.calculationDays} dias de cálculo`} />
    </div></div>
  </section>;
}

function EvolutionChart({ data, view, setView }: { data: Array<Record<string, string | number>>; view: "monthly" | "annual"; setView: (view: "monthly" | "annual") => void }) {
  return <section className={panelClass}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-black"><LineChartIcon className="h-5 w-5 text-cyan-500" />Evolução estimada</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Saldo investido, bruto e líquido ao longo do período.</p></div><div className="grid grid-cols-2 rounded-md bg-slate-100 p-1 dark:bg-[#020817]">{(["monthly", "annual"] as const).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={`min-h-9 rounded-md px-3 text-xs font-bold ${view === item ? "bg-white text-cyan-700 shadow-sm dark:bg-[#0f172a] dark:text-cyan-300" : "text-slate-600 dark:text-slate-300"}`}>{item === "monthly" ? "Mensal" : "Anual"}</button>)}</div></div>
    <div className="mt-4 h-80 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="fixedIncomeNet" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" opacity={0.18} /><XAxis dataKey="date" minTickGap={32} tick={{ fontSize: 11 }} /><YAxis width={76} tickFormatter={(value) => compactBrl.format(Number(value))} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => brl.format(Number(value))} /><Legend /><Area type="monotone" dataKey="investido" name="Total aplicado" stroke="#64748b" fill="transparent" strokeWidth={2} /><Area type="monotone" dataKey="bruto" name="Valor bruto" stroke="#22c55e" fill="transparent" strokeWidth={2} /><Area type="monotone" dataKey="liquido" name="Valor líquido" stroke="#06b6d4" fill="url(#fixedIncomeNet)" strokeWidth={3} /></AreaChart></ResponsiveContainer></div>
  </section>;
}
function EvolutionTable({ result, view }: { result: FixedIncomeCalculationResult; view: "monthly" | "annual" }) {
  const rows = view === "annual" ? result.evolution.filter((point, index, items) => index === 0 || index === items.length - 1 || index % 12 === 0) : result.evolution;
  return <section className={panelClass}>
    <div className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-5 w-5 text-cyan-500" /><div><h3 className="font-black">Memória de cálculo</h3><p className="text-xs text-slate-500 dark:text-slate-400">Tributos estimados para um resgate em cada data. A tabela final usa tributação por lote.</p></div></div>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="text-left text-slate-500 dark:text-[#cbd5e1]"><th className="p-2">Data</th><th className="p-2">Aplicado</th><th className="p-2">Rendimento bruto</th><th className="p-2">IR</th><th className="p-2">IOF</th><th className="p-2">Custódia</th><th className="p-2">Bruto</th><th className="p-2">Líquido</th></tr></thead><tbody>{rows.map((point) => <tr key={point.date} className="border-t border-slate-100 dark:border-white/10"><td className="p-2 font-semibold">{formatDate(point.date)}</td><td className="p-2">{money(point.investedInCents)}</td><td className="p-2">{money(point.grossIncomeInCents)}</td><td className="p-2">{money(point.incomeTaxInCents)}</td><td className="p-2">{money(point.iofInCents)}</td><td className="p-2">{money(point.custodyFeeInCents)}</td><td className="p-2">{money(point.grossBalanceInCents)}</td><td className="p-2 font-bold text-cyan-700 dark:text-cyan-300">{money(point.netBalanceInCents)}</td></tr>)}</tbody></table></div>
  </section>;
}

function ProductComparison({ comparisons }: { comparisons: Comparison[] }) {
  return <section className={panelClass}>
    <div className="flex items-start gap-2"><WalletCards className="mt-0.5 h-5 w-5 text-cyan-500" /><div><h3 className="font-black">Comparação de cenários</h3><p className="text-xs text-slate-500 dark:text-slate-400">Mesmos valores e prazo. As taxas são cenários identificados, não ofertas disponíveis.</p></div></div>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="text-left text-slate-500 dark:text-[#cbd5e1]"><th className="p-2">Produto/cenário</th><th className="p-2">Taxa usada</th><th className="p-2">Valor líquido</th><th className="p-2">Rendimento líquido</th><th className="p-2">Liquidez</th><th className="p-2">Proteção</th><th className="p-2">Risco</th></tr></thead><tbody>{comparisons.map((item) => <tr key={item.name} className="border-t border-slate-100 dark:border-white/10"><td className="p-2"><strong>{item.name}</strong><small className="block max-w-xs text-slate-500 dark:text-slate-400">{item.note}</small></td><td className="p-2">{item.result ? `${pct.format(item.result.annualRateUsed)}% a.a.` : "Indisponível"}</td><td className="p-2 font-bold">{item.result ? money(item.result.netValueInCents) : "Dados insuficientes"}</td><td className="p-2">{item.result ? `${pct.format(item.result.netReturnPercent)}%` : "—"}</td><td className="p-2">{item.liquidity}</td><td className="p-2">{item.protection}</td><td className="p-2">{item.risk}</td></tr>)}</tbody></table></div>
    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Maior valor líquido nesta simulação não significa melhor investimento. Compare risco de crédito, liquidez, vencimento, cobertura e condições reais do emissor.</p>
  </section>;
}

function buildComparisons(input: FixedIncomeCalculationInput, selected: FixedIncomeCalculationResult | null, rates: FixedIncomeReferenceRates | null): Comparison[] {
  const common = {
    principalInCents: input.principalInCents, monthlyContributionInCents: input.monthlyContributionInCents,
    startDate: input.startDate, endDate: input.endDate, iofApplicable: input.iofApplicable,
    custodyFeeAnnual: 0, brokerageFeeInCents: 0, dayCountBasis: input.dayCountBasis,
    contributionTiming: input.contributionTiming, rateMode: "automatic" as const, rateMethod: "percentage" as const,
    cdiAnnual: rates?.cdi.annualPercent, selicAnnual: rates?.selic.annualPercent, inflationAnnual: rates?.ipca.annualPercent
  };
  const calculate = (overrides: Partial<FixedIncomeCalculationInput>) => calculateFixedIncome({ ...common, indexer: "CDI", ...overrides });
  const selic = rates?.selic.annualPercent;
  const savingsAnnual = selic === undefined ? undefined : selic <= 8.5 ? selic * 0.7 : 6.17;
  return [
    { name: "Cenário selecionado", result: selected, liquidity: "Conforme produto", protection: "Conforme produto", risk: "Conforme emissor", note: "Usa exatamente as premissas informadas acima." },
    { name: "CDB 100% CDI", result: calculate({ indexer: "CDI", indexerPercentage: 100, taxExempt: false }), liquidity: "Varia por emissão", protection: "FGC, se elegível", risk: "Crédito do emissor", note: "Cenário com CDI oficial disponível." },
    { name: "CDB 110% CDI", result: calculate({ indexer: "CDI", indexerPercentage: 110, taxExempt: false }), liquidity: "Geralmente no vencimento", protection: "FGC, se elegível", risk: "Crédito do emissor", note: "Taxa ilustrativa, não representa oferta." },
    { name: "LCI/LCA 90% CDI", result: calculate({ indexer: "CDI", indexerPercentage: 90, taxExempt: true }), liquidity: "Carência/vencimento", protection: "FGC, se elegível", risk: "Crédito do emissor", note: "Isenção simulada para pessoa física elegível." },
    { name: "Tesouro Selic", result: calculate({ indexer: "SELIC", indexerPercentage: 100, taxExempt: false, custodyFeeAnnual: 0.2 }), liquidity: "Liquidez diária, sujeita a mercado", protection: "Tesouro Nacional", risk: "Soberano e marcação", note: "Inclui custódia anual ilustrativa de 0,20%." },
    { name: "Tesouro Prefixado", result: calculate({ indexer: "PREFIXED", fixedRateAnnual: input.fixedRateAnnual || 12, taxExempt: false }), liquidity: "Vencimento ou mercado", protection: "Tesouro Nacional", risk: "Marcação a mercado", note: "Taxa informada ou cenário de 12% a.a." },
    { name: "Tesouro IPCA+", result: calculate({ indexer: "IPCA", fixedRateAnnual: input.fixedRateAnnual || 6, taxExempt: false, custodyFeeAnnual: 0.2 }), liquidity: "Vencimento ou mercado", protection: "Tesouro Nacional", risk: "Marcação a mercado", note: "IPCA oficial disponível + taxa real informada ou 6%." },
    { name: "Poupança", result: savingsAnnual === undefined ? null : calculate({ indexer: "PREFIXED", fixedRateAnnual: savingsAnnual, taxExempt: true, iofApplicable: false }), liquidity: "Diária, com aniversário", protection: "FGC, conforme regras", risk: "Baixo, conforme instituição", note: "Cenário aproximado sem TR; confirme a regra vigente." }
  ];
}

function rateForIndexer(indexer: FixedIncomeIndexer, rates: FixedIncomeReferenceRates | null): ReferenceRate | null {
  if (!rates) return null;
  if (indexer === "CDI") return rates.cdi;
  if (indexer === "SELIC") return rates.selic;
  if (indexer === "IPCA") return rates.ipca;
  return null;
}

function indexerLabel(value: string) {
  return ({ IPCA: "IPCA+", PREFIXED: "Prefixado", OTHER: "Outro indexador", IGPM: "IGP-M" } as Record<string, string>)[value] ?? value;
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-md bg-white/70 px-3 py-2 dark:bg-[#020817]/80"><span className="text-slate-600 dark:text-[#cbd5e1]">{label}</span><strong className="text-right">{value}</strong></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-md border border-slate-200 p-3 dark:border-white/10"><small className="text-slate-500 dark:text-[#cbd5e1]">{label}</small><strong className="mt-1 block break-words">{value}</strong></div>;
}

function Field({ label, value, onChange, type = "text", step, placeholder, inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; step?: string; placeholder?: string; inputMode?: "decimal" | "numeric" }) {
  return <label className="min-w-0 text-xs font-bold text-slate-600 dark:text-[#cbd5e1]">{label}<input type={type} step={step} placeholder={placeholder} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="min-w-0 text-xs font-bold text-slate-600 dark:text-[#cbd5e1]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-[#020817] dark:text-[#f8fafc]"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-cyan-600" />{label}</label>;
}