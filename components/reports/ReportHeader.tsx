"use client";

import { useState } from "react";
import type { ReportDocumentData } from "@/lib/reports/types";

export function ReportHeader({ report, compact = false }: { report: ReportDocumentData; compact?: boolean }) {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <header className="border-b-2 border-teal-500 pb-5">
      <div className="flex items-start gap-5">
        <div className="flex min-w-0 items-center gap-4">
          {!logoFailed ? (
            <img src="/logo-alfatec-report.png" alt="AlfaTec Invest Pro" className={compact ? "h-12 w-12 shrink-0 object-contain" : "h-20 w-20 shrink-0 object-contain"} onError={() => setLogoFailed(true)} />
          ) : (
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded border border-slate-300 text-center text-[8px] font-black text-slate-900">ALFATEC<br />INVEST PRO</div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-teal-600">AlfaTec Invest Pro</p>
            <h1 className={compact ? "text-lg font-black text-slate-950" : "text-2xl font-black text-slate-950"}>{report.title}</h1>
            <p className="mt-1 text-xs text-slate-600">{report.reportType}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
