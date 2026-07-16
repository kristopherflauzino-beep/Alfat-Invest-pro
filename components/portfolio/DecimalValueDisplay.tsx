"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { formatDecimalForDisplay, fullDecimalForDisplay } from "@/lib/decimal/crypto-quantity";

export function DecimalValueDisplay({
  value,
  expandable = false
}: {
  value: string | number;
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? fullDecimalForDisplay(value) : formatDecimalForDisplay(value);

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="break-all font-mono tabular-nums">{displayed}</span>
      {expandable && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-cyan-600 dark:hover:bg-white/10 dark:hover:text-cyan-300"
          title={expanded ? "Mostrar valor resumido" : "Mostrar valor completo"}
          aria-label={expanded ? "Mostrar valor resumido" : "Mostrar valor completo"}
        >
          {expanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
    </span>
  );
}
