import "server-only";

import type { FixedIncomeReferenceRates, ReferenceRate } from "./types";

type BcbPoint = { data?: string; valor?: string };
type CachedRates = { value: FixedIncomeReferenceRates; expiresAt: number };

let cache: CachedRates | null = null;
const BCB_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

function parseBcbDate(value?: string) {
  if (!value) return undefined;
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return undefined;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function fetchLatestSeries(code: number) {
  const url = `${BCB_BASE}.${code}/dados/ultimos/60?formato=json`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "AlfaTec Invest Pro" },
    next: { revalidate: 3600 }
  });
  if (!response.ok) throw new Error(`Série ${code} indisponível.`);
  const points = await response.json() as BcbPoint[];
  const latestAllowed = Date.now() + 24 * 60 * 60 * 1000;
  const point = [...points].reverse().find((item) => {
    const referenceDate = parseBcbDate(item.data);
    const timestamp = referenceDate ? Date.parse(referenceDate + "T23:59:59.999") : Number.NaN;
    return Number.isFinite(timestamp)
      && timestamp <= latestAllowed
      && Number.isFinite(Number(String(item.valor ?? "").replace(",", ".")));
  });
  if (!point) throw new Error(`Série ${code} sem valor válido.`);
  return {
    value: Number(String(point.valor).replace(",", ".")),
    referenceDate: parseBcbDate(point.data),
    sourceUrl: url
  };
}

function unavailable(source: string, note: string): ReferenceRate {
  return {
    status: "unavailable",
    source,
    sourceUrl: "https://dadosabertos.bcb.gov.br/",
    consultedAt: new Date().toISOString(),
    note
  };
}

export async function getFixedIncomeReferenceRates(force = false): Promise<FixedIncomeReferenceRates> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.value;
  const consultedAt = new Date().toISOString();
  const [cdiResult, selicResult, ipcaResult] = await Promise.allSettled([
    fetchLatestSeries(12),
    fetchLatestSeries(432),
    fetchLatestSeries(13522)
  ]);

  const cdi: ReferenceRate = cdiResult.status === "fulfilled"
    ? {
        annualPercent: Number(((Math.pow(1 + cdiResult.value.value / 100, 252) - 1) * 100).toFixed(4)),
        status: "available",
        source: "Banco Central do Brasil - SGS 12",
        sourceUrl: cdiResult.value.sourceUrl,
        referenceDate: cdiResult.value.referenceDate,
        consultedAt,
        note: "Taxa diária do CDI anualizada em base de 252 dias úteis."
      }
    : unavailable("Banco Central do Brasil - SGS 12", "CDI indisponível no momento.");

  const selic: ReferenceRate = selicResult.status === "fulfilled"
    ? {
        annualPercent: selicResult.value.value,
        status: "available",
        source: "Banco Central do Brasil - Meta Selic (SGS 432)",
        sourceUrl: selicResult.value.sourceUrl,
        referenceDate: selicResult.value.referenceDate,
        consultedAt
      }
    : unavailable("Banco Central do Brasil - SGS 432", "Selic indisponível no momento.");

  const ipca: ReferenceRate = ipcaResult.status === "fulfilled"
    ? {
        annualPercent: ipcaResult.value.value,
        status: "available",
        source: "Banco Central do Brasil - IPCA acumulado em 12 meses (SGS 13522)",
        sourceUrl: ipcaResult.value.sourceUrl,
        referenceDate: ipcaResult.value.referenceDate,
        consultedAt,
        note: "Usado apenas como referência de cenário para projeções futuras."
      }
    : unavailable("Banco Central do Brasil - SGS 13522", "IPCA acumulado em 12 meses indisponível.");

  const value = { cdi, selic, ipca };
  cache = { value, expiresAt: Date.now() + 60 * 60_000 };
  return value;
}
