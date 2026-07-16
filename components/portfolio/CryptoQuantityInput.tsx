"use client";

import type { AssetType } from "@/lib/types";
import { validateAssetQuantity } from "@/lib/decimal/crypto-quantity";

export function CryptoQuantityInput({
  value,
  onChange,
  assetType,
  name = "quantity",
  label = "Quantidade",
  required = true
}: {
  value: string;
  onChange: (value: string) => void;
  assetType: AssetType;
  name?: string;
  label?: string;
  required?: boolean;
}) {
  const validation = value ? validateAssetQuantity(value, assetType) : null;
  const error = validation && !validation.ok ? validation.error : "";
  const isCrypto = assetType === "CRIPTO";

  return (
    <label className="text-sm font-bold">
      {label}
      <input
        type="text"
        inputMode="decimal"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={name + "-help"}
        placeholder={isCrypto ? "0,00000001" : "1"}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
      />
      <span id={name + "-help"} className={"mt-1 block text-xs " + (error ? "text-red-600 dark:text-red-300" : "text-slate-500 dark:text-slate-400")}>
        {error || (isCrypto ? "Até 22 casas decimais." : "Até 8 casas decimais para ativos de mercado.")}
      </span>
    </label>
  );
}
