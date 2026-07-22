"use client";

import { AlertTriangle, Building2, Calculator, CalendarDays, Download, Landmark, Pencil, Plus, RefreshCw, Save, ShieldCheck, Trash2, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { calculateInvestmentPosition, daysUntil, parseBrazilianCurrencyToCents } from "@/lib/fixed-income/calculator";
import { fixedIncomeIndexers, fixedIncomeTypes, type FixedIncomeInvestment, type FixedIncomeReferenceRates } from "@/lib/fixed-income/types";
import { FixedIncomeCalculator } from "@/components/fixed-income/FixedIncomeCalculator";

type Tab = "overview" | "investments" | "calculator";
const tabs: Array<{ id: Tab; label: string }> = [{ id: "overview", label: "Visão geral" }, { id: "investments", label: "Meus investimentos" }, { id: "calculator", label: "Calculadora" }];
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const pct = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const card = "rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f172a]";
const inputClass = "mt-1 h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-[#020817] dark:text-slate-50";
const today = () => new Date().toISOString().slice(0, 10);
const future = (days: number) => { const value = new Date(); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); };
const centsFromInput = (value: string) => parseBrazilianCurrencyToCents(value) ?? 0;
const moneyFromCents = (value: number) => brl.format(value / 100);
const fieldNumber = (value: string) => { const parsed = Number(value.replace(",", ".")); return Number.isFinite(parsed) ? parsed : 0; };

const emptyForm = {
  type: "CDB", name: "", broker: "", institution: "", issuerName: "", maskedAccount: "", principal: "",
  applicationDate: today(), maturityDate: future(365), liquidityType: "at_maturity", gracePeriodDays: "0",
  indexer: "CDI", indexerPercentage: "100", fixedRateAnnual: "0", spreadAnnual: "0",
  incomeTaxType: "regressive", taxExempt: false, iofApplicable: true, fgcCovered: true,
  interestFrequency: "at_maturity", marking: "curve", marketValue: "", status: "active", notes: ""
};

function payloadFromForm(form: typeof emptyForm) {
  return {
    type: form.type, name: form.name, broker: form.broker || undefined, institution: form.institution || undefined,
    issuerName: form.issuerName || undefined, maskedAccount: form.maskedAccount || undefined,
    principalInCents: centsFromInput(form.principal), applicationDate: form.applicationDate,
    maturityDate: form.maturityDate || undefined, liquidityType: form.liquidityType,
    gracePeriodDays: fieldNumber(form.gracePeriodDays), indexer: form.indexer,
    indexerPercentage: fieldNumber(form.indexerPercentage), fixedRateAnnual: fieldNumber(form.fixedRateAnnual),
    spreadAnnual: fieldNumber(form.spreadAnnual), incomeTaxType: form.incomeTaxType,
    taxExempt: form.taxExempt, iofApplicable: form.iofApplicable, fgcCovered: form.fgcCovered,
    fgcLimitInCents: form.fgcCovered ? 25_000_000 : undefined, interestFrequency: form.interestFrequency,
    marking: form.marking, marketValueInCents: form.marking === "market" ? centsFromInput(form.marketValue) : undefined,
    status: form.status, notes: form.notes || undefined
  };
}

function formFromInvestment(item: FixedIncomeInvestment): typeof emptyForm {
  return {
    type: item.type, name: item.name, broker: item.broker ?? "", institution: item.institution ?? "",
    issuerName: item.issuerName ?? "", maskedAccount: item.maskedAccount ?? "",
    principal: (item.principalInCents / 100).toFixed(2).replace(".", ","), applicationDate: item.applicationDate,
    maturityDate: item.maturityDate ?? "", liquidityType: item.liquidityType, gracePeriodDays: String(item.gracePeriodDays ?? 0),
    indexer: item.indexer, indexerPercentage: String(item.indexerPercentage ?? 100),
    fixedRateAnnual: String(item.fixedRateAnnual ?? 0), spreadAnnual: String(item.spreadAnnual ?? 0),
    incomeTaxType: item.incomeTaxType, taxExempt: item.taxExempt, iofApplicable: item.iofApplicable,
    fgcCovered: item.fgcCovered, interestFrequency: item.interestFrequency, marking: item.marking,
    marketValue: item.marketValueInCents ? (item.marketValueInCents / 100).toFixed(2).replace(".", ",") : "",
    status: item.status, notes: item.notes ?? ""
  };
}

export function FixedIncomeCenter() {
  const [tab, setTab] = useState<Tab>("overview");
  const [investments, setInvestments] = useState<FixedIncomeInvestment[]>([]);
  const [rates, setRates] = useState<FixedIncomeReferenceRates | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(refresh = false) {
    setLoading(true); setError("");
    try {
      const [itemsResponse, ratesResponse] = await Promise.all([
        fetch("/api/fixed-income", { cache: "no-store" }),
        fetch(`/api/fixed-income/reference-rates${refresh ? "?refresh=1" : ""}`, { cache: "no-store" })
      ]);
      const itemsBody = await itemsResponse.json(); const ratesBody = await ratesResponse.json();
      if (!itemsResponse.ok) throw new Error(itemsBody.error);
      if (!ratesResponse.ok) throw new Error(ratesBody.error);
      setInvestments(itemsBody.investments); setRates(ratesBody.rates);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar a renda fixa."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  const positions = useMemo(() => investments.map((investment) => ({ investment, result: rates ? calculateInvestmentPosition(investment, rates) : null })), [investments, rates]);

  const summary = useMemo(() => {
    const active = positions.filter((item) => item.investment.status === "active");
    const invested = active.reduce((sum, item) => sum + item.investment.principalInCents, 0);
    const gross = active.reduce((sum, item) => sum + (item.result?.grossValueInCents ?? item.investment.principalInCents), 0);
    const net = active.reduce((sum, item) => sum + (item.result?.displayValueInCents ?? item.investment.principalInCents), 0);
    const fgc = active.filter((item) => item.investment.fgcCovered).reduce((sum, item) => sum + Math.min(item.result?.displayValueInCents ?? item.investment.principalInCents, item.investment.fgcLimitInCents ?? 25_000_000), 0);
    return { invested, gross, net, fgc, outsideFgc: Math.max(0, net - fgc) };
  }, [positions]);

  function setField<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveInvestment(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/fixed-income", {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, data: payloadFromForm(form) } : payloadFromForm(form))
      });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      setInvestments((current) => editingId ? current.map((item) => item.id === editingId ? body.investment : item) : [body.investment, ...current]);
      setForm(emptyForm); setEditingId(null); setMessage(editingId ? "Investimento atualizado." : "Investimento adicionado à carteira.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  async function removeInvestment(id: string) {
    if (!window.confirm("Remover este investimento da carteira?")) return;
    const response = await fetch(`/api/fixed-income?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const body = await response.json(); if (!response.ok) { setError(body.error); return; }
    setInvestments((current) => current.filter((item) => item.id !== id)); setMessage("Investimento removido.");
  }

  function editInvestment(item: FixedIncomeInvestment) {
    setEditingId(item.id); setForm(formFromInvestment(item)); setTab("investments");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exportCsv() {
    const rows = [["Produto", "Tipo", "Instituição", "Corretora", "Aplicado", "Valor líquido", "Indexador", "Vencimento", "FGC"]];
    positions.forEach(({ investment, result }) => rows.push([investment.name, investment.type, investment.institution ?? "", investment.broker ?? "", (investment.principalInCents / 100).toFixed(2), ((result?.displayValueInCents ?? investment.principalInCents) / 100).toFixed(2), investment.indexer, investment.maturityDate ?? "", investment.fgcCovered ? "Sim" : "Não"]));
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "renda-fixa-alfatec.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <div className={card}><RefreshCw className="inline h-5 w-5 animate-spin text-cyan-500" /> Carregando investimentos e taxas oficiais...</div>;

  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-300">Minha Carteira</p><h2 className="text-2xl font-black">Renda Fixa</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Cadastro, acompanhamento, tributação, vencimentos e simulações na curva.</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => void load(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-900 px-4 font-bold text-white dark:bg-white dark:text-slate-950"><RefreshCw className="h-4 w-4" />Atualizar taxas</button><button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-600 px-4 font-bold text-white"><Download className="h-4 w-4" />CSV</button></div>
    </header>
    <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3 dark:border-white/10">{tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`min-h-10 shrink-0 rounded-md px-3 text-sm font-bold ${tab === item.id ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-200"}`}>{item.label}</button>)}</div>
    {message && <p className="rounded-md bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{message}</p>}
    {error && <p className="rounded-md bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p>}
    <ReferenceRates rates={rates} />
    {tab === "overview" && <Overview summary={summary} positions={positions} />}
    {tab === "investments" && <div className="grid min-w-0 gap-5 xl:grid-cols-[0.72fr_1.28fr]"><InvestmentForm form={form} setField={setField} onSubmit={saveInvestment} saving={saving} editing={Boolean(editingId)} onCancel={() => { setEditingId(null); setForm(emptyForm); }} /><InvestmentTable positions={positions} onEdit={editInvestment} onDelete={(id) => void removeInvestment(id)} /></div>}
    {tab === "calculator" && <FixedIncomeCalculator rates={rates} />}
    <div className="rounded-md bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"><strong>Aviso:</strong> projeções usam premissas identificadas, não representam garantia de rentabilidade e não substituem regras do emissor. Marcação na curva e valor de mercado são exibidos separadamente.</div>
  </section>;
}

function ReferenceRates({ rates }: { rates: FixedIncomeReferenceRates | null }) {
  const items = rates ? [["CDI", rates.cdi], ["Selic", rates.selic], ["IPCA 12 meses", rates.ipca]] as const : [];
  return <div className="grid gap-3 sm:grid-cols-3">{items.map(([label, rate]) => <a key={label} href={rate.sourceUrl} target="_blank" rel="noopener noreferrer" className={card}><small className="text-slate-500 dark:text-slate-300">{label}</small><strong className="mt-1 block text-xl">{rate.annualPercent === undefined ? "Indisponível" : `${pct.format(rate.annualPercent)}% a.a.`}</strong><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{rate.source} • {rate.referenceDate ? new Date(rate.referenceDate + "T12:00:00").toLocaleDateString("pt-BR") : "sem data"}</span></a>)}</div>;
}

function Overview({ summary, positions }: { summary: { invested: number; gross: number; net: number; fgc: number; outsideFgc: number }; positions: Array<{ investment: FixedIncomeInvestment; result: ReturnType<typeof calculateInvestmentPosition> }> }) {
  const next = positions.filter((item) => item.investment.maturityDate && item.investment.status === "active").sort((a, b) => (a.investment.maturityDate ?? "").localeCompare(b.investment.maturityDate ?? ""))[0];
  const tiles = [["Total investido", summary.invested, WalletCards], ["Valor bruto na curva", summary.gross, Landmark], ["Valor líquido estimado", summary.net, Calculator], ["Rendimento líquido", summary.net - summary.invested, RefreshCw], ["Cobertura FGC estimada", summary.fgc, ShieldCheck], ["Fora do FGC estimado", summary.outsideFgc, AlertTriangle]] as const;
  const groups = new Map<string, number>();
  positions.filter((item) => item.investment.status === "active").forEach(({ investment, result }) => { const key = investment.institution || investment.issuerName || "Não informada"; groups.set(key, (groups.get(key) ?? 0) + (result?.displayValueInCents ?? investment.principalInCents)); });
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{tiles.map(([label, value, Icon]) => <div key={label} className={card}><Icon className="h-5 w-5 text-cyan-500" /><small className="mt-2 block text-slate-500 dark:text-slate-300">{label}</small><strong className="mt-1 block text-xl">{moneyFromCents(value)}</strong></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}><CalendarDays className="h-5 w-5 text-cyan-500" /><h3 className="mt-2 font-black">Próximo vencimento</h3><p className="mt-2 text-sm">{next ? `${next.investment.name}: ${new Date(next.investment.maturityDate! + "T12:00:00").toLocaleDateString("pt-BR")} (${daysUntil(next.investment.maturityDate)} dias)` : "Nenhum vencimento futuro cadastrado."}</p><p className="mt-3 text-xs text-slate-500 dark:text-slate-300">Valor na curva não é garantia de resgate antecipado.</p></div>
      <div className={card}><Building2 className="h-5 w-5 text-cyan-500" /><h3 className="mt-2 font-black">Exposição por instituição</h3><div className="mt-3 space-y-2">{Array.from(groups.entries()).sort((a,b)=>b[1]-a[1]).map(([name, value]) => <div key={name} className="flex justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm dark:bg-white/5"><strong>{name}</strong><span>{moneyFromCents(value)}</span></div>)}{!groups.size && <p className="text-sm text-slate-500">Nenhuma instituição cadastrada.</p>}</div></div>
    </div>
    <div className={card}><h3 className="font-black">Vencimentos e liquidez</h3><div className="mt-3 space-y-2">{positions.filter((item) => item.investment.maturityDate).sort((a,b)=>(a.investment.maturityDate ?? "").localeCompare(b.investment.maturityDate ?? "")).slice(0,8).map(({ investment, result }) => <div key={investment.id} className="grid gap-2 rounded-md bg-slate-50 p-3 text-sm dark:bg-white/5 sm:grid-cols-[1fr_auto_auto]"><strong>{investment.name}</strong><span>{investment.maturityDate ? new Date(investment.maturityDate + "T12:00:00").toLocaleDateString("pt-BR") : ""} • {daysUntil(investment.maturityDate)} dias</span><span className="font-bold">{moneyFromCents(result?.displayValueInCents ?? investment.principalInCents)}</span></div>)}</div><p className="mt-3 text-xs text-slate-500 dark:text-slate-300">A cobertura FGC é uma estimativa. Confirme produto, conglomerado e limites vigentes.</p></div>
  </>;
}

function InvestmentForm({ form, setField, onSubmit, saving, editing, onCancel }: { form: typeof emptyForm; setField: <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => void; onSubmit: (event: React.FormEvent) => void; saving: boolean; editing: boolean; onCancel: () => void }) {
  return <form onSubmit={onSubmit} className={card + " h-fit"}>
    <div className="flex items-center justify-between"><div><h3 className="font-black">{editing ? "Editar renda fixa" : "Adicionar renda fixa"}</h3><p className="text-xs text-slate-500 dark:text-slate-300">Persistência no banco por usuário.</p></div>{editing && <button type="button" onClick={onCancel} aria-label="Cancelar edição"><X className="h-5 w-5" /></button>}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <SelectField label="Tipo" value={form.type} onChange={(value) => setField("type", value)} options={fixedIncomeTypes.map((value) => [value, typeLabel(value)])} />
      <TextField label="Nome do título" value={form.name} onChange={(value) => setField("name", value)} required />
      <TextField label="Instituição" value={form.institution} onChange={(value) => setField("institution", value)} />
      <TextField label="Corretora" value={form.broker} onChange={(value) => setField("broker", value)} />
      <TextField label="Emissor" value={form.issuerName} onChange={(value) => setField("issuerName", value)} />
      <TextField label="Conta mascarada" value={form.maskedAccount} onChange={(value) => setField("maskedAccount", value)} placeholder="•••• 1234" />
      <TextField label="Valor aplicado (R$)" value={form.principal} onChange={(value) => setField("principal", value)} inputMode="decimal" required />
      <TextField label="Data da aplicação" value={form.applicationDate} onChange={(value) => setField("applicationDate", value)} type="date" required />
      <TextField label="Vencimento" value={form.maturityDate} onChange={(value) => setField("maturityDate", value)} type="date" />
      <SelectField label="Liquidez" value={form.liquidityType} onChange={(value) => setField("liquidityType", value)} options={[["daily","Diária"],["at_maturity","No vencimento"],["after_grace_period","Após carência"],["custom","Personalizada"]]} />
      <SelectField label="Indexador" value={form.indexer} onChange={(value) => setField("indexer", value)} options={fixedIncomeIndexers.map((value) => [value, value])} />
      <TextField label="% do indexador" value={form.indexerPercentage} onChange={(value) => setField("indexerPercentage", value)} type="number" step="0.01" />
      <TextField label="Taxa fixa (% a.a.)" value={form.fixedRateAnnual} onChange={(value) => setField("fixedRateAnnual", value)} type="number" step="0.01" />
      <TextField label="Spread (% a.a.)" value={form.spreadAnnual} onChange={(value) => setField("spreadAnnual", value)} type="number" step="0.01" />
      <SelectField label="Marcação" value={form.marking} onChange={(value) => setField("marking", value)} options={[["curve","Na curva"],["market","A mercado"]]} />
      {form.marking === "market" && <TextField label="Valor de mercado (R$)" value={form.marketValue} onChange={(value) => setField("marketValue", value)} inputMode="decimal" required />}
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-3"><CheckField label="Isento de IR" checked={form.taxExempt} onChange={(value) => setField("taxExempt", value)} /><CheckField label="IOF aplicável" checked={form.iofApplicable} onChange={(value) => setField("iofApplicable", value)} /><CheckField label="Cobertura FGC" checked={form.fgcCovered} onChange={(value) => setField("fgcCovered", value)} /></div>
    <label className="mt-3 block text-xs font-bold text-slate-600 dark:text-slate-300">Observação<textarea value={form.notes} onChange={(event) => setField("notes", event.target.value)} className={inputClass + " min-h-20 py-2"} maxLength={500} /></label>
    <button disabled={saving} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 font-black text-white disabled:opacity-60">{editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{saving ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar investimento"}</button>
  </form>;
}

function InvestmentTable({ positions, onEdit, onDelete }: { positions: Array<{ investment: FixedIncomeInvestment; result: ReturnType<typeof calculateInvestmentPosition> }>; onEdit: (item: FixedIncomeInvestment) => void; onDelete: (id: string) => void }) {
  return <div className={card + " min-w-0 overflow-hidden"}><h3 className="font-black">Posições de renda fixa</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[920px] text-sm"><thead><tr className="text-left text-slate-500 dark:text-slate-300"><th className="p-2">Produto</th><th className="p-2">Instituição</th><th className="p-2">Aplicado</th><th className="p-2">Líquido estimado</th><th className="p-2">Rentabilidade</th><th className="p-2">Indexador</th><th className="p-2">Vencimento</th><th className="p-2">Base</th><th className="p-2">Ações</th></tr></thead><tbody>{positions.map(({ investment, result }) => <tr key={investment.id} className="border-t border-slate-100 dark:border-white/10"><td className="p-2"><strong>{investment.name}</strong><small className="block text-slate-500">{typeLabel(investment.type)}</small></td><td className="p-2">{investment.institution || "Não informada"}<small className="block text-slate-500">{investment.broker || "Sem corretora"}</small></td><td className="p-2">{moneyFromCents(investment.principalInCents)}</td><td className="p-2 font-bold">{moneyFromCents(result?.displayValueInCents ?? investment.principalInCents)}</td><td className="p-2">{result ? `${pct.format(result.netReturnPercent)}%` : "Dados insuficientes"}</td><td className="p-2">{investment.indexer}{investment.indexerPercentage ? ` ${pct.format(investment.indexerPercentage)}%` : ""}</td><td className="p-2">{investment.maturityDate ? new Date(investment.maturityDate + "T12:00:00").toLocaleDateString("pt-BR") : "Sem vencimento"}</td><td className="p-2">{result?.valueBasis === "mercado" ? "Mercado" : "Curva"}</td><td className="p-2"><div className="flex gap-1"><button type="button" onClick={() => onEdit(investment)} className="rounded-md bg-cyan-500/10 p-2 text-cyan-700 dark:text-cyan-300" aria-label={`Editar ${investment.name}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => onDelete(investment.id)} className="rounded-md bg-red-500/10 p-2 text-red-700 dark:text-red-300" aria-label={`Excluir ${investment.name}`}><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>{!positions.length && <p className="p-4 text-sm text-slate-500">Nenhum investimento cadastrado.</p>}</div></div>;
}

function TextField({ label, value, onChange, type = "text", step, required, placeholder, inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; step?: string; required?: boolean; placeholder?: string; inputMode?: "decimal" | "numeric" }) { return <label className="min-w-0 text-xs font-bold text-slate-600 dark:text-slate-300">{label}<input type={type} step={step} required={required} placeholder={placeholder} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className="min-w-0 text-xs font-bold text-slate-600 dark:text-slate-300">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>; }
function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-10 items-center gap-2 rounded-md bg-slate-50 px-3 text-sm font-semibold dark:bg-white/5"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-slate-200 p-3 dark:border-white/10"><small className="text-slate-500 dark:text-slate-300">{label}</small><strong className="mt-1 block">{value}</strong></div>; }
function typeLabel(value: string) { return ({ TESOURO_SELIC: "Tesouro Selic", TESOURO_PREFIXADO: "Tesouro Prefixado", TESOURO_IPCA: "Tesouro IPCA+", DEBENTURE: "Debênture", DEBENTURE_INCENTIVADA: "Debênture incentivada", POUPANCA: "Poupança", FUNDO_DI: "Fundo DI", OUTRO: "Outro" } as Record<string, string>)[value] ?? value; }
