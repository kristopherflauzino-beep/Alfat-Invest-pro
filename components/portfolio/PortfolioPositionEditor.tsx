"use client";

import { Save, X } from "lucide-react";
import { useState } from "react";
import { CryptoQuantityInput } from "@/components/portfolio/CryptoQuantityInput";
import {
  CRYPTO_MAX_DECIMAL_PLACES,
  validateAssetQuantity,
  validateDecimalInput
} from "@/lib/decimal/crypto-quantity";
import type { AssetType, PortfolioPosition } from "@/lib/types";

export function PortfolioPositionEditor({
  position,
  assetType,
  onSave,
  onCancel
}: {
  position: PortfolioPosition;
  assetType: AssetType;
  onSave: (quantity: string, averagePrice: string) => void;
  onCancel: () => void;
}) {
  const [quantity, setQuantity] = useState(position.quantity);
  const [averagePrice, setAveragePrice] = useState(position.averagePrice);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantityResult = validateAssetQuantity(quantity, assetType);
    if (!quantityResult.ok) {
      setError(quantityResult.error);
      return;
    }
    const priceResult = validateDecimalInput(averagePrice, {
      maxDecimalPlaces: CRYPTO_MAX_DECIMAL_PLACES,
      fieldLabel: "O preço médio"
    });
    if (!priceResult.ok) {
      setError(priceResult.error);
      return;
    }
    setError("");
    onSave(quantityResult.value, priceResult.value);
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/5 md:grid-cols-[1fr_1fr_auto] md:items-start">
      <CryptoQuantityInput value={quantity} onChange={setQuantity} assetType={assetType} name={"edit-quantity-" + position.id} />
      <label className="text-sm font-bold">
        Preço médio
        <input
          type="text"
          inputMode="decimal"
          value={averagePrice}
          onChange={(event) => setAveragePrice(event.target.value)}
          required
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
        />
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Valor decimal preservado sem arredondamento.</span>
      </label>
      <div className="flex gap-2 pt-6">
        <button type="submit" className="grid h-12 w-12 place-items-center rounded-xl bg-cyan-500 text-white" title="Salvar posição" aria-label="Salvar posição"><Save className="h-4 w-4" /></button>
        <button type="button" onClick={onCancel} className="grid h-12 w-12 place-items-center rounded-xl bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white" title="Cancelar edição" aria-label="Cancelar edição"><X className="h-4 w-4" /></button>
      </div>
      {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300 md:col-span-3">{error}</p>}
    </form>
  );
}
