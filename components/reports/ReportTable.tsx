import { formatReportCell, type ReportTable as ReportTableData } from "@/lib/reports/types";

export function ReportTable({ table }: { table: ReportTableData }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-[10px]">
        <thead>
          <tr className="bg-teal-600 text-left text-white">
            {table.columns.map((column) => <th key={column.key} className="border border-teal-700 px-2 py-2 font-bold">{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 ? "bg-slate-50" : "bg-white"}>
              {row.map((cell, cellIndex) => <td key={cellIndex} className="border border-slate-200 px-2 py-2 align-top text-slate-700">{formatReportCell(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
