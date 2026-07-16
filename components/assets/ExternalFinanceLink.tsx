import { ExternalLink } from "lucide-react";
import { getYahooFinanceUrl } from "@/lib/assets/external-finance-url";
import type { AssetType } from "@/lib/types";

export function ExternalFinanceLink({
  ticker,
  assetType,
  className = ""
}: {
  ticker: string;
  assetType: AssetType;
  className?: string;
}) {
  return (
    <a
      href={getYahooFinanceUrl(ticker, assetType)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={"Abrir " + ticker + " no Yahoo Finance"}
      className={"inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-400/20 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10 " + className}
    >
      <ExternalLink className="h-4 w-4" />
      Abrir no Yahoo Finance
    </a>
  );
}
