"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, Minus, Pencil, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { DecimalValueDisplay } from "@/components/portfolio/DecimalValueDisplay";
import { PortfolioPositionEditor } from "@/components/portfolio/PortfolioPositionEditor";
import { decimalToNumber, multiplyDecimalToNumber } from "@/lib/decimal/crypto-quantity";
import { typeLabels } from "@/lib/market-data";
import type { Asset, PortfolioLine } from "@/lib/types";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percent = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

type Props = {
  lines: PortfolioLine[];
  editingId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (line: PortfolioLine, quantity: string, averagePrice: string) => void;
  dividendPerShare: (asset: Asset) => number | undefined;
  dividendFrequency: (asset: Asset) => string;
};

function signedMoney(value: number) {
  if (value === 0) return money.format(0);
  return `${value > 0 ? "+" : "-"}${money.format(Math.abs(value))}`;
}

function signedPercent(value: number) {
  if (value === 0) return `${percent.format(0)}%`;
  return `${value > 0 ? "+" : "-"}${percent.format(Math.abs(value))}%`;
}

function resultTone(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-300";
  if (value < 0) return "text-red-600 dark:text-red-300";
  return "text-slate-500 dark:text-slate-300";
}

function ResultIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="h-4 w-4" aria-hidden="true" />;
  if (value < 0) return <TrendingDown className="h-4 w-4" aria-hidden="true" />;
  return <Minus className="h-4 w-4" aria-hidden="true" />;
}

function PortfolioDetailsModal({ line, dividend, frequency, onClose }: { line: PortfolioLine; dividend: number | undefined; frequency: string; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const estimatedCycle = dividend === undefined ? undefined : multiplyDecimalToNumber(line.quantity, dividend);
  const purchaseDate = line.purchaseDate
    ? new Date(`${line.purchaseDate}T12:00:00`).toLocaleDateString("pt-BR")
    : "Dado indisponível";
  const details = [
    ["Nome", line.asset.name],
    ["Quantidade", line.quantity],
    ["Preço médio", money.format(decimalToNumber(line.averagePrice))],
    ["Preço atual", money.format(line.asset.price)],
    ["Capital investido", money.format(line.invested)],
    ["Patrimônio atual", money.format(line.currentValue)],
    ["Lucro ou prejuízo", signedMoney(line.profit)],
    ["Rentabilidade", signedPercent(line.profitability)],
    ["Dividend Yield", typeof line.asset.metrics.dividendYield === "number" && Number.isFinite(line.asset.metrics.dividendYield) ? `${percent.format(line.asset.metrics.dividendYield)}%` : "Dado indisponível"],
    ["Dividendo estimado por ciclo", estimatedCycle === undefined ? "Dado indisponível" : money.format(estimatedCycle)],
    ["Dividendos estimados por ano", money.format(line.estimatedDividendsYear)],
    ["Dividendos recebidos", "Dado indisponível"],
    ["Frequência estimada", frequency],
    ["Peso na carteira", `${percent.format(line.weight)}%`],
    ["Data da compra", purchaseDate]
  ];

  return createPortal(
    <div className="fixed inset-0 z-[1100] grid place-items-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="portfolio-details-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f172a]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-300">Detalhes da posição</p>
            <h3 id="portfolio-details-title" className="mt-1 break-words text-2xl font-black text-slate-950 dark:text-white">{line.ticker}</h3>
            <p className="break-words text-sm text-slate-500 dark:text-slate-300">{typeLabels[line.asset.type]} · {line.asset.segment}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-md border border-slate-200 p-2 text-slate-600 dark:border-white/10 dark:text-white" aria-label="Fechar detalhes"><X className="h-5 w-5" /></button>
        </header>
        <div className="grid gap-px bg-slate-200 dark:bg-white/10 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="min-w-0 bg-white p-4 dark:bg-[#0f172a]">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
        <footer className="border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
          Preço atualizado em {new Date(line.asset.updatedAt).toLocaleString("pt-BR")}. Valores recebidos só são exibidos quando houver histórico confirmado.
        </footer>
      </div>
    </div>,
    document.body
  );
}

export function PortfolioPositionsTable({ lines, editingId, onEdit, onDelete, onCancelEdit, onSaveEdit, dividendPerShare, dividendFrequency }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [selectedLine, setSelectedLine] = useState<PortfolioLine | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () => setHasOverflow(wrapper.scrollWidth > wrapper.clientWidth + 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    const table = wrapper.querySelector("table");
    if (table) observer.observe(table);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [lines.length, editingId]);

  return (
    <>
      <div ref={wrapperRef} className="portfolio-table-wrapper" tabIndex={hasOverflow ? 0 : -1} aria-label="Tabela de posições da carteira">
        <table className="portfolio-table text-sm">
          <thead>
            <tr className="text-left text-slate-600 dark:text-slate-200">
              <th className="portfolio-asset-column">Ativo</th>
              <th>Quantidade</th>
              <th>Preço médio</th>
              <th>Capital investido</th>
              <th>Preço atual</th>
              <th>Patrimônio atual</th>
              <th>Lucro / Prejuízo</th>
              <th>Rentabilidade</th>
              <th>Dividendo por ação</th>
              <th>Frequência</th>
              <th>A receber</th>
              <th>Peso</th>
              <th className="portfolio-actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const dividend = dividendPerShare(line.asset);
              const totalDividend = dividend === undefined ? undefined : multiplyDecimalToNumber(line.quantity, dividend);
              const tooltip = [
                `Capital investido: ${money.format(line.invested)}`,
                `Patrimônio atual: ${money.format(line.currentValue)}`,
                `Diferença: ${signedMoney(line.profit)}`,
                `Rentabilidade: ${signedPercent(line.profitability)}`
              ].join("\n");
              return (
                <Fragment key={line.id}>
                  <tr>
                    <td className="portfolio-asset-column">
                      <button type="button" onClick={() => setSelectedLine(line)} className="max-w-[12rem] text-left" title={`Abrir detalhes de ${line.ticker}`}>
                        <strong className="block text-cyan-700 underline decoration-cyan-500/40 underline-offset-4 dark:text-cyan-300">{line.ticker}</strong>
                        <span className="mt-1 block break-words text-xs font-normal text-slate-500 dark:text-slate-300">{typeLabels[line.asset.type]}</span>
                      </button>
                    </td>
                    <td><DecimalValueDisplay value={line.quantity} expandable={line.asset.type === "CRIPTO"} /></td>
                    <td>{money.format(decimalToNumber(line.averagePrice))}</td>
                    <td className="font-semibold">{money.format(line.invested)}</td>
                    <td>{money.format(line.asset.price)}</td>
                    <td className="font-black">{money.format(line.currentValue)}</td>
                    <td title={tooltip} className={`font-black ${resultTone(line.profit)}`}>
                      <span className="inline-flex items-center gap-1.5"><ResultIcon value={line.profit} />{signedMoney(line.profit)}<Info className="h-3.5 w-3.5 opacity-70" aria-hidden="true" /></span>
                    </td>
                    <td className={`font-black ${resultTone(line.profitability)}`}>{signedPercent(line.profitability)}</td>
                    <td className="font-semibold">{dividend === undefined ? "Dado indisponível" : money.format(dividend)}</td>
                    <td>{dividendFrequency(line.asset)}</td>
                    <td className="font-black text-cyan-700 dark:text-cyan-300">{totalDividend === undefined ? "Dado indisponível" : money.format(totalDividend)}</td>
                    <td>{percent.format(line.weight)}%</td>
                    <td className="portfolio-actions-column">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => onEdit(line.id)} className="rounded-md bg-cyan-500/10 p-2 text-cyan-700 dark:text-cyan-300" title="Editar posição" aria-label={`Editar posição ${line.ticker}`}><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => onDelete(line.id)} className="rounded-md bg-red-500/10 p-2 text-red-600 dark:text-red-300" title="Excluir posição" aria-label={`Excluir posição ${line.ticker}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                  {editingId === line.id && (
                    <tr>
                      <td colSpan={13} className="portfolio-edit-cell">
                        <PortfolioPositionEditor position={line} assetType={line.asset.type} onCancel={onCancelEdit} onSave={(quantity, averagePrice) => onSaveEdit(line, quantity, averagePrice)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!lines.length && <tr><td colSpan={13} className="p-6 text-center text-slate-500 dark:text-slate-300">Nenhuma posição cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
      {hasOverflow && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300"><Info className="h-4 w-4" />Deslize horizontalmente dentro da tabela para ver todas as colunas.</p>}
      {mounted && selectedLine && <PortfolioDetailsModal line={selectedLine} dividend={dividendPerShare(selectedLine.asset)} frequency={dividendFrequency(selectedLine.asset)} onClose={() => setSelectedLine(null)} />}
    </>
  );
}
