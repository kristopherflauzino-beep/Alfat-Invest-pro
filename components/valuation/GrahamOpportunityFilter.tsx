"use client";

export function GrahamOpportunityFilter({
  onlyBelow,
  setOnlyBelow,
  minMargin,
  setMinMargin,
  onlyPositiveLpa,
  setOnlyPositiveLpa,
  onlyPositiveVpa,
  setOnlyPositiveVpa
}: {
  onlyBelow: boolean;
  setOnlyBelow: (value: boolean) => void;
  minMargin: number;
  setMinMargin: (value: number) => void;
  onlyPositiveLpa: boolean;
  setOnlyPositiveLpa: (value: boolean) => void;
  onlyPositiveVpa: boolean;
  setOnlyPositiveVpa: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-3 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={onlyBelow} onChange={(event) => setOnlyBelow(event.target.checked)} />Preço abaixo do valor de Graham</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={onlyPositiveLpa} onChange={(event) => setOnlyPositiveLpa(event.target.checked)} />LPA positivo</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={onlyPositiveVpa} onChange={(event) => setOnlyPositiveVpa(event.target.checked)} />VPA positivo</label>
      <label className="block">
        <span className="mb-1 block font-bold text-slate-500 dark:text-slate-400">Margem mínima (%)</span>
        <input type="number" step="1" value={minMargin} onChange={(event) => setMinMargin(Number(event.target.value))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 outline-none dark:border-white/10 dark:bg-white/5" />
      </label>
    </div>
  );
}
