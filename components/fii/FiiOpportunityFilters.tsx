import type { ReactElement } from "react";
import type { FiiConfidence, FiiKind } from "@/lib/analysis/alfatec-fii";

export type FiiOpportunityFilterState = {
  minScore: number;
  kind: FiiKind | "todos";
  segment: string;
  maxPvp: number;
  minDy: number;
  minRiskPremium: number;
  minLiquidity: number;
  maxVacancy: number;
  minimumConfidence: FiiConfidence | "Todas";
  sustainableOnly: boolean;
};

const confidenceOptions: Array<FiiConfidence | "Todas"> = ["Todas", "Alta", "Media", "Baixa", "Insuficiente"];
const kindOptions: Array<{ value: FiiKind | "todos"; label: string }> = [
  { value: "todos", label: "Todos os FIIs" },
  { value: "tijolo", label: "FII de tijolo" },
  { value: "papel", label: "FII de papel" },
  { value: "hibrido", label: "FII híbrido" },
  { value: "fof", label: "Fundo de fundos" },
  { value: "renda_urbana", label: "Renda urbana" },
  { value: "desenvolvimento", label: "Desenvolvimento" },
  { value: "infraestrutura", label: "Infraestrutura" },
  { value: "outro", label: "Outro" }
];

function labelConfidence(value: FiiConfidence | "Todas") {
  return value === "Media" ? "Média" : value;
}

export function FiiOpportunityFilters({ value, onChange, segments }: { value: FiiOpportunityFilterState; onChange: (patch: Partial<FiiOpportunityFilterState>) => void; segments: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
      <p className="mb-3 text-sm font-black">Filtros do Método AlfaTec FIIs</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Score mínimo"><input type="number" value={value.minScore} onChange={(e) => onChange({ minScore: Number(e.target.value) })} /></Field>
        <Field label="Tipo de FII"><select value={value.kind} onChange={(e) => onChange({ kind: e.target.value as FiiKind | "todos" })}>{kindOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="Segmento"><select value={value.segment} onChange={(e) => onChange({ segment: e.target.value })}><option value="">Todos</option>{segments.map((segment) => <option key={segment} value={segment}>{segment}</option>)}</select></Field>
        <Field label="P/VP máximo"><input type="number" step="0.01" value={value.maxPvp} onChange={(e) => onChange({ maxPvp: Number(e.target.value) })} /></Field>
        <Field label="DY recorrente mínimo (%)"><input type="number" step="0.1" value={value.minDy} onChange={(e) => onChange({ minDy: Number(e.target.value) })} /></Field>
        <Field label="Prêmio de risco mínimo (p.p.)"><input type="number" step="0.1" value={value.minRiskPremium} onChange={(e) => onChange({ minRiskPremium: Number(e.target.value) })} /></Field>
        <Field label="Liquidez mínima"><input type="number" value={value.minLiquidity} onChange={(e) => onChange({ minLiquidity: Number(e.target.value) })} /></Field>
        <Field label="Vacância máxima (%)"><input type="number" step="0.1" value={value.maxVacancy} onChange={(e) => onChange({ maxVacancy: Number(e.target.value) })} /></Field>
        <Field label="Confiança mínima"><select value={value.minimumConfidence} onChange={(e) => onChange({ minimumConfidence: e.target.value as FiiConfidence | "Todas" })}>{confidenceOptions.map((item) => <option key={item} value={item}>{labelConfidence(item)}</option>)}</select></Field>
        <label className="flex items-center gap-2 self-end rounded-2xl bg-white p-3 text-sm font-bold dark:bg-slate-950">
          <input type="checkbox" checked={value.sustainableOnly} onChange={(e) => onChange({ sustainableOnly: e.target.checked })} />
          Somente rendimento sustentável
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Graham, PEG e P/L não são usados como método principal para FIIs.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactElement }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      {children && (
        <span className="block [&_input]:h-11 [&_input]:w-full [&_input]:rounded-2xl [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-3 [&_input]:outline-none [&_input]:dark:border-white/10 [&_input]:dark:bg-slate-950 [&_select]:h-11 [&_select]:w-full [&_select]:rounded-2xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_select]:outline-none [&_select]:dark:border-white/10 [&_select]:dark:bg-slate-950">
          {children}
        </span>
      )}
    </label>
  );
}

