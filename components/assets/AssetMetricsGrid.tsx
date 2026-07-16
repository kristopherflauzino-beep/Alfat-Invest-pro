import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/lib/types";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const cryptoBrl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 8
});
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatAssetPrice(price: number, assetType: Asset["type"]) {
  return (assetType === "CRIPTO" && Math.abs(price) < 0.01 ? cryptoBrl : brl).format(price);
}

export function formatDailyChange(change: number) {
  if (!Number.isFinite(change)) return "Dado indisponível";
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return sign + percent.format(Math.abs(change)) + "%";
}

export function AssetMetricsGrid({
  price,
  changeDay,
  score,
  assetType,
  dark = false
}: {
  price: number;
  changeDay: number;
  score: number;
  assetType: Asset["type"];
  dark?: boolean;
}) {
  const ChangeIcon = changeDay > 0 ? TrendingUp : changeDay < 0 ? TrendingDown : Minus;
  const changeTone = changeDay > 0
    ? "text-emerald-600 dark:text-emerald-300"
    : changeDay < 0
      ? "text-red-600 dark:text-red-300"
      : "text-slate-600 dark:text-slate-300";
  const tile = dark ? "bg-white/10 text-white" : "bg-white dark:bg-slate-950";

  return (
    <div className="asset-metrics-grid mt-4">
      <div className={"asset-metric-tile " + tile} title={formatAssetPrice(price, assetType)}>
        <span>Preço atual</span>
        <strong>{formatAssetPrice(price, assetType)}</strong>
      </div>
      <div className={"asset-metric-tile " + tile} title={formatDailyChange(changeDay)}>
        <span>Variação no dia</span>
        <strong className={"inline-flex items-center gap-1.5 " + changeTone}><ChangeIcon className="h-4 w-4 shrink-0" />{formatDailyChange(changeDay)}</strong>
      </div>
      <div className={"asset-metric-tile " + tile} title={score + "/100"}>
        <span>Score</span>
        <strong>{score}/100</strong>
      </div>
    </div>
  );
}
