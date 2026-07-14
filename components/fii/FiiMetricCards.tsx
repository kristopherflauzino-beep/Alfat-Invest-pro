import type { ReactNode } from "react";

function MetricCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
      <h4 className="font-black">{title}</h4>
      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{children}</div>
    </div>
  );
}

export function FiiQualityCard({ children }: { children: ReactNode }) {
  return <MetricCard title="Qualidade">{children}</MetricCard>;
}

export function FiiIncomeCard({ children }: { children: ReactNode }) {
  return <MetricCard title="Renda">{children}</MetricCard>;
}

export function FiiRiskCard({ children }: { children: ReactNode }) {
  return <MetricCard title="Risco">{children}</MetricCard>;
}

export function FiiValuationCard({ children }: { children: ReactNode }) {
  return <MetricCard title="Valuation">{children}</MetricCard>;
}

export function FiiManagementCard({ children }: { children: ReactNode }) {
  return <MetricCard title="Gestão">{children}</MetricCard>;
}

export function FiiLiquidityCard({ children }: { children: ReactNode }) {
  return <MetricCard title="Liquidez">{children}</MetricCard>;
}

export function FiiDiversificationCard({ children }: { children: ReactNode }) {
  return <MetricCard title="Diversificação">{children}</MetricCard>;
}

