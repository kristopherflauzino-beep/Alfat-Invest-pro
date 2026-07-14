import type { AlfatecFiiAnalysis, FiiDataPoint } from "@/lib/analysis/alfatec-fii";

function statusLabel(status: FiiDataPoint["status"]) {
  const labels: Record<FiiDataPoint["status"], string> = {
    disponivel: "Disponível",
    indisponivel: "Dado indisponível",
    nao_aplicavel: "Não aplicável",
    desatualizado: "Desatualizado",
    estimado: "Estimado",
    manual: "Manual"
  };
  return labels[status];
}

export function FiiDataSourceInfo({ analysis }: { analysis: AlfatecFiiAnalysis }) {
  return (
    <div className="rounded-3xl border border-slate-200 p-4 dark:border-white/10">
      <h4 className="font-black">Fontes e datas</h4>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-300">
              <th className="p-2">Dado</th>
              <th className="p-2">Status</th>
              <th className="p-2">Fonte</th>
              <th className="p-2">Data-base</th>
            </tr>
          </thead>
          <tbody>
            {analysis.dataSources.map((item) => (
              <tr key={`${item.label}-${item.status}`} className="border-t border-slate-100 dark:border-white/10">
                <td className="p-2 font-semibold">{item.label}</td>
                <td className="p-2">{statusLabel(item.status)}</td>
                <td className="p-2">{item.source}</td>
                <td className="p-2">{item.baseDate ? new Date(item.baseDate).toLocaleString("pt-BR") : "Dado indisponível"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-2xl bg-cyan-500/10 p-3 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
        Dados patrimoniais e operacionais podem ter periodicidade diferente do preço. Vacância, patrimônio e composição não são tratados como tempo real.
      </p>
    </div>
  );
}

