import type { AlfatecCryptoAnalysis } from "@/lib/analysis/alfatec-crypto";
import type { AlfatecFiiAnalysis } from "@/lib/analysis/alfatec-fii";
import type { Asset, PortfolioAnalysis } from "@/lib/types";
import { analisarNumeroGraham } from "@/lib/valuation/graham";
import { decimalToNumber } from "@/lib/decimal/crypto-quantity";
import {
  reportCell,
  reportDisclaimer,
  type ReportCell,
  type ReportDocumentData,
  type ReportSection
} from "@/lib/reports/types";

export type ReportUser = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  username?: string;
  status?: string;
  planId?: string;
  planValue?: number;
  createdAt?: string;
  dueDate?: string;
  planStartedAt?: string;
  subscriptionStatus?: string;
  permissions?: string[];
};

export type ReportPlan = { id: string; name: string; value: number; durationDays: number; status: string };
export type ReportPayment = { id: string; clientId: string; planId: string; value: number; paymentDate: string; dueDate?: string; status: string; planName?: string; notes?: string; renewalMode?: string };
export type ReportAudit = { id?: string; action?: string; userId?: string; userName?: string; details?: string; createdAt?: string; risk?: string };
export type ReportSubscriptionRequest = { id?: string; userId?: string; userName?: string; userEmail?: string; planId?: string; planName?: string; officialPrice?: number; status?: string; createdAt?: string; updatedAt?: string };
export type ReportEmailJob = { id?: string; userId?: string; topic?: string; status?: string; attempts?: number; createdAt?: string; lastError?: string };
export type ReportNotification = { id?: string; userId?: string; topic?: string; title?: string; priority?: string; readAt?: string; createdAt?: string };
export type ReportExport = { id?: string; userId?: string; userName?: string; targetUserId?: string; format?: string; reportType?: string; sections?: string[]; period?: ReportPeriod; result?: string; createdAt?: string };

export type ReportPeriod = { start: string; end: string; label: string };

export type ClientReportInput = {
  user: ReportUser;
  portfolio: PortfolioAnalysis;
  assets: Asset[];
  fiiAnalyses: Array<{ asset: Asset; analysis: AlfatecFiiAnalysis }>;
  cryptoAnalyses: AlfatecCryptoAnalysis[];
  plans?: ReportPlan[];
  payments?: ReportPayment[];
  period: ReportPeriod;
};

export type AdminReportFilters = {
  period: ReportPeriod;
  clientId?: string;
  planId?: string;
  status?: string;
};

export type AdminReportInput = {
  user: ReportUser;
  accounts: ReportUser[];
  plans: ReportPlan[];
  payments: ReportPayment[];
  auditLogs: ReportAudit[];
  subscriptionRequests?: ReportSubscriptionRequest[];
  emailJobs?: ReportEmailJob[];
  notifications?: ReportNotification[];
  reportExports?: ReportExport[];
  filters: AdminReportFilters;
};

const unavailable = "Dado indisponível na fonte consultada.";
const text = (value: string | number | null | undefined): ReportCell => reportCell(value == null || value === "" ? null : String(value));
const number = (value: number | null | undefined): ReportCell => reportCell(value ?? null, "number");
const money = (value: number | null | undefined): ReportCell => reportCell(value ?? null, "currency");
const percent = (value: number | null | undefined): ReportCell => reportCell(value ?? null, "percent");
const date = (value: string | null | undefined): ReportCell => reportCell(value ?? null, "date");
const datetime = (value: string | null | undefined): ReportCell => reportCell(value ?? null, "datetime");

function latestIso(values: Array<string | undefined | null>) {
  const timestamps = values.map((value) => value ? new Date(value).getTime() : Number.NaN).filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : new Date().toISOString();
}

function sourceLabel(asset: Asset) {
  return asset.sourceLabel ?? (asset.source === "external" ? "Fornecedor externo de mercado" : "Base de indicadores do ativo");
}

function commonDocument(input: { title: string; reportType: string; user: ReportUser; period: ReportPeriod; sections: ReportSection[]; summary: ReportDocumentData["summary"]; dataUpdatedAt: string; sources: string[] }): ReportDocumentData {
  return {
    version: "1.0",
    title: input.title,
    reportType: input.reportType,
    user: { id: input.user.id, name: input.user.name, email: input.user.email },
    generatedAt: new Date().toISOString(),
    period: input.period,
    dataUpdatedAt: input.dataUpdatedAt,
    sources: [...new Set(input.sources.filter(Boolean))],
    summary: input.summary,
    sections: input.sections,
    disclaimer: reportDisclaimer
  };
}

function portfolioTable(input: ClientReportInput) {
  return {
    columns: [
      { key: "ticker", label: "Ativo" }, { key: "type", label: "Classe" }, { key: "quantity", label: "Quantidade" },
      { key: "averagePrice", label: "Preço médio" }, { key: "price", label: "Preço atual" }, { key: "equity", label: "Patrimônio" },
      { key: "profit", label: "Lucro/Prejuízo" }, { key: "return", label: "Rentabilidade" }, { key: "weight", label: "Peso" }
    ],
    rows: input.portfolio.lines.map((line) => [text(line.ticker), text(line.asset.type), text(line.quantity), money(decimalToNumber(line.averagePrice)), money(line.asset.price), money(line.currentValue), money(line.profit), percent(line.profitability), percent(line.weight)])
  };
}

export function buildClientReport(input: ClientReportInput): ReportDocumentData {
  const p = input.portfolio;
  const grahamRows = p.lines.map((line) => ({ line, analysis: analisarNumeroGraham(line.asset) })).filter(({ analysis }) => analysis.applicable);
  const fiiRows = input.fiiAnalyses.filter(({ analysis }) => analysis.applicable);
  const cryptoRows = input.cryptoAnalyses.filter((analysis) => analysis.applicable);
  const allocationClass = p.byType.map((item) => ({ ...item, percent: p.totalEquity > 0 ? item.value / p.totalEquity * 100 : 0 }));
  const allocationSector = p.bySector.map((item) => ({ ...item, percent: p.totalEquity > 0 ? item.value / p.totalEquity * 100 : 0 }));
  const sources = p.lines.map((line) => sourceLabel(line.asset));
  const updatedAt = latestIso(p.lines.map((line) => line.asset.lastUpdatedAt ?? line.asset.updatedAt));
  const currentPlan = input.plans?.find((plan) => plan.id === input.user.planId);
  const userPayments = (input.payments ?? []).filter((payment) => payment.clientId === input.user.id);
  const sections: ReportSection[] = [
    {
      id: "summary", group: "Carteira", title: "Resumo executivo",
      description: "Visão consolidada com os mesmos valores apresentados na plataforma.",
      metrics: [
        { label: "Patrimônio", value: money(p.totalEquity) }, { label: "Capital investido", value: money(p.totalInvested) },
        { label: "Lucro/Prejuízo", value: money(p.totalProfit) }, { label: "Rentabilidade", value: percent(p.profitability) },
        { label: "Dividendos anuais estimados", value: money(p.projectedDividendsYear) }, { label: "Ativos", value: number(p.lines.length) }
      ],
      bullets: p.aiSummary
    },
    {
      id: "account-plan", group: "Conta", title: "Plano e assinatura",
      metrics: [
        { label: "Plano", value: text(currentPlan?.name ?? input.user.planId) },
        { label: "Valor contratado", value: money(input.user.planValue ?? currentPlan?.value) },
        { label: "Status da conta", value: text(input.user.status) },
        { label: "Status da assinatura", value: text(input.user.subscriptionStatus) },
        { label: "Início", value: date(input.user.planStartedAt) },
        { label: "Vencimento", value: date(input.user.dueDate) }
      ],
      unavailableReason: input.user.planId ? undefined : "Nenhum plano associado à conta."
    },
    {
      id: "payment-history", group: "Conta", title: "Histórico de pagamentos",
      table: {
        columns: [
          { key: "plan", label: "Plano" }, { key: "value", label: "Valor" },
          { key: "paymentDate", label: "Pagamento" }, { key: "dueDate", label: "Vencimento" },
          { key: "status", label: "Status" }
        ],
        rows: userPayments.map((payment) => [
          text(payment.planName ?? input.plans?.find((plan) => plan.id === payment.planId)?.name ?? payment.planId),
          money(payment.value), date(payment.paymentDate), date(payment.dueDate), text(payment.status)
        ])
      },
      unavailableReason: userPayments.length ? undefined : "Nenhum pagamento registrado para esta conta."
    },    { id: "equity", group: "Carteira", title: "Patrimônio", metrics: [{ label: "Investido", value: money(p.totalInvested) }, { label: "Atual", value: money(p.totalEquity) }, { label: "Variação", value: money(p.totalProfit) }] },
    { id: "returns", group: "Carteira", title: "Rentabilidade", metrics: [{ label: "Rentabilidade acumulada", value: percent(p.profitability) }, { label: "Melhor ativo", value: text(p.best?.ticker) }, { label: "Pior ativo", value: text(p.worst?.ticker) }], table: { columns: [{ key: "ticker", label: "Ativo" }, { key: "return", label: "Rentabilidade" }, { key: "day", label: "Variação diária" }, { key: "year", label: "Variação anual" }], rows: p.lines.map((line) => [text(line.ticker), percent(line.profitability), percent(line.asset.changeDay), percent(line.asset.changeYear)]) } },
    { id: "profit-loss", group: "Carteira", title: "Lucro e prejuízo", metrics: [{ label: "Resultado total", value: money(p.totalProfit) }], table: { columns: [{ key: "ticker", label: "Ativo" }, { key: "invested", label: "Investido" }, { key: "current", label: "Atual" }, { key: "result", label: "Resultado" }], rows: p.lines.map((line) => [text(line.ticker), money(line.invested), money(line.currentValue), money(line.profit)]) } },
    { id: "dividends", group: "Carteira", title: "Dividendos", description: "Projeções baseadas no Dividend Yield disponível; valores futuros podem variar.", metrics: [{ label: "Estimativa mensal", value: money(p.projectedDividendsMonth) }, { label: "Estimativa anual", value: money(p.projectedDividendsYear) }], table: { columns: [{ key: "ticker", label: "Ativo" }, { key: "dy", label: "Dividend Yield" }, { key: "monthly", label: "Estimativa mensal" }, { key: "annual", label: "Estimativa anual" }], rows: p.lines.map((line) => [text(line.ticker), percent(line.asset.metrics.dividendYield), money(line.estimatedDividendsMonth), money(line.estimatedDividendsYear)]) } },
    { id: "allocation-class", group: "Distribuição", title: "Distribuição por classe", table: { columns: [{ key: "class", label: "Classe" }, { key: "value", label: "Valor" }, { key: "share", label: "Participação" }], rows: allocationClass.map((item) => [text(item.name), money(item.value), percent(item.percent)]) }, chart: { title: "Participação por classe", items: allocationClass.map((item) => ({ label: item.name, value: item.percent })), format: "percent" } },
    { id: "allocation-sector", group: "Distribuição", title: "Distribuição por setor", table: { columns: [{ key: "sector", label: "Setor" }, { key: "value", label: "Valor" }, { key: "share", label: "Participação" }], rows: allocationSector.map((item) => [text(item.name), money(item.value), percent(item.percent)]) }, chart: { title: "Participação por setor", items: allocationSector.map((item) => ({ label: item.name, value: item.percent })), format: "percent" } },
    { id: "assets", group: "Carteira", title: "Ativos da carteira", table: portfolioTable(input), unavailableReason: p.lines.length ? undefined : "Nenhum ativo cadastrado na carteira." },
    { id: "movements", group: "Histórico", title: "Histórico de movimentações", description: "Entradas registradas na carteira; não representa extrato da corretora.", table: { columns: [{ key: "date", label: "Data" }, { key: "ticker", label: "Ativo" }, { key: "quantity", label: "Quantidade" }, { key: "price", label: "Preço médio" }, { key: "broker", label: "Corretora" }], rows: p.lines.map((line) => [date(line.purchaseDate), text(line.ticker), text(line.quantity), money(decimalToNumber(line.averagePrice)), text(line.broker)]) }, unavailableReason: p.lines.length ? undefined : "Nenhuma movimentação registrada." },
    { id: "benchmark", group: "Análises", title: "Benchmark", unavailableReason: unavailable },
    { id: "opportunities", group: "Análises", title: "Oportunidades analisadas", description: "Scores são referências analíticas e não recomendações.", table: { columns: [{ key: "ticker", label: "Ativo" }, { key: "method", label: "Método" }, { key: "score", label: "Score/valor" }, { key: "confidence", label: "Confiança" }], rows: [...fiiRows.slice(0, 8).map(({ analysis }) => [text(analysis.ticker), text("AlfaTec FIIs"), number(analysis.score), text(analysis.confidence)]), ...cryptoRows.slice(0, 8).map((analysis) => [text(analysis.ticker), text("AlfaTec Cripto"), number(analysis.score), text(analysis.confidence)])] }, unavailableReason: !fiiRows.length && !cryptoRows.length ? unavailable : undefined },
    { id: "risks", group: "Análises", title: "Riscos e concentrações", bullets: p.alerts },
    { id: "rebalancing", group: "Análises", title: "Sugestões de rebalanceamento", bullets: p.aiSummary, description: "Leituras automatizadas; valide objetivos, custos e tributação antes de agir." },
    { id: "graham", group: "Métodos", title: "Valuation de Graham", description: "Aplicado somente a ativos compatíveis com LPA e VPA válidos.", table: { columns: [{ key: "ticker", label: "Ativo" }, { key: "price", label: "Preço" }, { key: "graham", label: "Valor de Graham" }, { key: "margin", label: "Margem de segurança" }, { key: "classification", label: "Classificação" }, { key: "confidence", label: "Confiança" }], rows: grahamRows.map(({ analysis }) => [text(analysis.ticker), money(analysis.price), money(analysis.value), percent(analysis.safetyMargin), text(analysis.classification), text(analysis.confidence)]) }, unavailableReason: grahamRows.length ? undefined : "Dados insuficientes ou ativos incompatíveis com o Número de Graham." },
    { id: "fii", group: "Métodos", title: "Método AlfaTec FIIs", table: { columns: [{ key: "ticker", label: "FII" }, { key: "type", label: "Tipo" }, { key: "price", label: "Preço" }, { key: "pvp", label: "P/VP" }, { key: "dy", label: "DY recorrente" }, { key: "premium", label: "Prêmio" }, { key: "score", label: "Score" }, { key: "confidence", label: "Confiança" }], rows: fiiRows.map(({ analysis }) => [text(analysis.ticker), text(analysis.kindLabel), money(typeof analysis.price.value === "number" ? analysis.price.value : null), number(typeof analysis.pvp.value === "number" ? analysis.pvp.value : null), percent(typeof analysis.recurrentDividendYield.value === "number" ? analysis.recurrentDividendYield.value : null), percent(typeof analysis.riskPremium.value === "number" ? analysis.riskPremium.value : null), number(analysis.score), text(analysis.confidence)]) }, unavailableReason: fiiRows.length ? undefined : unavailable },
    { id: "crypto", group: "Métodos", title: "Método AlfaTec Cripto", table: { columns: [{ key: "ticker", label: "Ativo" }, { key: "category", label: "Categoria" }, { key: "price", label: "Preço" }, { key: "marketCap", label: "Capitalização" }, { key: "volume", label: "Volume 24h" }, { key: "score", label: "Score" }, { key: "risk", label: "Classificação" }, { key: "confidence", label: "Confiança" }], rows: cryptoRows.map((analysis) => [text(analysis.ticker), text(analysis.categoryLabel), reportCell(analysis.snapshot.price, analysis.snapshot.currency === "BRL" ? "currency" : "number"), number(analysis.snapshot.marketCap), number(analysis.snapshot.volume24h), number(analysis.score), text(analysis.classification), text(analysis.confidence)]) }, unavailableReason: cryptoRows.length ? undefined : unavailable },
    { id: "score-history", group: "Histórico", title: "Histórico dos scores", unavailableReason: unavailable },
    { id: "alerts", group: "Análises", title: "Alertas", bullets: p.alerts },
    { id: "charts", group: "Distribuição", title: "Gráficos de distribuição", chart: { title: "Participação por classe", items: allocationClass.map((item) => ({ label: item.name, value: item.percent })), format: "percent" }, unavailableReason: allocationClass.length ? undefined : "Carteira sem dados para gráficos." }
  ];
  return commonDocument({
    title: "Relatório completo de investimentos",
    reportType: "Relatório da carteira",
    user: input.user,
    period: input.period,
    dataUpdatedAt: updatedAt,
    sources,
    summary: sections[0].metrics ?? [],
    sections
  });
}

function inPeriod(value: string | undefined, period: ReportPeriod) {
  if (!value) return false;
  const dateValue = value.slice(0, 10);
  return dateValue >= period.start && dateValue <= period.end;
}

function clientsTable(accounts: ReportUser[]) {
  return {
    columns: [{ key: "name", label: "Cliente" }, { key: "email", label: "E-mail" }, { key: "plan", label: "Plano" }, { key: "status", label: "Status" }, { key: "created", label: "Cadastro" }, { key: "due", label: "Vencimento" }],
    rows: accounts.map((account) => [text(account.name), text(account.email), text(account.planId), text(account.status), date(account.createdAt), date(account.dueDate)])
  };
}

function paymentsTable(payments: ReportPayment[], accounts: ReportUser[]) {
  const names = new Map(accounts.map((account) => [account.id, account.name]));
  return {
    columns: [{ key: "client", label: "Cliente" }, { key: "plan", label: "Plano" }, { key: "value", label: "Valor" }, { key: "date", label: "Data" }, { key: "status", label: "Status" }, { key: "due", label: "Vencimento" }],
    rows: payments.map((payment) => [text(names.get(payment.clientId) ?? payment.clientId), text(payment.planName ?? payment.planId), money(payment.value), date(payment.paymentDate), text(payment.status), date(payment.dueDate)])
  };
}

function groupedRows<T>(items: T[], key: (item: T) => string, value: (item: T) => number) {
  const grouped = new Map<string, number>();
  items.forEach((item) => grouped.set(key(item), (grouped.get(key(item)) ?? 0) + value(item)));
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function buildAdminReport(input: AdminReportInput): ReportDocumentData {
  const period = input.filters.period;
  const clients = input.accounts.filter((account) => account.role === "CLIENTE")
    .filter((account) => !input.filters.clientId || account.id === input.filters.clientId)
    .filter((account) => !input.filters.planId || account.planId === input.filters.planId)
    .filter((account) => !input.filters.status || account.status === input.filters.status);
  const clientIds = new Set(clients.map((client) => client.id));
  const payments = input.payments.filter((payment) => clientIds.has(payment.clientId) && inPeriod(payment.paymentDate, period));
  const confirmed = payments.filter((payment) => payment.status === "pago");
  const pending = payments.filter((payment) => payment.status === "pendente");
  const totalRevenue = confirmed.reduce((sum, payment) => sum + payment.value, 0);
  const today = new Date();
  const nextSeven = new Date(today); nextSeven.setDate(today.getDate() + 7);
  const active = clients.filter((client) => client.status === "ativo");
  const blocked = clients.filter((client) => client.status === "bloqueado");
  const pendingClients = clients.filter((client) => client.status === "pendente");
  const expired = clients.filter((client) => client.status === "vencido" || Boolean(client.dueDate && client.dueDate < today.toISOString().slice(0, 10)));
  const expiring = clients.filter((client) => Boolean(client.dueDate && client.dueDate >= today.toISOString().slice(0, 10) && client.dueDate <= nextSeven.toISOString().slice(0, 10)));
  const requests = input.subscriptionRequests ?? [];
  const sectionForClients = (id: string, title: string, list: ReportUser[]): ReportSection => ({ id, group: "Relatórios de clientes", title, metrics: [{ label: "Quantidade", value: number(list.length) }], table: clientsTable(list), unavailableReason: list.length ? undefined : "Nenhum registro encontrado no período e filtros selecionados." });
  const monthly = groupedRows(confirmed, (payment) => payment.paymentDate.slice(0, 7), (payment) => payment.value);
  const annual = groupedRows(confirmed, (payment) => payment.paymentDate.slice(0, 4), (payment) => payment.value);
  const planCounts = groupedRows(clients, (client) => client.planId ?? "Sem plano", () => 1);
  const planRevenue = groupedRows(confirmed, (payment) => payment.planName ?? payment.planId, (payment) => payment.value);
  const audit = input.auditLogs.filter((item) => inPeriod(item.createdAt, period));
  const cancellations = payments.filter((payment) => payment.status === "cancelado");
  const renewals = payments.filter((payment) => Boolean(payment.renewalMode));
  const reportExports = (input.reportExports ?? [])
    .filter((item) => inPeriod(item.createdAt, period))
    .filter((item) => !input.filters.clientId || item.targetUserId === input.filters.clientId);
  const plansByTerm = (term: string) => input.plans.filter((plan) => (plan.id + " " + plan.name).toLocaleLowerCase("pt-BR").includes(term));
  const planSection = (id: string, title: string, list: ReportPlan[]): ReportSection => ({
    id, group: "Relatórios de planos", title,
    table: { columns: [{ key: "name", label: "Plano" }, { key: "value", label: "Valor" }, { key: "duration", label: "Duração (dias)" }, { key: "status", label: "Status" }], rows: list.map((plan) => [text(plan.name), money(plan.value), number(plan.durationDays), text(plan.status)]) },
    unavailableReason: list.length ? undefined : "Plano não cadastrado."
  });
  const sections: ReportSection[] = [
    sectionForClients("clients-list", "Lista de clientes", clients),
    sectionForClients("clients-active", "Clientes ativos", active),
    sectionForClients("clients-blocked", "Clientes bloqueados", blocked),
    sectionForClients("clients-pending", "Clientes pendentes", pendingClients),
    sectionForClients("clients-new", "Novos clientes", clients.filter((client) => inPeriod(client.createdAt, period))),
    { id: "clients-last-access", group: "Relatórios de clientes", title: "Últimos acessos", unavailableReason: unavailable },
    { id: "clients-by-plan", group: "Relatórios de clientes", title: "Clientes por plano", table: { columns: [{ key: "plan", label: "Plano" }, { key: "count", label: "Clientes" }], rows: planCounts.map(([label, value]) => [text(label), number(value)]) }, chart: { title: "Clientes por plano", items: planCounts.map(([label, value]) => ({ label, value })), format: "number" } },
    sectionForClients("clients-expiring", "Clientes próximos do vencimento", expiring),
    sectionForClients("clients-expired", "Clientes com plano vencido", expired),
    { id: "finance-total", group: "Relatórios financeiros", title: "Receita total", metrics: [{ label: "Receita confirmada", value: money(totalRevenue) }, { label: "Pagamentos confirmados", value: number(confirmed.length) }, { label: "Pagamentos pendentes", value: number(pending.length) }] },
    { id: "finance-monthly", group: "Relatórios financeiros", title: "Receita mensal", table: { columns: [{ key: "month", label: "Mês" }, { key: "value", label: "Receita" }], rows: monthly.map(([label, value]) => [text(label), money(value)]) }, chart: { title: "Receita mensal", items: monthly.map(([label, value]) => ({ label, value })), format: "currency" }, unavailableReason: monthly.length ? undefined : "Nenhuma receita confirmada no período." },
    { id: "finance-annual", group: "Relatórios financeiros", title: "Receita anual", table: { columns: [{ key: "year", label: "Ano" }, { key: "value", label: "Receita" }], rows: annual.map(([label, value]) => [text(label), money(value)]) }, unavailableReason: annual.length ? undefined : "Nenhuma receita confirmada no período." },
    { id: "payments-confirmed", group: "Relatórios financeiros", title: "Pagamentos confirmados", table: paymentsTable(confirmed, clients), unavailableReason: confirmed.length ? undefined : "Nenhum pagamento confirmado no período." },
    { id: "payments-pending", group: "Relatórios financeiros", title: "Pagamentos pendentes", table: paymentsTable(pending, clients), unavailableReason: pending.length ? undefined : "Nenhum pagamento pendente no período." },
    { id: "subscriptions-review", group: "Relatórios financeiros", title: "Solicitações em análise", table: { columns: [{ key: "client", label: "Cliente" }, { key: "plan", label: "Plano" }, { key: "value", label: "Valor" }, { key: "status", label: "Status" }, { key: "date", label: "Solicitação" }], rows: requests.filter((request) => ["awaiting_verification", "under_review", "payment_confirmed"].includes(request.status ?? "")).map((request) => [text(request.userName ?? request.userId), text(request.planName ?? request.planId), money(request.officialPrice), text(request.status), datetime(request.createdAt)]) }, unavailableReason: requests.length ? undefined : unavailable },
    { id: "subscriptions-rejected", group: "Relatórios financeiros", title: "Solicitações recusadas", table: { columns: [{ key: "client", label: "Cliente" }, { key: "plan", label: "Plano" }, { key: "status", label: "Status" }, { key: "date", label: "Atualização" }], rows: requests.filter((request) => request.status === "rejected").map((request) => [text(request.userName ?? request.userId), text(request.planName ?? request.planId), text(request.status), datetime(request.updatedAt)]) }, unavailableReason: requests.length ? undefined : unavailable },
    sectionForClients("subscriptions-active", "Assinaturas ativas", clients.filter((client) => client.subscriptionStatus === "active" || client.status === "ativo")),
    sectionForClients("subscriptions-expired", "Assinaturas vencidas", expired),
    { id: "renewals", group: "Relatórios financeiros", title: "Renovações", table: paymentsTable(renewals, clients), unavailableReason: renewals.length ? undefined : "Nenhuma renovação registrada no período." },
    { id: "cancellations", group: "Relatórios financeiros", title: "Cancelamentos", table: paymentsTable(cancellations, clients), unavailableReason: cancellations.length ? undefined : "Nenhum cancelamento registrado no período." },
    { id: "gross-values", group: "Relatórios financeiros", title: "Valores brutos", metrics: [{ label: "Total registrado", value: money(payments.reduce((sum, payment) => sum + payment.value, 0)) }] },
    { id: "fees", group: "Relatórios financeiros", title: "Taxas", unavailableReason: unavailable },
    { id: "net-values", group: "Relatórios financeiros", title: "Valores líquidos", unavailableReason: "Taxas não estão disponíveis; não é possível calcular o valor líquido sem inventar dados." },
    { id: "plans", group: "Relatórios de planos", title: "Valores dos planos", table: { columns: [{ key: "name", label: "Plano" }, { key: "value", label: "Valor" }, { key: "duration", label: "Duração (dias)" }, { key: "status", label: "Status" }], rows: input.plans.map((plan) => [text(plan.name), money(plan.value), number(plan.durationDays), text(plan.status)]) } },
    planSection("plan-weekly", "Plano semanal", plansByTerm("seman")),
    planSection("plan-monthly", "Plano mensal", plansByTerm("mensal")),
    planSection("plan-annual", "Plano anual", plansByTerm("anual")),
    { id: "plans-count", group: "Relatórios de planos", title: "Quantidade por plano", table: { columns: [{ key: "plan", label: "Plano" }, { key: "count", label: "Clientes" }], rows: planCounts.map(([label, value]) => [text(label), number(value)]) } },
    { id: "plans-revenue", group: "Relatórios de planos", title: "Receita por plano", table: { columns: [{ key: "plan", label: "Plano" }, { key: "value", label: "Receita" }], rows: planRevenue.map(([label, value]) => [text(label), money(value)]) } },
    { id: "renewal-rate", group: "Relatórios de planos", title: "Taxa de renovação", metrics: [{ label: "Renovações sobre pagamentos", value: percent(payments.length ? renewals.length / payments.length * 100 : null) }], unavailableReason: payments.length ? undefined : unavailable },
    { id: "cancellation-rate", group: "Relatórios de planos", title: "Taxa de cancelamento", metrics: [{ label: "Cancelamentos sobre pagamentos", value: percent(payments.length ? cancellations.length / payments.length * 100 : null) }], unavailableReason: payments.length ? undefined : unavailable },
    sectionForClients("usage-active", "Usuários ativos", active),
    sectionForClients("usage-inactive", "Usuários inativos", clients.filter((client) => client.status !== "ativo")),
    { id: "usage-access", group: "Relatórios de uso", title: "Acessos", unavailableReason: unavailable },
    { id: "usage-features", group: "Relatórios de uso", title: "Funcionalidades mais utilizadas", unavailableReason: unavailable },
    { id: "usage-reports", group: "Relatórios de uso", title: "Relatórios gerados", metrics: [{ label: "Exportações no período", value: number(reportExports.length) }], table: { columns: [{ key: "date", label: "Data" }, { key: "user", label: "Usuário" }, { key: "target", label: "Cliente do relatório" }, { key: "type", label: "Tipo" }, { key: "format", label: "Formato" }, { key: "sections", label: "Seções" }, { key: "result", label: "Resultado" }], rows: reportExports.map((item) => [datetime(item.createdAt), text(item.userName ?? item.userId), text(item.targetUserId), text(item.reportType), text(item.format?.toUpperCase()), number(item.sections?.length), text(item.result)]) }, unavailableReason: reportExports.length ? undefined : "Nenhuma exportação registrada no período." },
    { id: "usage-assets", group: "Relatórios de uso", title: "Ativos mais pesquisados", unavailableReason: unavailable },
    { id: "usage-ai", group: "Relatórios de uso", title: "Uso da AlfaTec IA", unavailableReason: unavailable },
    { id: "system-health", group: "Relatórios do sistema", title: "Saúde do sistema", metrics: [{ label: "Armazenamento", value: text("Persistente") }, { label: "Registros de auditoria no período", value: number(audit.length) }], description: "A disponibilidade externa das APIs deve ser consultada no monitoramento operacional." },
    { id: "api-status", group: "Relatórios do sistema", title: "Status das APIs", unavailableReason: "O estado instantâneo das APIs não é persistido no banco de relatórios." },
    { id: "sync-failures", group: "Relatórios do sistema", title: "Falhas de sincronização", unavailableReason: unavailable },
    { id: "stale-data", group: "Relatórios do sistema", title: "Dados desatualizados", unavailableReason: unavailable },
    { id: "email-history", group: "Relatórios do sistema", title: "Histórico de e-mails", table: { columns: [{ key: "topic", label: "Assunto" }, { key: "status", label: "Status" }, { key: "attempts", label: "Tentativas" }, { key: "date", label: "Data" }, { key: "error", label: "Erro" }], rows: (input.emailJobs ?? []).map((job) => [text(job.topic), text(job.status), number(job.attempts), datetime(job.createdAt), text(job.lastError)]) }, unavailableReason: input.emailJobs?.length ? undefined : unavailable },
    { id: "notification-history", group: "Relatórios do sistema", title: "Histórico de notificações", table: { columns: [{ key: "title", label: "Notificação" }, { key: "topic", label: "Categoria" }, { key: "priority", label: "Prioridade" }, { key: "read", label: "Leitura" }, { key: "date", label: "Data" }], rows: (input.notifications ?? []).map((notification) => [text(notification.title), text(notification.topic), text(notification.priority), text(notification.readAt ? "Lida" : "Não lida"), datetime(notification.createdAt)]) }, unavailableReason: input.notifications?.length ? undefined : unavailable },
    { id: "audit", group: "Relatórios do sistema", title: "Logs de auditoria", table: { columns: [{ key: "date", label: "Data" }, { key: "user", label: "Usuário" }, { key: "action", label: "Ação" }, { key: "risk", label: "Risco" }, { key: "details", label: "Detalhes" }], rows: audit.map((item) => [datetime(item.createdAt), text(item.userName ?? item.userId), text(item.action), text(item.risk), text(item.details)]) }, unavailableReason: audit.length ? undefined : "Nenhum registro de auditoria no período." },
    { id: "backups", group: "Relatórios do sistema", title: "Backups", unavailableReason: unavailable },
    { id: "errors", group: "Relatórios do sistema", title: "Erros do sistema", unavailableReason: unavailable }
  ];
  return commonDocument({
    title: "Relatório administrativo",
    reportType: "Relatórios de clientes, financeiro, planos e sistema",
    user: input.user,
    period,
    dataUpdatedAt: new Date().toISOString(),
    sources: ["Banco persistente AlfaTec Invest Pro"],
    summary: [
      { label: "Clientes filtrados", value: number(clients.length) }, { label: "Clientes ativos", value: number(active.length) },
      { label: "Receita confirmada", value: money(totalRevenue) }, { label: "Pagamentos no período", value: number(payments.length) }
    ],
    sections
  });
}

export function filterReportSections(report: ReportDocumentData, sectionIds: string[]) {
  const selected = new Set(sectionIds);
  return { ...report, sections: report.sections.filter((section) => selected.has(section.id)) };
}
