"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bitcoin,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CalendarDays,
  History,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Gauge,
  KeyRound,
  LineChart as LineChartIcon,
  Landmark,
  Lock,
  LogOut,
  MailCheck,
  Menu,
  Moon,
  PieChart as PieChartIcon,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Target,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  Unlock,
  UserCog,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { analyzePortfolio } from "@/lib/portfolio";
import {
  assetTypeOptions,
  calculateAssetScore,
  createGeneratedAsset,
  generateAiNotes,
  getAsset,
  inferAssetType,
  isTickerLike,
  localAssets,
  normalizeTicker,
  searchAssets,
  typeLabels
} from "@/lib/market-data";
import type { Asset, AssetType, PortfolioPosition, RadarWeights } from "@/lib/types";

import {
  analisarNumeroGraham,
  aplicarPrecoNosCenarios,
  calcularCenariosGraham,
  calcularDiasRestantes,
  calcularGrahamCrescimento,
  calcularMargemSeguranca,
  calcularPotencial,
  defaultGrahamSettings,
  deriveGrahamInputs,
  grahamScoreContribution,
  type GrahamSettings
} from "@/lib/valuation/graham";
import { GrahamComparison } from "@/components/valuation/GrahamComparison";
import { GrahamExplanation } from "@/components/valuation/GrahamExplanation";
import { GrahamGrowthCard } from "@/components/valuation/GrahamGrowthCard";
import { GrahamNumberCard } from "@/components/valuation/GrahamNumberCard";
import {
  analisarAlfatecFii,
  compararFiiPorSegmento,
  defaultAlfatecFiiSettings,
  fiiConfidenceMeetsMinimum,
  normalizeAlfatecFiiSettings,
  type AlfatecFiiAnalysis,
  type AlfatecFiiSettings
} from "@/lib/analysis/alfatec-fii";
import { AlfatecFiiScoreCard } from "@/components/fii/AlfatecFiiScoreCard";
import { FiiDataSourceInfo } from "@/components/fii/FiiDataSourceInfo";
import { FiiOpportunityFilters, type FiiOpportunityFilterState } from "@/components/fii/FiiOpportunityFilters";
import { FiiScoreBreakdown } from "@/components/fii/FiiScoreBreakdown";
import { FiiSegmentComparison } from "@/components/fii/FiiSegmentComparison";
import {
  analyzeAlfatecCrypto,
  cryptoCategoryLabels,
  defaultCryptoSettings,
  normalizeCryptoSettings,
  type AlfatecCryptoAnalysis,
  type CryptoMarketSnapshot,
  type CryptoSettings
} from "@/lib/analysis/alfatec-crypto";
import { AlfatecCryptoSection } from "@/components/crypto/AlfatecCryptoSection";
import { CryptoComparison, CryptoMiniSummary, CryptoOpportunityTable, filterCryptoAnalyses } from "@/components/crypto/CryptoAnalysisTables";
import { CryptoOpportunityFilters, defaultCryptoOpportunityFilters, type CryptoOpportunityFilterState } from "@/components/crypto/CryptoOpportunityFilters";
import { MercadoPagoLinkCheckout } from "@/components/subscriptions/MercadoPagoLinkCheckout";
import { AdminSubscriptionRequests } from "@/components/subscriptions/AdminSubscriptionRequests";
import { AlfatecPortfolioMethod } from "@/components/portfolio/AlfatecPortfolioMethod";
import { CryptoQuantityInput } from "@/components/portfolio/CryptoQuantityInput";
import { PortfolioPositionsTable } from "@/components/portfolio/PortfolioPositionsTable";
import {
  CRYPTO_MAX_DECIMAL_PLACES,
  multiplyDecimalToNumber,
  validateAssetQuantity,
  validateDecimalInput
} from "@/lib/decimal/crypto-quantity";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { ReportCenter } from "@/components/reports/ReportCenter";
import { EmailHealthPanel } from "@/components/admin/EmailHealthPanel";
import { MarketDataHealthPanel } from "@/components/admin/MarketDataHealthPanel";
import { FixedIncomeCenter } from "@/components/fixed-income/FixedIncomeCenter";
import { IncomeEventsCard } from "@/components/assets/IncomeEventsCard";
import { PendingRegistrationForm, type PublicRegistrationPayload, type PublicRegistrationResult } from "@/components/auth/PendingRegistrationForm";
import { AdminPendingRegistrations } from "@/components/admin/AdminPendingRegistrations";
import { AdminIdentityEditor } from "@/components/account/AdminIdentityEditor";
import { ChangeEmailForm } from "@/components/account/ChangeEmailForm";
import { ChangeNameForm, type AccountIdentity } from "@/components/account/ChangeNameForm";
import { AssetMetricsGrid } from "@/components/assets/AssetMetricsGrid";
import { ExternalFinanceLink } from "@/components/assets/ExternalFinanceLink";
import { externalDataSourceLabel } from "@/lib/assets/external-finance-url";
import { StockOpportunityFilters } from "@/components/opportunities/StockOpportunityFilters";
import { defaultStockOpportunityFilters, filterAndSortStockOpportunities, type StockOpportunityFilterState } from "@/lib/opportunities/stock-filters";
import { DEFAULT_FREE_PLAN_LIMITS, FREE_REQUIRES_PAYMENT, FREE_TECHNICAL_DURATION_DAYS, freePlanDisplayName, freePlanLockedFeatures, freePlanPermissions, getFreePlanBenefits, getFreePlanLimits, isFreeLockedModule, isFreePlan, type FreePlanLimits } from "@/lib/plans/access";
import { isFreeExplainerModule } from "@/lib/plans/access";

type Role = "ADMIN" | "CLIENTE";
type ClientStatus = "ativo" | "pendente" | "bloqueado" | "vencido";
type PaymentStatus = "pago" | "pendente" | "vencido" | "cancelado";
type ClientModuleId = "dashboard" | "mercado" | "oportunidades" | "comparador" | "carteira" | "renda_fixa" | "alfatec_portfolio_method" | "radar" | "relatorios" | "graham_valuation" | "alfatec_fiis" | "alfatec_crypto_method" | "notificacoes" | "plano" | "configuracoes";
type AdminModuleId = "admin-dashboard" | "clientes" | "planos" | "financeiro" | "admin-relatorios" | "configuracoes";
type RangeId = "1D" | "5D" | "1M" | "6M" | "1A" | "5A" | "MAX";

type ExternalQuote = {
  ticker: string;
  exchange: string;
  providerTicker?: string;
  name: string;
  price: number;
  currency: "BRL" | "USD";
  change: number;
  changePercent: number;
  previousClose?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  marketStatus?: string;
  dataStatus?: string;
  source: string;
  sourceUrl: string;
  updatedAt: string;
  consultedAt?: string;
  isCached?: boolean;
  incomeEvents?: Asset["incomeEvents"];
  incomeSummary?: Asset["incomeSummary"];
  priceConfidence?: Asset["priceConfidence"];
  validationMessages?: string[];
  history?: Asset["priceHistory"];
};

type Plan = {
  id: string;
  name: string;
  value: number;
  durationDays: number;
  status: "ativo" | "inativo";
  permissions: ClientModuleId[];
  updatedAt?: string;
  limits?: FreePlanLimits;
  isFree?: boolean;
  requiresPayment?: boolean;
  updatedBy?: string;
  notes?: string;
};

type Account = {
  id: string;
  role: Role;
  username: string;
  email: string;
  name: string;
  phone?: string;
  passwordHash: string;
  planId?: string;
  planValue?: number;
  status: ClientStatus;
  selectedPlanName?: string;
  createdAt: string;
  dueDate?: string;
  planStartedAt?: string;
  subscriptionStatus?: "active" | "expired" | "cancelled" | "blocked";
  notes?: string;
  permissions: ClientModuleId[];
  nameChangeCount?: number;
  nameChangeHistory?: string[];
};

type Payment = {
  id: string;
  clientId: string;
  planId: string;
  value: number;
  paymentDate: string;
  dueDate: string;
  status: PaymentStatus;
  planName?: string;
  notes?: string;
  createdBy?: string;
  renewalMode?: "today" | "extend";
};

type PlanPriceHistory = {
  id: string;
  planId: string;
  planName: string;
  previousPrice: number;
  newPrice: number;
  changedByUserId: string;
  changedByName: string;
  notes?: string;
  createdAt: string;
};

type AuditLog = { id: string; action: string; userId: string; userName: string; details: string; createdAt: string; risk: "baixo" | "medio" | "alto" };

type AppStatePayload = {
  accounts: Account[];
  plans: Plan[];
  payments: Payment[];
  portfolio: PortfolioPosition[];
  planPriceHistory: PlanPriceHistory[];
  grahamSettings: GrahamSettings;
  fiiSettings: AlfatecFiiSettings;
  cryptoSettings: CryptoSettings;
  auditLogs: AuditLog[];
};

const allClientModules: ClientModuleId[] = ["dashboard", "mercado", "oportunidades", "comparador", "carteira", "renda_fixa", "alfatec_portfolio_method", "radar", "relatorios", "graham_valuation", "alfatec_fiis", "alfatec_crypto_method", "notificacoes", "plano", "configuracoes"];
const clientModules: Array<{ id: ClientModuleId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "mercado", label: "Mercado", icon: BarChart3 },
  { id: "oportunidades", label: "Oportunidades", icon: TrendingUp },
  { id: "comparador", label: "Comparador", icon: LineChartIcon },
  { id: "carteira", label: "Minha Carteira", icon: WalletCards },
  { id: "renda_fixa", label: "Renda Fixa", icon: Landmark },
  { id: "alfatec_portfolio_method", label: "Análise e Balanceamento", icon: Target },
  { id: "radar", label: "Radar IA", icon: BrainCircuit },
  { id: "relatorios", label: "Relatórios", icon: FileSpreadsheet },
  { id: "graham_valuation", label: "Valuation Graham", icon: Calculator },
  { id: "alfatec_fiis", label: "Método AlfaTec FIIs", icon: Building2 },
  { id: "alfatec_crypto_method", label: "Método AlfaTec Cripto", icon: Bitcoin },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "plano", label: "Plano", icon: WalletCards },
  { id: "configuracoes", label: "Configurações", icon: Settings }
];
const adminModules: Array<{ id: AdminModuleId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "admin-dashboard", label: "Dashboard Admin", icon: Gauge },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "planos", label: "Planos", icon: ShieldCheck },
  { id: "financeiro", label: "Financeiro", icon: CircleDollarSign },
  { id: "admin-relatorios", label: "Relatórios Admin", icon: FileSpreadsheet },
  { id: "configuracoes", label: "Configurações", icon: Settings }
];
const ranges: Array<{ id: RangeId; label: string; points: number }> = [
  { id: "1D", label: "1 Dia", points: 2 },
  { id: "5D", label: "5 Dias", points: 6 },
  { id: "1M", label: "1 Mês", points: 23 },
  { id: "6M", label: "6 Meses", points: 127 },
  { id: "1A", label: "1 Ano", points: 253 },
  { id: "5A", label: "5 Anos", points: 253 },
  { id: "MAX", label: "Máximo", points: 9999 }
];
const suggestedPlanValues: Record<string, number> = { semanal: 9.9, mensal: 24.9, anual: 199.9 };
const legacyPlanValues: Record<string, number[]> = { semanal: [49.9], mensal: [149.9], anual: [1299.9] };
const defaultPlans: Plan[] = [
  { id: "free", name: "FREE", value: 0, durationDays: FREE_TECHNICAL_DURATION_DAYS, status: "ativo", permissions: [...freePlanPermissions] as ClientModuleId[], limits: { ...DEFAULT_FREE_PLAN_LIMITS }, isFree: true, requiresPayment: FREE_REQUIRES_PAYMENT },
  { id: "semanal", name: "Semanal", value: suggestedPlanValues.semanal, durationDays: 7, status: "ativo", permissions: allClientModules },
  { id: "mensal", name: "Mensal", value: suggestedPlanValues.mensal, durationDays: 30, status: "ativo", permissions: allClientModules },
  { id: "anual", name: "Anual", value: suggestedPlanValues.anual, durationDays: 365, status: "ativo", permissions: allClientModules }
];
const starterPortfolio: PortfolioPosition[] = [];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const number = new Intl.NumberFormat("pt-BR");
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const palette = ["#14b8a6", "#38bdf8", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#64748b"];

function cls(...values: Array<string | false | undefined | null>) {
  return values.filter(Boolean).join(" ");
}
function pct(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `${percent.format(value)}%`;
}
function signedMoney(value: number) {
  if (value === 0) return money.format(0);
  return `${value > 0 ? "+" : "-"}${money.format(Math.abs(value))}`;
}
function signedPct(value: number) {
  if (value === 0) return pct(0);
  return `${value > 0 ? "+" : "-"}${percent.format(Math.abs(value))}%`;
}
function pp(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `${percent.format(value)} p.p.`;
}
function metric(value?: number, suffix = "") {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${number.format(Number(value.toFixed(value > 1000 ? 0 : 2)))}${suffix}`;
}
function dividendFrequency(asset: Asset) {
  if (asset.type === "CRIPTO") return "Sem recorrência";
  return asset.incomeSummary?.frequency ?? "Histórico indisponível";
}
function dividendPerShare(asset: Asset) {
  if (asset.type === "CRIPTO") return undefined;
  return asset.incomeSummary?.latestAmountPerUnit;
}
function annualDividendPerShare(asset: Asset) {
  if (asset.type === "CRIPTO" || !asset.incomeSummary || asset.incomeSummary.events12Months === 0) return undefined;
  return asset.incomeSummary.total12Months;
}
function comparisonScore(asset: Asset, rangeReturn: number, weights: RadarWeights) {
  const radar = calculateAssetScore(asset, weights);
  const momentum = Math.max(0, Math.min(100, 50 + rangeReturn));
  return Math.round(radar * 0.72 + momentum * 0.28);
}
function buildComparisonRecommendation(a: Asset, b: Asset, returnA: number, returnB: number, weights: RadarWeights) {
  const scoreA = comparisonScore(a, returnA, weights);
  const scoreB = comparisonScore(b, returnB, weights);
  const winner = scoreA >= scoreB ? a : b;
  const loser = scoreA >= scoreB ? b : a;
  const winnerReturn = scoreA >= scoreB ? returnA : returnB;
  const loserReturn = scoreA >= scoreB ? returnB : returnA;
  const reasons = [
    `Score combinado: ${winner.ticker} ${scoreA >= scoreB ? scoreA : scoreB}/100 contra ${scoreA >= scoreB ? scoreB : scoreA}/100.`,
    `Retorno no período selecionado: ${pct(winnerReturn)} contra ${pct(loserReturn)}.`,
    `Dividend yield: ${pct(winner.metrics.dividendYield)} e risco ${winner.risk.toLowerCase()}.`
  ];
  return { winner, loser, scoreA, scoreB, reasons };
}
function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function isExpired(dueDate?: string) {
  return Boolean(dueDate && dueDate < todayIso());
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function normalizeAccounts(accounts: Account[]) {
  return accounts.map((account) => {
    if (account.role === "ADMIN") return { ...account, permissions: allClientModules };
    const permissions = account.permissions?.length >= 7 ? allClientModules : account.permissions ?? [];
    const status = account.role === "CLIENTE" && isExpired(account.dueDate) && account.status === "ativo" ? "vencido" : account.status;
    return { ...account, permissions, status, planValue: account.planValue, planStartedAt: account.planStartedAt ?? account.createdAt };
  });
}

function normalizePlans(plans: Plan[]) {
  const source = plans.length ? plans : defaultPlans;
  return source.map((plan) => {
    const legacyValues = legacyPlanValues[plan.id] ?? [];
    const value = legacyValues.includes(plan.value) ? suggestedPlanValues[plan.id] ?? plan.value : plan.value;
    return { ...plan, value, permissions: plan.permissions.length >= 7 ? allClientModules : plan.permissions, updatedAt: plan.updatedAt ?? todayIso(), updatedBy: plan.updatedBy ?? "Sistema" };
  });
}

function normalizeGrahamSettings(settings?: Partial<GrahamSettings>): GrahamSettings {
  return { ...defaultGrahamSettings, ...(settings ?? {}) };
}

function normalizeFiiSettings(settings?: Partial<AlfatecFiiSettings>): AlfatecFiiSettings {
  return normalizeAlfatecFiiSettings(settings);
}

function mergeById<T extends { id: string }>(server: T[], local: T[]) {
  const map = new Map<string, T>();
  server.forEach((item) => map.set(item.id, item));
  local.forEach((item) => { if (!map.has(item.id)) map.set(item.id, item); });
  return Array.from(map.values());
}

function mergeAccounts(server: Account[], local: Account[]) {
  const map = new Map<string, Account>();
  server.forEach((account) => map.set(account.id, account));
  local.forEach((account) => {
    const existsById = map.has(account.id);
    const existsByEmail = Array.from(map.values()).some((item) => item.email.toLowerCase() === account.email.toLowerCase());
    if (!existsById && !existsByEmail) map.set(account.id, account);
  });
  return normalizeAccounts(Array.from(map.values()));
}

function applyPlanValuesToAccounts(accounts: Account[], plans: Plan[]) {
  return accounts.map((account) => {
    const plan = plans.find((item) => item.id === account.planId);
    return account.role === "CLIENTE" && plan ? { ...account, planValue: account.planValue ?? plan.value } : account;
  });
}

function normalizePortfolioPositions(positions: PortfolioPosition[]) {
  return positions.flatMap((position) => {
    const assetType = position.assetType ?? inferAssetType(position.ticker);
    const quantity = validateAssetQuantity(position.quantity, assetType);
    const averagePrice = validateDecimalInput(position.averagePrice, {
      maxDecimalPlaces: CRYPTO_MAX_DECIMAL_PLACES,
      fieldLabel: "O preço médio"
    });
    if (!quantity.ok || !averagePrice.ok) return [];
    return [{ ...position, quantity: quantity.value, averagePrice: averagePrice.value, assetType }];
  });
}
function mergeAppState(server: Partial<AppStatePayload>, local: AppStatePayload): AppStatePayload {
  const plans = normalizePlans(mergeById(normalizePlans(server.plans ?? []), local.plans));
  const accounts = applyPlanValuesToAccounts(mergeAccounts(normalizeAccounts(server.accounts ?? []), local.accounts), plans);
  return {
    accounts,
    plans,
    payments: mergeById(server.payments ?? [], local.payments),
    portfolio: normalizePortfolioPositions((server.portfolio?.length ? server.portfolio : local.portfolio).length ? (server.portfolio?.length ? server.portfolio : local.portfolio) : starterPortfolio),
    planPriceHistory: mergeById(server.planPriceHistory ?? [], local.planPriceHistory),
    grahamSettings: normalizeGrahamSettings(server.grahamSettings ?? local.grahamSettings),
    fiiSettings: normalizeFiiSettings(server.fiiSettings ?? local.fiiSettings),
    cryptoSettings: normalizeCryptoSettings(server.cryptoSettings ?? local.cryptoSettings),
    auditLogs: mergeById(server.auditLogs ?? [], local.auditLogs)
  };
}

function statesDiffer(a: AppStatePayload, b: Partial<AppStatePayload>) {
  return JSON.stringify(a.accounts) !== JSON.stringify(b.accounts ?? []) ||
    JSON.stringify(a.plans) !== JSON.stringify(b.plans ?? []) ||
    JSON.stringify(a.payments) !== JSON.stringify(b.payments ?? []) ||
    JSON.stringify(a.portfolio) !== JSON.stringify(b.portfolio ?? []) ||
    JSON.stringify(a.planPriceHistory) !== JSON.stringify(b.planPriceHistory ?? []) ||
    JSON.stringify(a.grahamSettings) !== JSON.stringify(b.grahamSettings ?? defaultGrahamSettings) ||
    JSON.stringify(a.fiiSettings) !== JSON.stringify(b.fiiSettings ?? defaultAlfatecFiiSettings) ||
    JSON.stringify(a.cryptoSettings) !== JSON.stringify(b.cryptoSettings ?? defaultCryptoSettings) ||
    JSON.stringify(a.auditLogs) !== JSON.stringify(b.auditLogs ?? []);
}

function planValueFor(plans: Plan[], planId?: string) {
  return plans.find((plan) => plan.id === planId)?.value ?? 0;
}
function rangeHistory(asset: Asset, range: RangeId) {
  const config = ranges.find((item) => item.id === range) ?? ranges[4];
  return asset.priceHistory.slice(-config.points);
}
function performance(history: Asset["priceHistory"]) {
  const first = history[0]?.price ?? 0;
  const last = history[history.length - 1]?.price ?? 0;
  return first > 0 ? ((last / first) - 1) * 100 : 0;
}

function assetWithScore(asset: Asset, weights: RadarWeights, grahamSettings: GrahamSettings, fiiSettings: AlfatecFiiSettings): Asset {
  if (asset.type === "FII") {
    const fii = analisarAlfatecFii(asset, fiiSettings);
    return { ...asset, score: fii.score ?? calculateAssetScore(asset, weights) };
  }
  const baseScore = calculateAssetScore(asset, weights);
  const grahamWeight = grahamSettings.enabled ? Math.min(15, Math.max(0, grahamSettings.scoreWeight)) : 0;
  const graham = grahamScoreContribution(asset, grahamWeight);
  return { ...asset, score: Math.min(100, Math.round(baseScore + graham)) };
}


function fiiNumeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function passesFiiFilters(analysis: AlfatecFiiAnalysis, filters: FiiOpportunityFilterState) {
  if (filters.minScore > 0 && ((analysis.score ?? -Infinity) < filters.minScore)) return false;
  if (filters.kind !== "todos" && analysis.kind !== filters.kind) return false;
  if (filters.segment && analysis.segment !== filters.segment) return false;
  const pvp = fiiNumeric(analysis.pvp.value);
  if (filters.maxPvp > 0 && (pvp === undefined || pvp > filters.maxPvp)) return false;
  const dy = fiiNumeric(analysis.recurrentDividendYield.value);
  if (filters.minDy > 0 && (dy === undefined || dy < filters.minDy)) return false;
  const premium = fiiNumeric(analysis.riskPremium.value);
  if (filters.minRiskPremium > 0 && (premium === undefined || premium < filters.minRiskPremium)) return false;
  const liquidity = fiiNumeric(analysis.liquidity.value);
  if (filters.minLiquidity > 0 && (liquidity === undefined || liquidity < filters.minLiquidity)) return false;
  const vacancy = fiiNumeric(analysis.vacancy.value);
  if (filters.maxVacancy > 0 && analysis.vacancy.status !== "nao_aplicavel" && (vacancy === undefined || vacancy > filters.maxVacancy)) return false;
  if (filters.minimumConfidence !== "Todas" && !fiiConfidenceMeetsMinimum(analysis.confidence, filters.minimumConfidence)) return false;
  if (filters.sustainableOnly && !["sustentavel", "aparentemente sustentavel"].includes(analysis.incomeQuality)) return false;
  return true;
}

const defaultFiiFilters: FiiOpportunityFilterState = {
  minScore: 0,
  kind: "todos",
  segment: "",
  maxPvp: 0,
  minDy: 0,
  minRiskPremium: 0,
  minLiquidity: 0,
  maxVacancy: 0,
  minimumConfidence: "Todas",
  sustainableOnly: false
};

function passesRadarFilters(asset: Asset, filters: { grahamOnly: boolean; minMargin: number; minPotential: number; maxPl: number; maxPvp: number; minLiquidity: number; minRoe: number; maxDebt: number }) {
  const graham = analisarNumeroGraham(asset);
  const inputs = deriveGrahamInputs(asset);
  if (!inputs.lpa || inputs.lpa <= 0 || !inputs.vpa || inputs.vpa <= 0) return false;
  if (filters.grahamOnly && (!graham.applicable || (graham.difference ?? 0) <= 0)) return false;
  if (filters.minMargin > 0 && (!graham.applicable || (graham.safetyMargin ?? -Infinity) < filters.minMargin)) return false;
  if (filters.minPotential > 0 && (!graham.applicable || (graham.potential ?? -Infinity) < filters.minPotential)) return false;
  if (filters.maxPl > 0 && (asset.metrics.pl ?? Infinity) > filters.maxPl) return false;
  if (filters.maxPvp > 0 && (asset.metrics.pvp ?? Infinity) > filters.maxPvp) return false;
  if (filters.minLiquidity > 0 && asset.liquidity < filters.minLiquidity) return false;
  if (filters.minRoe > 0 && (asset.metrics.roe ?? -Infinity) < filters.minRoe) return false;
  if (filters.maxDebt > 0 && (asset.metrics.debtToEquity ?? 0) > filters.maxDebt) return false;
  return true;
}

function addDaysToDate(baseDate: string | undefined, days: number) {
  const base = baseDate ? new Date(baseDate + "T00:00:00") : new Date();
  if (Number.isNaN(base.getTime())) return addDays(days);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function planVisualStatus(client: Account) {
  if (client.status === "bloqueado") return { label: "Bloqueado", detail: "Plano bloqueado pelo administrador." };
  if (client.status === "pendente") return { label: "Pendente", detail: "Aguardando liberação do administrador." };
  const days = calcularDiasRestantes(client.dueDate ?? todayIso());
  if (client.status === "vencido" || isExpired(client.dueDate)) return { label: "Vencido", detail: "Plano expirado e acesso bloqueado." };
  if (days === 0) return { label: "Vence hoje", detail: "Último dia de acesso." };
  if (days <= 7) return { label: "Vencimento próximo", detail: `Seu plano vence em ${days} dia${days === 1 ? "" : "s"}.` };
  return { label: "Ativo", detail: "Plano válido e com dias restantes." };
}

function planAlertText(client: Account) {
  if (!client.dueDate) return "Vencimento não informado.";
  if (client.status === "bloqueado") return "Seu plano está bloqueado. Entre em contato com o administrador.";
  if (isExpired(client.dueDate) || client.status === "vencido") return "Seu plano está vencido. Entre em contato com o administrador para renovar.";
  const days = calcularDiasRestantes(client.dueDate);
  if (days === 7) return "Seu plano vence em 7 dias.";
  if (days === 3) return "Seu plano vence em 3 dias.";
  if (days === 1) return "Seu plano vence amanhã.";
  if (days === 0) return "Seu plano vence hoje.";
  if (days < 7) return `Seu plano vence em ${days} dias.`;
  return "";
}

function buildComparison(assetA: Asset, assetB: Asset, range: RangeId) {
  const a = rangeHistory(assetA, range);
  const b = rangeHistory(assetB, range);
  const len = Math.min(a.length, b.length);
  const baseA = a[0]?.price ?? assetA.price;
  const baseB = b[0]?.price ?? assetB.price;
  return Array.from({ length: len }, (_, index) => {
    const pa = a[index]?.price ?? baseA;
    const pb = b[index]?.price ?? baseB;
    return {
      label: a[index]?.label ?? `D-${len - index}`,
      [assetA.ticker]: baseA > 0 ? Number((((pa / baseA) - 1) * 100).toFixed(2)) : 0,
      [assetB.ticker]: baseB > 0 ? Number((((pb / baseB) - 1) * 100).toFixed(2)) : 0,
      volumeA: a[index]?.volume ?? 0,
      volumeB: b[index]?.volume ?? 0
    };
  });
}
function buildAssetMap(extraAssets: Asset[]) {
  const map = new Map<string, Asset>();
  [...localAssets, ...extraAssets].forEach((asset) => map.set(asset.ticker, asset));
  return Array.from(map.values());
}
function quoteToAsset(quote: ExternalQuote, previousAsset?: Asset): Asset {
  const base = previousAsset ?? createGeneratedAsset(quote.ticker);
  const previous = quote.previousClose ?? Math.max(0.01, quote.price - (quote.change ?? 0));
  const history = quote.history?.length ? quote.history : [
    ...base.priceHistory.slice(0, -2),
    { label: "Anterior", price: Number(previous.toFixed(2)), volume: quote.volume ?? base.liquidity },
    { label: "Hoje", price: quote.price, volume: quote.volume ?? base.liquidity }
  ];
  const asset: Asset = {
    ...base,
    name: quote.name || base.name,
    price: quote.price,
    currency: quote.currency,
    changeDay: quote.changePercent ?? base.changeDay,
    market: quote.exchange === "BVMF" ? "B3" : quote.exchange,
    liquidity: quote.volume ?? base.liquidity,
    priceHistory: history,
    summary: quote.ticker + " usa preco real retornado por " + quote.source + ". Ticker consultado: " + (quote.providerTicker ?? quote.ticker) + ".",
    updatedAt: quote.updatedAt,
    source: "external",
    sourceLabel: quote.source,
    sourceUrl: quote.sourceUrl,
    providerTicker: quote.providerTicker,
    marketStatus: quote.marketStatus,
    dataStatus: quote.dataStatus,
    isCached: quote.isCached,
    lastUpdatedAt: quote.updatedAt,
    consultedAt: quote.consultedAt,
    previousClose: quote.previousClose,
    open: quote.open,
    dayHigh: quote.dayHigh,
    dayLow: quote.dayLow,
    incomeEvents: quote.incomeEvents,
    incomeSummary: quote.incomeSummary,
    priceConfidence: quote.priceConfidence,
    validationMessages: quote.validationMessages
  };
  asset.score = quote.priceConfidence === "low" || quote.priceConfidence === "insufficient" ? (previousAsset?.score ?? base.score) : calculateAssetScore(asset);
  return asset;
}

function passwordChecks(value: string) {
  return [
    { id: "length", label: "Mínimo 12 caracteres", valid: value.length >= 12 },
    { id: "letters", label: "Letras", valid: /[A-Za-z]/.test(value) },
    { id: "number", label: "Número", valid: /\d/.test(value) },
    { id: "special", label: "Caractere especial", valid: /[^A-Za-z0-9]/.test(value) }
  ];
}
function isStrongPassword(value: string) {
  return passwordChecks(value).every((item) => item.valid);
}
function passwordRequirementMessage() {
  return "A senha precisa ter mínimo de 12 caracteres, letras, número e caractere especial.";
}


export default function AlfatecInvestPro() {
  const [darkMode, setDarkMode] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [planPriceHistory, setPlanPriceHistory] = useState<PlanPriceHistory[]>([]);
  const [grahamSettings, setGrahamSettings] = useState<GrahamSettings>(defaultGrahamSettings);
  const [fiiSettings, setFiiSettings] = useState<AlfatecFiiSettings>(defaultAlfatecFiiSettings);
  const [cryptoSettings, setCryptoSettings] = useState<CryptoSettings>(defaultCryptoSettings);
  const [cryptoSnapshots, setCryptoSnapshots] = useState<Record<string, CryptoMarketSnapshot>>({});
  const [cryptoTicker, setCryptoTicker] = useState("BTC");
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [cryptoError, setCryptoError] = useState("");
  const [cryptoFilters, setCryptoFilters] = useState<CryptoOpportunityFilterState>(defaultCryptoOpportunityFilters);
  const [radarCryptoFilters, setRadarCryptoFilters] = useState<CryptoOpportunityFilterState>({ ...defaultCryptoOpportunityFilters, minScore: 60, maxRisk: 75 });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerMessage, setRegisterMessage] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("Invest@2026!");
  const [databaseError, setDatabaseError] = useState("");
  const [clientModule, setClientModule] = useState<ClientModuleId>("dashboard");
  const [upgradeResource, setUpgradeResource] = useState<"comparador" | "radar" | null>(null);
  const [adminModule, setAdminModule] = useState<ClientModuleId | AdminModuleId>("admin-dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const [marketSearch, setMarketSearch] = useState("");
  const [marketType, setMarketType] = useState<AssetType | "TODOS">("TODOS");
  const [selectedAsset, setSelectedAsset] = useState<Asset>(() => getAsset("GARE11"));
  const [extraAssets, setExtraAssets] = useState<Asset[]>([]);
  const [favorites, setFavorites] = useState<string[]>(["GARE11", "PETR4", "BTC"]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(starterPortfolio);
  const [portfolioTickerInput, setPortfolioTickerInput] = useState("");
  const [portfolioQuantityInput, setPortfolioQuantityInput] = useState("");
  const [portfolioAveragePriceInput, setPortfolioAveragePriceInput] = useState("");
  const [portfolioFormError, setPortfolioFormError] = useState("");
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [range, setRange] = useState<RangeId>("1A");
  const [assetA, setAssetA] = useState<Asset>(() => getAsset("GARE11"));
  const [assetB, setAssetB] = useState<Asset>(() => getAsset("PETR4"));
  const [searchA, setSearchA] = useState("GARE11");
  const [searchB, setSearchB] = useState("PETR4");
  const [weights, setWeights] = useState<RadarWeights>({ dividendYield: 22, valuation: 22, quality: 22, growth: 14, liquidity: 10, risk: 10 });
  const [grahamSearch, setGrahamSearch] = useState("PETR4");
  const [grahamAsset, setGrahamAsset] = useState<Asset>(() => getAsset("PETR4"));
  const [grahamGrowth, setGrahamGrowth] = useState(8);
  const [grahamY, setGrahamY] = useState(defaultGrahamSettings.defaultY);
  const [fiiSearch, setFiiSearch] = useState("GARE11");
  const [fiiAsset, setFiiAsset] = useState<Asset>(() => getAsset("GARE11"));
  const [fiiFilters, setFiiFilters] = useState<FiiOpportunityFilterState>(defaultFiiFilters);
  const [radarFiiFilters, setRadarFiiFilters] = useState<FiiOpportunityFilterState>({ ...defaultFiiFilters, minScore: 70, minimumConfidence: "Baixa" });
  const [opportunityCategory, setOpportunityCategory] = useState<"ACAO" | "FII" | "CRIPTO">("ACAO");
  const [stockOpportunityFilters, setStockOpportunityFilters] = useState<StockOpportunityFilterState>(defaultStockOpportunityFilters);
  const [radarGrahamOnly, setRadarGrahamOnly] = useState(false);
  const [radarMinMargin, setRadarMinMargin] = useState(0);
  const [radarMinPotential, setRadarMinPotential] = useState(0);
  const [radarMaxPl, setRadarMaxPl] = useState(25);
  const [radarMaxPvp, setRadarMaxPvp] = useState(3);
  const [radarMinLiquidity, setRadarMinLiquidity] = useState(0);
  const [radarMinRoe, setRadarMinRoe] = useState(0);
  const [radarMaxDebt, setRadarMaxDebt] = useState(3);
  const [settings, setSettings] = useState({ currency: "BRL", language: "pt-BR", autoUpdate: true, priceAlerts: true, dividendAlerts: true });
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [marketQuoteStatus, setMarketQuoteStatus] = useState<"idle" | "loading" | "error">("idle");
  const [marketQuoteMessage, setMarketQuoteMessage] = useState("");
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const [stateLoaded, setStateLoaded] = useState(false);

  const assets = useMemo(() => buildAssetMap(extraAssets), [extraAssets]);
  const portfolioAnalysis = useMemo(() => analyzePortfolio(portfolio, assets), [portfolio, assets]);
  const portfolioInputType = useMemo(() => inferAssetType(portfolioTickerInput), [portfolioTickerInput]);
  const portfolioDividendCycle = useMemo(() => portfolioAnalysis.lines.reduce((sum, line) => sum + multiplyDecimalToNumber(line.quantity, dividendPerShare(line.asset) ?? 0), 0), [portfolioAnalysis.lines]);
  const marketResults = useMemo(() => searchAssets(marketSearch, marketType, assets, { includeDynamic: false }), [marketSearch, marketType, assets]);
  const rankedAssets = useMemo(() => [...assets].map((asset) => assetWithScore(asset, weights, grahamSettings, fiiSettings)).sort((a, b) => b.score - a.score), [assets, weights, grahamSettings, fiiSettings]);
  const stockOpportunityAssets = useMemo(
    () => filterAndSortStockOpportunities(rankedAssets, stockOpportunityFilters, favorites),
    [rankedAssets, stockOpportunityFilters, favorites]
  );
  const stockOpportunitySectors = useMemo(
    () => Array.from(new Set(rankedAssets.filter((asset) => asset.type === "ACAO").map((asset) => asset.sector))).sort(),
    [rankedAssets]
  );
  const stockOpportunitySegments = useMemo(
    () => Array.from(new Set(rankedAssets.filter((asset) => asset.type === "ACAO").map((asset) => asset.segment))).sort(),
    [rankedAssets]
  );  const radarAssets = useMemo(() => rankedAssets.filter((asset) => asset.type !== "FII" && asset.type !== "CRIPTO" && passesRadarFilters(asset, { grahamOnly: radarGrahamOnly, minMargin: radarMinMargin, minPotential: radarMinPotential, maxPl: radarMaxPl, maxPvp: radarMaxPvp, minLiquidity: radarMinLiquidity, minRoe: radarMinRoe, maxDebt: radarMaxDebt })), [rankedAssets, radarGrahamOnly, radarMinMargin, radarMinPotential, radarMaxPl, radarMaxPvp, radarMinLiquidity, radarMinRoe, radarMaxDebt]);
  const fiiAnalyses = useMemo(() => assets.filter((asset) => asset.type === "FII").map((asset) => ({ asset, analysis: analisarAlfatecFii(asset, fiiSettings) })), [assets, fiiSettings]);
  const fiiSegments = useMemo(() => Array.from(new Set(fiiAnalyses.map((item) => item.asset.segment))).sort(), [fiiAnalyses]);
  const fiiOpportunityAnalyses = useMemo(() => fiiAnalyses.filter((item) => passesFiiFilters(item.analysis, fiiFilters)).sort((a, b) => (b.analysis.score ?? -Infinity) - (a.analysis.score ?? -Infinity)), [fiiAnalyses, fiiFilters]);
  const radarFiiAnalyses = useMemo(() => fiiAnalyses.filter((item) => passesFiiFilters(item.analysis, radarFiiFilters)).sort((a, b) => (b.analysis.score ?? -Infinity) - (a.analysis.score ?? -Infinity)), [fiiAnalyses, radarFiiFilters]);
  const cryptoAnalyses = useMemo(() => Object.values(cryptoSnapshots).map((snapshot) => analyzeAlfatecCrypto(snapshot, cryptoSettings)), [cryptoSnapshots, cryptoSettings]);
  const selectedCryptoAnalysis = useMemo(() => cryptoAnalyses.find((item) => item.ticker === cryptoTicker) ?? null, [cryptoAnalyses, cryptoTicker]);
  const cryptoOpportunityAnalyses = useMemo(() => filterCryptoAnalyses(cryptoAnalyses, cryptoFilters), [cryptoAnalyses, cryptoFilters]);
  const radarCryptoAnalyses = useMemo(() => filterCryptoAnalyses(cryptoAnalyses, radarCryptoFilters), [cryptoAnalyses, radarCryptoFilters]);
  const cryptoFilterCategories = useMemo(() => Array.from(new Map(cryptoAnalyses.map((item) => [item.category, { value: item.category, label: cryptoCategoryLabels[item.category] }])).values()), [cryptoAnalyses]);
  const currentUser = useMemo(() => accounts.find((account) => account.id === sessionId) ?? null, [accounts, sessionId]);
  const currentPlan = useMemo(() => plans.find((plan) => plan.id === currentUser?.planId), [plans, currentUser?.planId]);
  const isFreeUser = currentUser?.role === "CLIENTE" && isFreePlan(currentUser.planId, currentPlan?.name);
  const currentFreeLimits = getFreePlanLimits(currentPlan);
  const clients = useMemo(() => accounts.filter((account) => account.role === "CLIENTE"), [accounts]);
  const financial = useMemo(() => buildFinancialSummary(clients, plans, payments), [clients, plans, payments]);
  const freeClients = useMemo(() => clients.filter((client) => isFreePlan(client.planId, String(client.selectedPlanName || ""))), [clients]);
  const paidClients = useMemo(() => clients.filter((client) => client.planId && !isFreePlan(client.planId, String(client.selectedPlanName || ""))), [clients]);
  const newFreeClients = useMemo(() => freeClients.filter((client) => Date.parse(client.createdAt) >= Date.now() - 30 * 24 * 60 * 60 * 1000), [freeClients]);
  const freeUpgrades = useMemo(() => auditLogs.filter((entry) => entry.action === "upgrade_free_pago").length, [auditLogs]);
  const freeConversionBase = freeClients.length + freeUpgrades;
  const paidConversionRate = freeConversionBase > 0 ? freeUpgrades / freeConversionBase * 100 : 0;
  const globalSuggestions = useMemo(() => searchAssets(globalSearch, "TODOS", assets).slice(0, 8), [globalSearch, assets]);
  const comparison = useMemo(() => buildComparison(assetA, assetB, range), [assetA, assetB, range]);
  const returnA = performance(rangeHistory(assetA, range));
  const returnB = performance(rangeHistory(assetB, range));
  const comparisonRecommendation = useMemo(() => buildComparisonRecommendation(assetA, assetB, returnA, returnB, weights), [assetA, assetB, returnA, returnB, weights]);
  const allowedClientModules = currentUser?.role === "CLIENTE"
    ? clientModules
        .filter((item) => currentUser.permissions.includes(item.id) || (isFreeUser && isFreeLockedModule(item.id)))
        .map((item) => ({ ...item, locked: Boolean(isFreeUser && isFreeLockedModule(item.id)) }))
    : clientModules;
  const adminNavigationModules = useMemo(() => [
    ...clientModules.map((item) => ({ ...item, group: "Área do cliente" })),
    ...adminModules
      .filter((item) => !allClientModules.includes(item.id as ClientModuleId))
      .map((item) => ({ ...item, group: "Administração" }))
  ], []);

  function currentSnapshot(): AppStatePayload {
    return { accounts, plans, payments, portfolio, planPriceHistory, grahamSettings, fiiSettings, cryptoSettings, auditLogs };
  }

  function localSnapshot(): AppStatePayload {
    return {
      accounts: [],
      plans: normalizePlans(defaultPlans),
      payments: [],
      portfolio: starterPortfolio,
      planPriceHistory: [],
      grahamSettings: normalizeGrahamSettings(safeParse<Partial<GrahamSettings>>(window.localStorage.getItem("alfatec-graham-settings"), defaultGrahamSettings)),
      fiiSettings: normalizeFiiSettings(safeParse<Partial<AlfatecFiiSettings>>(window.localStorage.getItem("alfatec-fii-settings"), defaultAlfatecFiiSettings)),
      cryptoSettings: normalizeCryptoSettings(safeParse<Partial<CryptoSettings>>(window.localStorage.getItem("alfatec-crypto-settings"), defaultCryptoSettings)),
      auditLogs: safeParse<AuditLog[]>(window.localStorage.getItem("alfatec-audit-logs"), [])
    };
  }

  async function persistAppState(snapshot: AppStatePayload) {
    const response = await fetch("/api/app-state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error ?? "Não foi possível salvar os dados no banco.");
    }
    setDatabaseError("");
  }

  async function loadAppState(baseState: AppStatePayload) {
    const response = await fetch("/api/app-state", { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error ?? "Banco de dados indisponível.");
    }
    const serverState = await response.json() as Partial<AppStatePayload>;
    const merged = mergeAppState(serverState, baseState);
    setAccounts(merged.accounts);
    setPlans(merged.plans);
    setPayments(merged.payments);
    setPortfolio(merged.portfolio.length ? merged.portfolio : starterPortfolio);
    setPlanPriceHistory(merged.planPriceHistory);
    setGrahamSettings(merged.grahamSettings);
    setFiiSettings(merged.fiiSettings);
    setCryptoSettings(merged.cryptoSettings);
    setAuditLogs(merged.auditLogs);
    setStateLoaded(true);
    setDatabaseError("");
    return merged;
  }

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("alfatec-theme");
    if (savedTheme) setDarkMode(savedTheme === "dark");

    let cancelled = false;
    async function loadState() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionData = await sessionResponse.json().catch(() => ({ user: null }));
        const merged = await loadAppState(localSnapshot());
        if (cancelled) return;
        if (sessionResponse.ok && sessionData.user?.id) setSessionId(sessionData.user.id);
        setAccounts(merged.accounts);
        setPlans(merged.plans);
        setPayments(merged.payments);
        setPortfolio(merged.portfolio.length ? merged.portfolio : starterPortfolio);
        setPlanPriceHistory(merged.planPriceHistory);
        setGrahamSettings(merged.grahamSettings);
        setFiiSettings(merged.fiiSettings);
        setCryptoSettings(merged.cryptoSettings);
            setAuditLogs(merged.auditLogs);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Banco de dados indisponivel.";
        console.error("Banco de dados indisponivel", error);
        if (cancelled) return;
        const localState = localSnapshot();
        setAccounts([]);
        setPlans(localState.plans);
        setPayments([]);
        setPortfolio(starterPortfolio);
        setPlanPriceHistory([]);
        setGrahamSettings(localState.grahamSettings);
        setFiiSettings(localState.fiiSettings);
        setCryptoSettings(localState.cryptoSettings);
        setAuditLogs([]);
        setDatabaseError(message);
        setStateLoaded(true);
      }
    }

    void loadState();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!stateLoaded || !sessionId) return;
    const snapshot: AppStatePayload = { accounts, plans, payments, portfolio, planPriceHistory, grahamSettings, fiiSettings, cryptoSettings, auditLogs };
    const timeout = window.setTimeout(() => {
      void persistAppState(snapshot).catch((error) => setDatabaseError(error instanceof Error ? error.message : "Erro ao salvar no banco."));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [stateLoaded, accounts, plans, payments, portfolio, planPriceHistory, grahamSettings, fiiSettings, cryptoSettings, auditLogs]);

  useEffect(() => window.localStorage.setItem("alfatec-theme", darkMode ? "dark" : "light"), [darkMode]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("menu") as ClientModuleId | null;
    if (requested && allClientModules.includes(requested)) {
      if (isFreeUser && isFreeLockedModule(requested)) {
        if (isFreeExplainerModule(requested)) {
          setUpgradeResource(null); setClientModule(requested); return;
        }
        setUpgradeResource(requested as "comparador" | "radar");
        setClientModule("plano"); return;
      }
      if (currentUser?.role === "CLIENTE" && !currentUser.permissions.includes(requested)) { setUpgradeResource(null); setClientModule("plano"); return; }
      setClientModule(requested);
      if (currentUser?.role === "ADMIN") setAdminModule(requested);
    }
  }, [currentUser?.role, isFreeUser]);
  useEffect(() => {
    const openReports = () => {
      setClientModule("relatorios");
      if (currentUser?.role === "ADMIN") setAdminModule("relatorios");
    };
    window.addEventListener("alfatec:open-reports", openReports);
    return () => window.removeEventListener("alfatec:open-reports", openReports);
  }, [currentUser?.role, isFreeUser]);
  useEffect(() => setGrahamY(grahamSettings.defaultY), [grahamSettings.defaultY]);
  async function refreshTicker(tickerInput: string, options: { select?: boolean; silent?: boolean; signal?: AbortSignal } = {}) {
    const clean = normalizeTicker(tickerInput);
    if (!isTickerLike(clean)) return null;
    if (!options.silent) { setMarketQuoteStatus("loading"); setMarketQuoteMessage("Atualizando..."); }
    try {
      const response = await fetch("/api/quotes/market?ticker=" + encodeURIComponent(clean) + "&range=1y&interval=1d", { signal: options.signal });
      const data = await response.json();
      if (options.signal?.aborted) return null;
      if (!response.ok) throw new Error(data?.error ?? "Dado indisponível");
      const previous = assets.find((item) => item.ticker === clean);
      const asset = quoteToAsset(data as ExternalQuote, previous);
      setExtraAssets((current) => [asset, ...current.filter((item) => item.ticker !== asset.ticker)]);
      if (options.select || selectedAsset.ticker === asset.ticker) setSelectedAsset(asset);
      if (assetA.ticker === asset.ticker) setAssetA(asset);
      if (assetB.ticker === asset.ticker) setAssetB(asset);
      if (!options.silent) { setMarketQuoteStatus("idle"); setMarketQuoteMessage((asset.dataStatus ?? "Dados atualizados.") + " Fonte: " + (asset.sourceLabel ?? "Yahoo Finance")); }
      return asset;
    } catch (error) {
      if (options.signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) return null;
      if (!options.silent) { setMarketQuoteStatus("error"); setMarketQuoteMessage(error instanceof Error ? error.message : "Dado indisponível"); }
      return null;
    }
  }

  async function refreshVisibleMarket(options: { silent?: boolean } = {}) {
    const tickers = Array.from(new Set([selectedAsset.ticker, assetA.ticker, assetB.ticker, grahamAsset.ticker, fiiAsset.ticker, ...portfolio.map((item) => item.ticker), ...marketResults.slice(0, 20).map((asset) => asset.ticker)])).slice(0, 24);
    setRefreshingMarket(true);
    await Promise.all(tickers.map((ticker) => refreshTicker(ticker, { silent: options.silent })));
    setRefreshingMarket(false);
    if (!options.silent) setMarketQuoteMessage("Dados atualizados.");
  }

  useEffect(() => {
    const clean = normalizeTicker(marketSearch);
    if (!isTickerLike(clean)) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => { void refreshTicker(clean, { select: false, signal: controller.signal }); }, 450);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [marketSearch]);

  useEffect(() => {
    void refreshVisibleMarket({ silent: true });
    const interval = window.setInterval(() => { if (settings.autoUpdate) void refreshVisibleMarket({ silent: true }); }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [settings.autoUpdate, portfolio.length, selectedAsset.ticker]);

  useEffect(() => {
    if (!stateLoaded) return;
    void loadCryptoData(["BTC", "ETH", "SOL", "BNB", "LINK", "AAVE", "USDC", "DOGE"]);
  }, [stateLoaded]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    if (!loginUser.trim() || !loginPassword) {
      setLoginError("Informe nome, usuario/e-mail e senha.");
      return;
    }
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginUser.trim(), password: loginPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Usuario ou senha invalidos.");
      const merged = await loadAppState(localSnapshot());
      setAccounts(merged.accounts);
      setSessionId(data.user.id);
      setClientModule("dashboard");
      setAdminModule("admin-dashboard");
      setDatabaseError("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Nao foi possivel entrar.");
    }
  }

  async function requestAccount(payload: PublicRegistrationPayload): Promise<PublicRegistrationResult> {
    setRegisterMessage("");
    setLoginError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const failure = data?.error ?? "Não foi possível criar a conta.";
        setRegisterMessage(failure);
        return { ok: false, message: failure };
      }
      const success = data.message ?? "Conta criada. Verifique seu e-mail para continuar.";
      setRegisterMessage(success);
      return { ok: true, message: success, emailStatus: data.emailStatus };
    } catch (error) {
      const failure = error instanceof Error ? error.message : "Não foi possível criar a conta.";
      setRegisterMessage(failure);
      return { ok: false, message: failure };
    }
  }
  function logout() {
    void fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      setSessionId(null);
      setAccounts([]);
      setPayments([]);
      setAuditLogs([]);
      setLoginPassword("");
      void loadAppState(localSnapshot()).catch(() => undefined);
    });
  }

  function handleAdminMenu(id: string) {
    setGlobalSearch("");
    setAdminModule(id as ClientModuleId | AdminModuleId);
    if (allClientModules.includes(id as ClientModuleId)) setClientModule(id as ClientModuleId);
  }

  function resolveAssetFromSearch(value: string) {
    const clean = normalizeTicker(value);
    const suggestions = searchAssets(value, "TODOS", assets);
    const asset = assets.find((item) => item.ticker === clean) ?? suggestions[0] ?? (isTickerLike(clean) ? createGeneratedAsset(clean) : undefined);
    if (asset?.source === "generated" && !extraAssets.some((item) => item.ticker === asset.ticker)) setExtraAssets((current) => [asset, ...current]);
    return asset;
  }

  function selectAsset(asset: Asset, module: ClientModuleId = "mercado") {
    setSelectedAsset(asset);
    setClientModule(module);
    if (currentUser?.role === "ADMIN") setAdminModule(module);
    setSearchHistory((current) => [asset.ticker, ...current.filter((ticker) => ticker !== asset.ticker)].slice(0, 8));
    if (asset.source === "generated" && !extraAssets.some((item) => item.ticker === asset.ticker)) setExtraAssets((current) => [asset, ...current]);
  }

  function addAssetToPortfolio(asset: Asset) {
    if (isFreeUser && portfolio.length >= currentFreeLimits.portfolio) {
      setPortfolioFormError(`Seu Plano Gratuito permite cadastrar até ${currentFreeLimits.portfolio} ativos. Faça upgrade para cadastrar ativos ilimitados.`);
      setClientModule("carteira");
      return;
    }
    setPortfolio((current) => [{ id: crypto.randomUUID(), ticker: asset.ticker, quantity: "1", averagePrice: String(asset.price), assetType: asset.type, broker: "Manual", purchaseDate: todayIso() }, ...current]);
    setPortfolioFormError("");
  }
  function addPortfolioPosition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isFreeUser && portfolio.length >= currentFreeLimits.portfolio) {
      setPortfolioFormError(`Seu Plano Gratuito permite cadastrar até ${currentFreeLimits.portfolio} ativos. Faça upgrade para cadastrar ativos ilimitados.`);
      return;
    }
    const formData = new FormData(event.currentTarget);
    const ticker = normalizeTicker(portfolioTickerInput);
    const broker = String(formData.get("broker") ?? "").trim() || "Não informada";
    const purchaseDate = String(formData.get("purchaseDate") ?? "") || todayIso();
    if (!ticker) {
      setPortfolioFormError("Informe o ticker do ativo.");
      return;
    }
    const asset = resolveAssetFromSearch(ticker);
    if (!asset) {
      setPortfolioFormError("Ativo não encontrado.");
      return;
    }
    const quantity = validateAssetQuantity(portfolioQuantityInput, asset.type);
    if (!quantity.ok) {
      setPortfolioFormError(quantity.error);
      return;
    }
    const averagePrice = validateDecimalInput(portfolioAveragePriceInput, {
      maxDecimalPlaces: CRYPTO_MAX_DECIMAL_PLACES,
      fieldLabel: "O preço médio"
    });
    if (!averagePrice.ok) {
      setPortfolioFormError(averagePrice.error);
      return;
    }
    setPortfolio((current) => [{
      id: crypto.randomUUID(),
      ticker: asset.ticker,
      quantity: quantity.value,
      averagePrice: averagePrice.value,
      assetType: asset.type,
      broker,
      purchaseDate
    }, ...current]);
    setPortfolioTickerInput("");
    setPortfolioQuantityInput("");
    setPortfolioAveragePriceInput("");
    setPortfolioFormError("");
    event.currentTarget.reset();
  }
  async function addClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    if (!isStrongPassword(password)) { alert(passwordRequirementMessage()); return; }
    const payload = { name: String(formData.get("name") ?? "").trim(), email: String(formData.get("email") ?? "").trim(), phone: String(formData.get("phone") ?? "").trim(), password, planId: String(formData.get("planId") ?? "mensal"), dueDate: String(formData.get("dueDate") ?? "") || undefined, notes: String(formData.get("notes") ?? "").trim() };
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Nao foi possivel cadastrar o cliente.");
      const merged = await loadAppState(currentSnapshot());
      setAccounts(merged.accounts);
      setSelectedClientId(data.user?.id ?? null);
      setNewClientPassword("Invest@2026!");
      form.reset();
    } catch (error) { alert(error instanceof Error ? error.message : "Nao foi possivel cadastrar o cliente."); }
  }

  function updateClient(id: string, patch: Partial<Account>) {
    setAccounts((current) => current.map((account) => account.id === id ? { ...account, ...patch } : account));
  }

  function changeClientPlan(client: Account, planId: string) {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) return;
    const previousPlan = plans.find((item) => item.id === client.planId);
    const movingFromFreeToPaid = isFreePlan(previousPlan?.id, previousPlan?.name) && !isFreePlan(plan.id, plan.name);
    const movingToFree = isFreePlan(plan.id, plan.name);
    updateClient(client.id, {
      planId,
      planValue: plan.value,
      selectedPlanName: movingToFree ? freePlanDisplayName(plan.name) : plan.name,
      planStartedAt: todayIso(),
      dueDate: movingToFree ? undefined : addDays(plan.durationDays),
      subscriptionStatus: "active",
      status: "ativo",
      permissions: plan.permissions
    });
    logAudit(movingFromFreeToPaid ? "upgrade_free_pago" : "alteracao_plano_cliente", `${client.name}: ${previousPlan?.name || "sem plano"} para ${movingToFree ? freePlanDisplayName(plan.name) : plan.name}.`, "medio");
  }


  function logAudit(action: string, details: string, risk: AuditLog["risk"] = "baixo") {
    if (!currentUser) return;
    setAuditLogs((current) => [{ id: crypto.randomUUID(), action, userId: currentUser.id, userName: currentUser.name, details, createdAt: new Date().toISOString(), risk }, ...current].slice(0, 250));
  }

  function updateOfficialPlan(planId: string, patch: Partial<Plan>, notes = "") {
    const previous = plans.find((item) => item.id === planId);
    if (!previous) return;
    const next: Plan = { ...previous, ...patch, updatedAt: new Date().toISOString(), updatedBy: currentUser?.name ?? "Admin" };
    setPlans((current) => current.map((item) => item.id === planId ? next : item));
    if (patch.value !== undefined && patch.value !== previous.value) {
      setPlanPriceHistory((current) => [{ id: crypto.randomUUID(), planId, planName: previous.name, previousPrice: previous.value, newPrice: patch.value ?? previous.value, changedByUserId: currentUser?.id ?? "admin", changedByName: currentUser?.name ?? "Admin", notes, createdAt: new Date().toISOString() }, ...current]);
      logAudit("alteracao_preco_plano", `Plano ${previous.name}: ${money.format(previous.value)} para ${money.format(patch.value ?? previous.value)}.`, "alto");
    } else {
      logAudit("alteracao_plano", `Plano ${previous.name} atualizado.`, "medio");
    }
  }

  function saveGrahamSettings(patch: Partial<GrahamSettings>) {
    const next = { ...grahamSettings, ...patch, updatedAt: new Date().toISOString(), updatedBy: currentUser?.name ?? "Admin" };
    setGrahamSettings(next);
    logAudit("configuracao_graham", "Parâmetros do Valuation Graham atualizados.", "medio");
  }

  function saveFiiSettings(patch: Partial<AlfatecFiiSettings>) {
    const next = normalizeFiiSettings({ ...fiiSettings, ...patch, updatedAt: new Date().toISOString(), updatedBy: currentUser?.name ?? "Admin" });
    setFiiSettings(next);
    logAudit("configuracao_alfatec_fiis", "Parâmetros do Método AlfaTec FIIs atualizados.", "medio");
  }

  function saveCryptoSettings(next: CryptoSettings) {
    const normalizedSettings = normalizeCryptoSettings({ ...next, updatedAt: new Date().toISOString(), updatedBy: currentUser?.name ?? "Admin" });
    setCryptoSettings(normalizedSettings);
    logAudit("configuracao_alfatec_cripto", "Parametros do Metodo AlfaTec Cripto atualizados.", "medio");
  }

  async function loadCryptoData(tickers: string[]) {
    const clean = [...new Set(tickers.map((ticker) => normalizeTicker(ticker)).filter(Boolean))].slice(0, 8);
    if (!clean.length) return;
    setCryptoLoading(true);
    setCryptoError("");
    try {
      const response = await fetch(`/api/crypto/analysis?tickers=${encodeURIComponent(clean.join(","))}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Fonte de criptoativos indisponivel.");
      const snapshots = (payload.results ?? []).filter((item: { ok?: boolean }) => item.ok).map((item: { snapshot: CryptoMarketSnapshot }) => item.snapshot);
      setCryptoSnapshots((current) => ({ ...current, ...Object.fromEntries(snapshots.map((snapshot: CryptoMarketSnapshot) => [snapshot.ticker, snapshot])) }));
      const failed = (payload.results ?? []).filter((item: { ok?: boolean }) => !item.ok);
      if (failed.length) setCryptoError(failed.map((item: { ticker: string; error: string }) => `${item.ticker}: ${item.error}`).join(" "));
    } catch (error) {
      setCryptoError(error instanceof Error ? error.message : "Nao foi possivel carregar dados de criptoativos.");
    } finally {
      setCryptoLoading(false);
    }
  }



  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const current = String(formData.get("currentPassword") ?? "");
    const next = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");
    if (!isStrongPassword(next) || next !== confirm) { alert(next !== confirm ? "A confirmacao deve ser igual a nova senha." : passwordRequirementMessage()); return; }
    try {
      const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Nao foi possivel alterar a senha.");
      alert(data.message ?? "Senha alterada com sucesso.");
      form.reset();
    } catch (error) { alert(error instanceof Error ? error.message : "Nao foi possivel alterar a senha."); }
  }

  const dashboardCards = [
    { label: "Patrimônio total", value: money.format(portfolioAnalysis.totalEquity), icon: WalletCards, tone: "teal" },
    { label: "Rentabilidade diária", value: pct(portfolioAnalysis.lines.reduce((s, l) => s + l.asset.changeDay * l.weight / 100, 0)), icon: TrendingUp, tone: "green" },
    { label: "Rentabilidade mensal", value: pct(portfolioAnalysis.lines.reduce((s, l) => s + l.asset.changeMonth * l.weight / 100, 0)), icon: BarChart3, tone: "blue" },
    { label: "Rentabilidade anual", value: pct(portfolioAnalysis.profitability), icon: LineChartIcon, tone: portfolioAnalysis.profitability >= 0 ? "green" : "red" },
    { label: "Dividendos previstos", value: money.format(portfolioAnalysis.projectedDividendsYear), icon: PieChartIcon, tone: "amber" },
    { label: "Melhor ativo", value: portfolioAnalysis.best?.asset.ticker ?? "-", icon: Star, tone: "green" },
    { label: "Pior ativo", value: portfolioAnalysis.worst?.asset.ticker ?? "-", icon: AlertTriangle, tone: "red" },
    { label: "Ativos na carteira", value: String(portfolioAnalysis.lines.length), icon: BriefcaseBusiness, tone: "slate" }
  ];

  if (!currentUser) {
    return (
      <main className={cls("min-h-screen transition-colors", darkMode ? "dark bg-[#020817] text-slate-100" : "bg-slate-100 text-slate-950")}>
        <LoginScreen darkMode={darkMode} setDarkMode={setDarkMode} loginUser={loginUser} setLoginUser={setLoginUser} loginPassword={loginPassword} setLoginPassword={setLoginPassword} showPassword={showPassword} setShowPassword={setShowPassword} loginError={loginError} registerMessage={registerMessage} databaseError={databaseError} plans={plans} stateLoaded={stateLoaded} onSubmit={handleLogin} onRegister={requestAccount} />
      </main>
    );
  }

  if (currentUser.role === "CLIENTE" && (currentUser.status === "pendente" || currentUser.status === "bloqueado" || currentUser.status === "vencido" || isExpired(currentUser.dueDate))) {
    return (
      <Shell darkMode={darkMode} setDarkMode={setDarkMode} logout={logout} user={currentUser} modules={[]} activeId="" onMenu={() => undefined}>
        <div className="mx-auto max-w-5xl py-8">
          <PremiumCard title={currentUser.status === "pendente" ? "Acesso aguardando liberacao" : "Plano sem acesso ativo"} description="Seus dados permanecem preservados. Um pagamento confirmado pode renovar o acesso." icon={Lock}>
            <div className="rounded-3xl bg-red-500/10 p-6 text-red-500"><p className="text-xl font-black">{currentUser.status === "pendente" ? "Seu cadastro foi recebido e aguarda liberacao do administrador." : "O acesso aos modulos pagos esta bloqueado, mas voce pode consultar e renovar o plano abaixo."}</p><p className="mt-2 text-sm">Status atual: {currentUser.status}. Vencimento: {currentUser.dueDate ?? "nao informado"}.</p></div>
          </PremiumCard>
          {currentUser.status !== "pendente" && <div className="mt-6"><ClientPlanSection user={currentUser} plans={plans} payments={payments} /></div>}
        </div>
      </Shell>
    );
  }

  if (currentUser.role === "ADMIN" && !allClientModules.includes(adminModule as ClientModuleId)) {
    return (
      <Shell darkMode={darkMode} setDarkMode={setDarkMode} logout={logout} user={currentUser} modules={adminNavigationModules} activeId={adminModule} onMenu={handleAdminMenu}>
        {adminModule === "admin-dashboard" && (
          <Section title="Dashboard Admin" subtitle="Controle geral de clientes, planos, bloqueios e receita." eyebrow="Administração">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Clientes cadastrados" value={String(clients.length)} icon={Users} tone="blue" />
              <MetricCard label="Clientes ativos" value={String(financial.active)} icon={CheckCircle2} tone="green" />
              <MetricCard label="Clientes bloqueados" value={String(financial.blocked)} icon={Lock} tone="red" />
              <MetricCard label="Receita recebida" value={money.format(financial.received)} icon={CircleDollarSign} tone="teal" />
              <MetricCard label="Usuários no Plano FREE" value={String(freeClients.length)} icon={Users} tone="teal" />
              <MetricCard label="Novos usuários FREE (30 dias)" value={String(newFreeClients.length)} icon={Plus} tone="blue" />
              <MetricCard label="Usuários em planos pagos" value={String(paidClients.length)} icon={WalletCards} tone="green" />
              <MetricCard label="Upgrades FREE para pago" value={String(freeUpgrades)} icon={TrendingUp} tone="green" />
              <MetricCard label="Conversão FREE para pago" value={pct(paidConversionRate)} icon={TrendingUp} tone="blue" />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <PremiumCard title="Receita por status" description="Assinaturas confirmadas pelo administrador." icon={BarChart3}>
                <ChartRevenue payments={payments} />
              </PremiumCard>
              <PremiumCard title="Resumo operacional" description="Situação atual da base de clientes." icon={ShieldCheck}>
                <MiniList data={[{ name: "Ativos", value: financial.active }, { name: "Bloqueados", value: financial.blocked }, { name: "Vencidos", value: financial.expired }]} total={Math.max(clients.length, 1)} />
                <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm dark:bg-white/5">O administrador controla clientes, planos, pagamentos e permissões. Clientes bloqueados ou vencidos mantêm dados salvos, mas não acessam a plataforma.</div>
              </PremiumCard>
            </div>
          </Section>
        )}

        {adminModule === "clientes" && (
          <Section title="Clientes" subtitle="Cadastre, edite, bloqueie, desbloqueie e altere planos de acesso." eyebrow="Controle de acesso">
            <AdminPendingRegistrations />
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <PremiumCard title="Cadastrar novo cliente" description="Defina plano, senha inicial e vencimento." icon={UserCog}>
                <form onSubmit={addClient} className="grid gap-3">
                  <Input name="name" label="Nome" placeholder="Nome do cliente" required />
                  <Input name="email" type="email" label="E-mail / usuário" placeholder="cliente@email.com" required />
                  <Input name="phone" label="Telefone" placeholder="(00) 00000-0000" />
                  <PasswordInputWithRules label="Senha inicial" name="password" value={newClientPassword} onChange={setNewClientPassword} placeholder="Crie uma senha segura" autoComplete="new-password" />
                  <Select name="planId" label="Plano" defaultValue="mensal">{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} - {money.format(plan.value)}</option>)}</Select>
                  <Input name="dueDate" type="date" label="Vencimento" />
                  <Input name="notes" label="Observações" placeholder="Observações internas" />
                  <button className="rounded-2xl bg-teal-500 px-4 py-3 font-bold text-white"><Plus className="mr-2 inline h-4 w-4" />Cadastrar cliente</button>
                </form>
              </PremiumCard>
              <PremiumCard title="Lista de clientes" description="Status, vencimento, plano e ações rápidas." icon={Users}>
                <div className="space-y-3">
                  {clients.length === 0 && <p className="text-sm text-slate-500">Nenhum cliente cadastrado ainda.</p>}
                  {clients.map((client) => {
                    const plan = plans.find((item) => item.id === client.planId);
                    return (
                      <div key={client.id} className="rounded-3xl border border-slate-200 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h3 className="font-black">{client.name}</h3>
                            <p className="text-sm text-slate-500">{client.email} • {client.phone || "sem telefone"}</p>
                            <p className="mt-1 text-xs text-slate-400">Plano: {plan?.name ?? "-"} • Vencimento: {client.dueDate ?? "-"}</p>
                          </div>
                          <StatusPill status={client.status} />
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                          <select aria-label="Plano do cliente" value={client.planId ?? ""} onChange={(e) => changeClientPlan(client, e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950">
                            {plans.map((planItem) => <option key={planItem.id} value={planItem.id}>{planItem.name}</option>)}
                          </select>
                          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-slate-950">{money.format(client.planValue ?? plan?.value ?? 0)}</div>
                          <input type="date" value={client.dueDate ?? ""} onChange={(e) => updateClient(client.id, { dueDate: e.target.value, status: e.target.value < todayIso() ? "vencido" : "ativo" })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950" />
                          {client.status === "pendente" ? <button onClick={() => updateClient(client.id, { status: "ativo", dueDate: client.dueDate || addDays(plan?.durationDays ?? 30), permissions: plan?.permissions ?? client.permissions, planValue: client.planValue ?? plan?.value, planStartedAt: todayIso() })} className="rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white"><Unlock className="mr-1 inline h-4 w-4" />Liberar acesso</button> : <button onClick={() => updateClient(client.id, { status: client.status === "bloqueado" ? "ativo" : "bloqueado" })} className={cls("rounded-2xl px-3 py-2 text-sm font-bold", client.status === "bloqueado" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>{client.status === "bloqueado" ? <Unlock className="mr-1 inline h-4 w-4" /> : <Lock className="mr-1 inline h-4 w-4" />}{client.status === "bloqueado" ? "Desbloquear" : "Bloquear"}</button>}
                          <button onClick={() => setAccounts((current) => current.filter((account) => account.id !== client.id))} className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-red-500 dark:bg-white/10"><Trash2 className="mr-1 inline h-4 w-4" />Excluir</button>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-300">Valor atual da assinatura: {money.format(client.planValue ?? plan?.value ?? 0)}</p>
                        <button onClick={() => setSelectedClientId(selectedClientId === client.id ? null : client.id)} className="mt-3 text-sm font-bold text-teal-500">{selectedClientId === client.id ? "Ocultar permissões" : "Editar permissões"}</button>
                        {selectedClientId === client.id && <><AdminIdentityEditor client={client} onUpdated={(updated) => updateClient(client.id, { name: updated.name, email: updated.email, nameChangeCount: updated.nameChangeCount })} /><PermissionsEditor client={client} updateClient={updateClient} /></>}
                      </div>
                    );
                  })}
                </div>
              </PremiumCard>
            </div>
          </Section>
        )}

        {adminModule === "planos" && (
          <Section title="Planos" subtitle="Configure valores, duração, status e permissões sem alterar clientes já cadastrados." eyebrow="Liberação comercial">
            <div className="mb-5 rounded-3xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm font-semibold text-cyan-800 dark:text-cyan-200">
              Alterações de preço feitas aqui viram o novo valor oficial do plano, mas não alteram retroativamente pagamentos ou assinaturas já registradas.
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => <PlanCard key={plan.id} plan={plan} setPlans={setPlans} setAccounts={setAccounts} />)}
            </div>
          </Section>
        )}

        {adminModule === "financeiro" && (
          <Section title="Financeiro" subtitle="Recebimentos, pendências, vencimentos e histórico." eyebrow="Administração financeira">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Clientes ativos" value={String(financial.active)} icon={CheckCircle2} tone="green" />
              <MetricCard label="Clientes vencidos" value={String(financial.expired)} icon={AlertTriangle} tone="amber" />
              <MetricCard label="Valores recebidos" value={money.format(financial.received)} icon={CircleDollarSign} tone="teal" />
              <MetricCard label="Valores pendentes" value={money.format(financial.pending)} icon={CalendarDays} tone="red" />
            </div>
            <div className="mt-6"><PlanValuesManager plans={plans} history={planPriceHistory} clients={clients} payments={payments} onUpdatePlan={updateOfficialPlan} /></div>
            <div className="mt-6"><AdminSubscriptionRequests /></div>
            <div className="mt-6">
              <PremiumCard title="Histórico de pagamentos" description="Registros gerados após a ativação administrativa de uma solicitação." icon={FileSpreadsheet}>
                <div className="mb-5 h-64"><ChartRevenue payments={payments} /></div>
                <div className="space-y-2">
                  {payments.map((payment) => {
                    const client = clients.find((item) => item.id === payment.clientId);
                    const plan = plans.find((item) => item.id === payment.planId);
                    return <div key={payment.id} className="grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5 sm:grid-cols-4"><strong>{client?.name ?? "Cliente"}</strong><span>{plan?.name}</span><span>{money.format(payment.value)}</span><StatusPill status={payment.status} /></div>;
                  })}
                  {payments.length === 0 && <p className="text-sm text-slate-500">Nenhum pagamento confirmado.</p>}
                </div>
              </PremiumCard>
            </div>
          </Section>
        )}

        {adminModule === "admin-relatorios" && (
          <Section title="Relatórios Admin" subtitle="Documentos profissionais de clientes, planos, financeiro, uso e sistema." eyebrow="PDF, Excel, CSV, JSON e PNG">
            <ReportCenter mode="admin" user={currentUser} accounts={accounts} plans={plans} payments={payments} auditLogs={auditLogs} portfolio={portfolioAnalysis} assets={assets} fiiAnalyses={fiiAnalyses} cryptoAnalyses={cryptoAnalyses} />
          </Section>
        )}

        {adminModule === "configuracoes" && <SettingsSection currentUser={currentUser} darkMode={darkMode} setDarkMode={setDarkMode} settings={settings} setSettings={setSettings} changePassword={changePassword} logout={logout} onAccountUpdated={(updated) => setAccounts((current) => current.map((account) => account.id === updated.id ? { ...account, ...updated } : account))} />}
      </Shell>
    );
  }

  return (
    <Shell darkMode={darkMode} setDarkMode={setDarkMode} logout={logout} user={currentUser} modules={currentUser.role === "ADMIN" ? adminNavigationModules : allowedClientModules} activeId={currentUser.role === "ADMIN" ? adminModule : clientModule} onMenu={currentUser.role === "ADMIN" ? handleAdminMenu : (id) => {
      setGlobalSearch("");
      if (isFreeUser && isFreeLockedModule(id)) {
        if (isFreeExplainerModule(id)) {
          setUpgradeResource(null);
          setClientModule(id as ClientModuleId);
          return;
        }
        setUpgradeResource(id as "comparador" | "radar");
        setClientModule("plano");
        return;
      }
      setUpgradeResource(null); setClientModule(id as ClientModuleId);
    }}>
      <div className="relative z-20">
        <GlobalSearchBox globalSearch={globalSearch} setGlobalSearch={setGlobalSearch} globalSuggestions={globalSuggestions} selectAsset={selectAsset} searchHistory={searchHistory} assets={assets} />
        {clientModule === "dashboard" && (
          <Section title="Dashboard executivo" subtitle="Visão consolidada da carteira, renda, risco e distribuição." eyebrow="Resumo premium">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardCards.map((card) => <MetricCard key={card.label} {...card} />)}
            </div>
            {currentUser.role === "CLIENTE" && planAlertText(currentUser) && <div className="mt-5 rounded-3xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm font-bold text-amber-700 dark:text-amber-300">{planAlertText(currentUser)}</div>}
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <PremiumCard title="Evolução do patrimônio" description="Linha acumulada com base na carteira do usuário." icon={LineChartIcon}>
                <div className="h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={buildEquityCurve(portfolioAnalysis.lines)}><defs><linearGradient id="equity" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.45}/><stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" opacity={0.18} /><XAxis dataKey="label" hide /><YAxis tickFormatter={(value) => compactMoney.format(Number(value))} width={80} /><Tooltip formatter={(value) => money.format(Number(value))} /><Area type="monotone" dataKey="value" name="Patrimônio" stroke="#14b8a6" strokeWidth={3} fill="url(#equity)" /></AreaChart></ResponsiveContainer></div>
              </PremiumCard>
              <PremiumCard title="Distribuição por tipo" description="Composição atual da carteira." icon={PieChartIcon}>
                <PieBlock data={portfolioAnalysis.byType} />
              </PremiumCard>
            </div>
          </Section>
        )}

        {clientModule === "mercado" && (
          <Section title="Mercado" subtitle="Pesquise ações, FIIs, ETFs, BDRs e criptomoedas. Se o ticker não existir na base local, o sistema cria um cadastro dinâmico para futura consulta." eyebrow="Busca instantânea">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <PremiumCard title="Pesquisar ativos" description="Filtro por ticker, nome, setor, segmento e tipo." icon={Search}>
                <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                  <div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={marketSearch} onChange={(e) => setMarketSearch(e.target.value)} placeholder="Ex.: GARE11, PETR4, BTC, tecnologia, logística..." className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></div>
                  <select value={marketType} onChange={(e) => setMarketType(e.target.value as AssetType | "TODOS")} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-slate-950">{assetTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button type="button" onClick={() => void refreshVisibleMarket()} disabled={refreshingMarket} className="h-12 rounded-2xl bg-teal-500 px-4 font-bold text-white disabled:cursor-wait disabled:opacity-70"><RefreshCw className={cls("mr-2 inline h-4 w-4", refreshingMarket && "animate-spin")} />{refreshingMarket ? "Atualizando..." : "Atualizar dados"}</button>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {marketResults.slice(0, 18).map((asset) => <AssetCard key={asset.ticker} asset={asset} favorites={favorites} onSelect={() => selectAsset(asset)} onFavorite={() => setFavorites((current) => current.includes(asset.ticker) ? current.filter((ticker) => ticker !== asset.ticker) : [asset.ticker, ...current])} />)}
                  {marketQuoteMessage && <div className={cls("rounded-3xl border p-5 text-sm font-bold", marketQuoteStatus === "error" ? "border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-300" : "border-cyan-400/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200")}>{marketQuoteStatus === "loading" ? "Consultando cotação externa..." : marketQuoteMessage}</div>}
                </div>
              </PremiumCard>
              <AssetPanel asset={selectedAsset} favorites={favorites} setFavorites={setFavorites} onAddToPortfolio={addAssetToPortfolio} basicMode={isFreeUser} onOpenFiiAnalysis={(asset) => { setFiiAsset(asset); setFiiSearch(asset.ticker); setClientModule("alfatec_fiis"); if (currentUser.role === "ADMIN") setAdminModule("alfatec_fiis"); }} cryptoAnalysis={selectedAsset.type === "CRIPTO" ? cryptoAnalyses.find((item) => item.ticker === selectedAsset.ticker) ?? null : null} onOpenCryptoAnalysis={(asset) => { setCryptoTicker(asset.ticker); void loadCryptoData([asset.ticker]); setClientModule("alfatec_crypto_method"); if (currentUser.role === "ADMIN") setAdminModule("alfatec_crypto_method"); }} />
            </div>
          </Section>
        )}

        {clientModule === "oportunidades" && (
          <Section title="Oportunidades" subtitle="Filtros especializados e rankings separados por classe de ativo." eyebrow="Radar de oportunidades">
            <div className="mb-6 grid grid-cols-1 gap-2 rounded-2xl bg-slate-200 p-1.5 dark:bg-white/5 sm:grid-cols-3">
              <button type="button" onClick={() => setOpportunityCategory("ACAO")} className={cls("min-h-11 rounded-xl px-4 text-sm font-black transition", opportunityCategory === "ACAO" ? "bg-cyan-500 text-white" : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10")}>Ações</button>
              <button type="button" onClick={() => setOpportunityCategory("FII")} className={cls("min-h-11 rounded-xl px-4 text-sm font-black transition", opportunityCategory === "FII" ? "bg-cyan-500 text-white" : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10")}>FIIs</button>
              <button type="button" onClick={() => setOpportunityCategory("CRIPTO")} className={cls("min-h-11 rounded-xl px-4 text-sm font-black transition", opportunityCategory === "CRIPTO" ? "bg-cyan-500 text-white" : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10")}>Cripto</button>
            </div>

            {opportunityCategory === "ACAO" && (
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <PremiumCard title="Filtros de Oportunidades em Ações" description="Critérios cumulativos de fundamentos, liquidez, confiança e Número de Graham." icon={Search}>
                  {isFreeUser ? <FreeAccessSummary text={`O Plano FREE mostra as ${currentFreeLimits.opportunities} principais oportunidades do dia. Filtros avançados e score detalhado estão disponíveis nos planos pagos.`} /> : (
                    <StockOpportunityFilters
                      value={stockOpportunityFilters}
                      onChange={setStockOpportunityFilters}
                      sectors={stockOpportunitySectors}
                      segments={stockOpportunitySegments}
                      resultCount={stockOpportunityAssets.length}
                    />
                  )}
                </PremiumCard>
                <PremiumCard title="Oportunidades em ações" description="O Número de Graham é apenas um componente e a fórmula com crescimento não é usada nesta tela." icon={TrendingUp}>
                  {isFreeUser ? <FreeOpportunityList assets={stockOpportunityAssets.slice(0, currentFreeLimits.opportunities)} onSelect={(asset) => selectAsset(asset, "mercado")} /> : <GrahamOpportunityTable assets={stockOpportunityAssets.slice(0, 50)} onSelect={(asset) => selectAsset(asset, "mercado")} />}
                  {!stockOpportunityAssets.length && <p className="mt-4 rounded-2xl bg-amber-500/10 p-4 text-sm font-semibold text-amber-800 dark:text-amber-200">Nenhuma ação atende aos filtros atuais. Dados ausentes de Graham não são substituídos por zero.</p>}
                </PremiumCard>
              </div>
            )}

            {opportunityCategory === "FII" && (
              <PremiumCard title="Oportunidades em FIIs" description="Score AlfaTec FIIs, renda recorrente, risco, valuation, liquidez e confiança dos dados." icon={Building2}>
                {isFreeUser ? <FreeAccessSummary text="Top 10 FIIs do dia no Plano FREE. Use um plano pago para acessar filtros e análise detalhada." /> : <FiiOpportunityFilters value={fiiFilters} onChange={(patch) => setFiiFilters((current) => ({ ...current, ...patch }))} segments={fiiSegments} />}
                <div className="mt-4">{isFreeUser ? <FreeOpportunityList assets={fiiOpportunityAnalyses.slice(0, currentFreeLimits.opportunities).map((item) => item.asset)} onSelect={(asset) => selectAsset(asset, "mercado")} /> : <FiiOpportunitiesTable items={fiiOpportunityAnalyses.slice(0, 50)} onSelect={(asset) => { setFiiAsset(asset); setFiiSearch(asset.ticker); setClientModule("alfatec_fiis"); if (currentUser.role === "ADMIN") setAdminModule("alfatec_fiis"); }} />}</div>
              </PremiumCard>
            )}

            {opportunityCategory === "CRIPTO" && (
              <PremiumCard title="Oportunidades em criptoativos" description="Score AlfaTec Cripto com dados reais, categoria, mercado, tokenomics, risco e confiança." icon={Bitcoin}>
                {isFreeUser ? <FreeAccessSummary text="Top 10 criptoativos do dia no Plano FREE. Filtros e score detalhado fazem parte dos planos pagos." /> : <CryptoOpportunityFilters value={cryptoFilters} onChange={(patch) => setCryptoFilters((current) => ({ ...current, ...patch }))} categories={cryptoFilterCategories} />}
                <div className="mt-4">{isFreeUser ? <FreeOpportunityList assets={rankedAssets.filter((asset) => asset.type === "CRIPTO").slice(0, currentFreeLimits.opportunities)} onSelect={(asset) => selectAsset(asset, "mercado")} /> : <CryptoOpportunityTable items={cryptoOpportunityAnalyses} onSelect={(ticker) => { setCryptoTicker(ticker); setClientModule("alfatec_crypto_method"); if (currentUser.role === "ADMIN") setAdminModule("alfatec_crypto_method"); }} />}</div>
              </PremiumCard>
            )}
          </Section>
        )}
        {clientModule === "comparador" && (
          <Section title="Comparador" subtitle="Compare qualquer combinação: ação, FII, ETF, BDR ou cripto." eyebrow="Gráfico profissional">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <PremiumCard title="Comparar ativos" description="Use as barras de pesquisa para escolher os dois lados da comparação." icon={LineChartIcon}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <SearchBox label="Pesquisar Ativo A" value={searchA} onChange={setSearchA} assets={assets} onSelect={(asset) => { setAssetA(asset); setSearchA(asset.ticker); if (asset.type === "CRIPTO") void loadCryptoData([asset.ticker]); }} />
                  <SearchBox label="Pesquisar Ativo B" value={searchB} onChange={setSearchB} assets={assets} onSelect={(asset) => { setAssetB(asset); setSearchB(asset.ticker); if (asset.type === "CRIPTO") void loadCryptoData([asset.ticker]); }} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">{ranges.map((item) => <button key={item.id} onClick={() => setRange(item.id)} className={cls("rounded-full px-4 py-2 text-sm font-bold", range === item.id ? "bg-teal-500 text-white" : "bg-slate-100 dark:bg-white/10")}>{item.label}</button>)}</div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2"><PerformancePill asset={assetA} value={returnA} /><PerformancePill asset={assetB} value={returnB} /></div>
                <div className="mt-5 h-[430px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={comparison}><CartesianGrid strokeDasharray="3 3" opacity={0.16} /><XAxis dataKey="label" minTickGap={28} /><YAxis yAxisId="left" unit="%" /><YAxis yAxisId="right" orientation="right" tickFormatter={(value) => compactMoney.format(Number(value))} /><Tooltip formatter={(value, name) => name === "Volume" ? compactMoney.format(Number(value)) : `${value}%`} /><Bar yAxisId="right" dataKey="volumeA" name="Volume" fill="#334155" opacity={0.22} /><Line yAxisId="left" type="monotone" dataKey={assetA.ticker} name={`${assetA.ticker} %`} stroke="#14b8a6" strokeWidth={3} dot={false} /><Line yAxisId="left" type="monotone" dataKey={assetB.ticker} name={`${assetB.ticker} %`} stroke="#38bdf8" strokeWidth={3} dot={false} /></ComposedChart></ResponsiveContainer></div>
                <ComparisonTable a={assetA} b={assetB} />
                {assetA.type === "FII" && assetB.type === "FII" ? <FiiComparison a={assetA} b={assetB} assets={assets} settings={fiiSettings} /> : assetA.type === "CRIPTO" && assetB.type === "CRIPTO" && cryptoAnalyses.find((item) => item.ticker === assetA.ticker) && cryptoAnalyses.find((item) => item.ticker === assetB.ticker) ? <CryptoComparison a={cryptoAnalyses.find((item) => item.ticker === assetA.ticker)!} b={cryptoAnalyses.find((item) => item.ticker === assetB.ticker)!} /> : assetA.type === "CRIPTO" || assetB.type === "CRIPTO" ? <p className="mt-5 rounded-2xl bg-amber-500/10 p-3 text-sm font-semibold text-amber-700 dark:text-amber-300">Selecione dois criptoativos com dados carregados para usar o Metodo AlfaTec Cripto. Graham nao e aplicado a cripto.</p> : <GrahamComparison a={assetA} b={assetB} />}
              </PremiumCard>
              {assetA.type === "CRIPTO" && assetB.type === "CRIPTO" ? <PremiumCard title="Leitura comparativa cripto" description="Maior score segundo este metodo, sem indicar automaticamente o melhor investimento." icon={Bitcoin}><p className="text-sm text-slate-600 dark:text-slate-300">Use categoria, confianca, risco e disponibilidade dos dados em conjunto. Ativos de categorias diferentes nao possuem comparacao direta equivalente.</p></PremiumCard> : <ComparisonRecommendationCard recommendation={comparisonRecommendation} a={assetA} b={assetB} returnA={returnA} returnB={returnB} />}
            </div>
          </Section>
        )}

        {clientModule === "carteira" && (
          <Section title="Minha Carteira" subtitle="Cadastre ativos e acompanhe lucro, prejuízo, dividendos e concentração." eyebrow="Controle do usuário">
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoTile label="Capital investido" value={money.format(portfolioAnalysis.totalInvested)} />
              <InfoTile label="Patrimônio atual" value={money.format(portfolioAnalysis.totalEquity)} />
              <InfoTile label="Lucro / Prejuízo" value={signedMoney(portfolioAnalysis.totalProfit)} />
              <InfoTile label="Rentabilidade" value={signedPct(portfolioAnalysis.profitability)} />
            </div>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <InfoTile label="Dividendos por ciclo" value={money.format(portfolioDividendCycle)} />
              <InfoTile label="Dividendos/mês" value={money.format(portfolioAnalysis.projectedDividendsMonth)} />
              <InfoTile label="Dividendos/ano" value={money.format(portfolioAnalysis.projectedDividendsYear)} />
            </div>
            <div className="grid min-w-0 gap-6 xl:grid-cols-[0.72fr_1.28fr]">
              <PremiumCard title="Adicionar ativo" description="Ticker, quantidade, preço médio, corretora e data." icon={Plus}>
                <form onSubmit={addPortfolioPosition} className="grid gap-3">
                  <Input name="ticker" label="Ticker" placeholder="GARE11 ou BTC" value={portfolioTickerInput} onChange={(event) => setPortfolioTickerInput(event.target.value)} required />
                  <CryptoQuantityInput value={portfolioQuantityInput} onChange={setPortfolioQuantityInput} assetType={portfolioInputType} />
                  <Input name="averagePrice" type="text" inputMode="decimal" label="Preço médio" value={portfolioAveragePriceInput} onChange={(event) => setPortfolioAveragePriceInput(event.target.value)} placeholder="0,00" required />
                  <Input name="broker" label="Corretora" placeholder="XP, Rico, BTG..." />
                  <Input name="purchaseDate" type="date" label="Data da compra" />
                  {isFreeUser && <p className="rounded-lg bg-cyan-500/10 p-3 text-sm font-semibold text-cyan-800 dark:text-cyan-200">Plano FREE: {portfolio.length} de {currentFreeLimits.portfolio} posições utilizadas.</p>}
                  {portfolioFormError && <p className="rounded-lg bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">{portfolioFormError}</p>}
                  <button disabled={Boolean(isFreeUser && portfolio.length >= currentFreeLimits.portfolio)} className="rounded-lg bg-teal-500 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Adicionar à carteira</button>
                </form>
              </PremiumCard>
              <PremiumCard title="Posições" description="Valores financeiros recalculados automaticamente com o preço atual." icon={WalletCards}>
                <PortfolioPositionsTable
                  lines={portfolioAnalysis.lines}
                  editingId={editingPortfolioId}
                  onEdit={setEditingPortfolioId}
                  onDelete={(id) => setPortfolio((current) => current.filter((item) => item.id !== id))}
                  onCancelEdit={() => setEditingPortfolioId(null)}
                  onSaveEdit={(line, quantity, averagePrice) => {
                    setPortfolio((current) => current.map((item) => item.id === line.id ? { ...item, quantity, averagePrice, assetType: line.asset.type } : item));
                    setEditingPortfolioId(null);
                  }}
                  dividendPerShare={dividendPerShare}
                  dividendFrequency={dividendFrequency}
                />
              </PremiumCard>
            </div>            {isFreeUser ? <UpgradeNotice title="Análises avançadas da carteira" description="Balanceamento inteligente, sugestões automáticas, simulações e alertas completos estão disponíveis nos planos pagos." onUpgrade={() => { setUpgradeResource(null); setClientModule("plano"); }} /> : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2"><PremiumCard title="Análise IA da carteira" description="Diversificação, concentração, risco e dividendos." icon={BrainCircuit}><ul className="space-y-2">{portfolioAnalysis.aiSummary.map((item) => <li key={item} className="flex gap-2 text-sm"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />{item}</li>)}</ul></PremiumCard><PremiumCard title="Alertas automatizados" description="Condições de risco e concentração." icon={AlertTriangle}><ul className="space-y-2">{portfolioAnalysis.alerts.map((item) => <li key={item} className="flex gap-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{item}</li>)}</ul></PremiumCard></div>
            )}
          </Section>
        )}

        {clientModule === "graham_valuation" && (isFreeUser ? <FreeMethodExplanation method="Método Graham" description="O método estima referências de preço a partir do lucro por ação, do valor patrimonial e, no modelo de crescimento, de premissas adicionais. Os cálculos completos e a margem de segurança estão disponíveis nos planos pagos." onUpgrade={() => setClientModule("plano")} /> : <GrahamValuationSection assets={assets} selectedAsset={grahamAsset} search={grahamSearch} setSearch={setGrahamSearch} setSelectedAsset={setGrahamAsset} currentUser={currentUser} settings={grahamSettings} saveSettings={saveGrahamSettings} growth={grahamGrowth} setGrowth={setGrahamGrowth} y={grahamY} setY={setGrahamY} />)}

        {clientModule === "alfatec_fiis" && (isFreeUser ? <FreeMethodExplanation method="Método AlfaTec FIIs" description="O método combina qualidade, renda, risco, valuation, gestão, liquidez e diversificação conforme o tipo de fundo. Scores e cálculos completos estão disponíveis nos planos pagos." onUpgrade={() => setClientModule("plano")} /> : <AlfatecFiiSection assets={assets} selectedAsset={fiiAsset} search={fiiSearch} setSearch={setFiiSearch} setSelectedAsset={setFiiAsset} currentUser={currentUser} settings={fiiSettings} saveSettings={saveFiiSettings} filters={fiiFilters} setFilters={setFiiFilters} segments={fiiSegments} opportunities={fiiOpportunityAnalyses} />)}

        {clientModule === "alfatec_portfolio_method" && (isFreeUser ? <FreeMethodExplanation method="Análise e Balanceamento" description="O Método AlfaTec Carteira organiza o perfil do investidor, a alocação-alvo e os critérios de diversificação e rebalanceamento. No Plano Free, a explicação permanece disponível, mas questionário, cálculos, simulações, histórico e sugestões de balanceamento ficam bloqueados." onUpgrade={() => setClientModule("plano")} /> : <AlfatecPortfolioMethod lines={portfolioAnalysis.lines} userId={currentUser.id} />)}
        {clientModule === "renda_fixa" && <FixedIncomeCenter />}
        {clientModule === "alfatec_crypto_method" && (isFreeUser ? <FreeMethodExplanation method="Método AlfaTec Cripto" description="O método avalia fundamentos, rede, tokenomics, segurança, mercado, desenvolvimento, valuation on-chain e risco. Scores e análises completas estão disponíveis nos planos pagos." onUpgrade={() => setClientModule("plano")} /> : <AlfatecCryptoSection assets={assets} analyses={cryptoAnalyses} selectedTicker={cryptoTicker} loading={cryptoLoading} error={cryptoError} currentUserRole={currentUser.role} settings={cryptoSettings} onSelect={(ticker) => { setCryptoTicker(ticker); void loadCryptoData([ticker]); }} onRefresh={(ticker) => void loadCryptoData([ticker])} onSaveSettings={saveCryptoSettings} />)}

        {clientModule === "notificacoes" && <NotificationCenter />}

        {clientModule === "plano" && <ClientPlanSection user={currentUser} plans={plans} payments={payments} upgradeResource={upgradeResource} />}

        {clientModule === "radar" && (
          <Section title="Radar IA" subtitle="Ranking de oportunidades com score transparente e configurável." eyebrow="Inteligência automatizada">
            <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
              <PremiumCard title="Critérios do score" description="Ajuste pesos e filtros do Radar IA." icon={Settings}>{Object.entries(weights).map(([key, value]) => <WeightSlider key={key} label={radarLabel(key)} value={value} onChange={(next) => setWeights((current) => ({ ...current, [key]: next }))} />)}<RadarGrahamFilters grahamOnly={radarGrahamOnly} setGrahamOnly={setRadarGrahamOnly} minMargin={radarMinMargin} setMinMargin={setRadarMinMargin} minPotential={radarMinPotential} setMinPotential={setRadarMinPotential} maxPl={radarMaxPl} setMaxPl={setRadarMaxPl} maxPvp={radarMaxPvp} setMaxPvp={setRadarMaxPvp} minLiquidity={radarMinLiquidity} setMinLiquidity={setRadarMinLiquidity} minRoe={radarMinRoe} setMinRoe={setRadarMinRoe} maxDebt={radarMaxDebt} setMaxDebt={setRadarMaxDebt} /></PremiumCard>
              <PremiumCard title="Ranking geral" description="Número de Graham contribui no máximo com 15% do score e não é usado para FIIs." icon={BrainCircuit}><div className="space-y-3">{radarAssets.slice(0, 15).map((asset, index) => <RankingRow key={asset.ticker} asset={asset} index={index + 1} onClick={() => selectAsset(asset, "mercado")} />)}</div></PremiumCard>
              <div className="xl:col-span-2">
                <PremiumCard title="Radar IA - FIIs" description="Filtros e ranking com o Método AlfaTec FIIs, identificado separadamente das ações." icon={Building2}>
                  <FiiOpportunityFilters value={radarFiiFilters} onChange={(patch) => setRadarFiiFilters((current) => ({ ...current, ...patch }))} segments={fiiSegments} />
                  <div className="mt-4"><FiiRadarTable items={radarFiiAnalyses.slice(0, 12)} onSelect={(asset) => { setFiiAsset(asset); setFiiSearch(asset.ticker); setClientModule("alfatec_fiis"); if (currentUser.role === "ADMIN") setAdminModule("alfatec_fiis"); }} /></div>
                </PremiumCard>
              </div>
              <div className="xl:col-span-2">
                <PremiumCard title="Radar IA - Criptoativos" description="Ranking separado com o Metodo AlfaTec Cripto e explicacao dos fatores." icon={Bitcoin}>
                  <CryptoOpportunityFilters value={radarCryptoFilters} onChange={(patch) => setRadarCryptoFilters((current) => ({ ...current, ...patch }))} categories={cryptoFilterCategories} />
                  <div className="mt-4"><CryptoOpportunityTable items={radarCryptoAnalyses} onSelect={(ticker) => { setCryptoTicker(ticker); setClientModule("alfatec_crypto_method"); if (currentUser.role === "ADMIN") setAdminModule("alfatec_crypto_method"); }} /></div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">O radar usa fundamentos, rede, tokenomics, seguranca, mercado, desenvolvimento, valuation on-chain e risco. Nao produz comando de compra ou venda.</p>
                </PremiumCard>
              </div>
            </div>
          </Section>
        )}

        {clientModule === "relatorios" && (
          <Section title="Relatórios" subtitle="Documentos profissionais da carteira com prévia e exportação multiformato." eyebrow="PDF, Excel, CSV, JSON e PNG">
            <ReportCenter mode="client" freeMode={isFreeUser} user={currentUser} plans={plans} payments={payments} portfolio={portfolioAnalysis} assets={assets} fiiAnalyses={fiiAnalyses} cryptoAnalyses={cryptoAnalyses} />
          </Section>
        )}

        {clientModule === "configuracoes" && <SettingsSection currentUser={currentUser} darkMode={darkMode} setDarkMode={setDarkMode} settings={settings} setSettings={setSettings} changePassword={changePassword} logout={logout} onAccountUpdated={(updated) => setAccounts((current) => current.map((account) => account.id === updated.id ? { ...account, ...updated } : account))} />}
      </div>
    </Shell>
  );
}

function Shell({ darkMode, setDarkMode, logout, user, modules, activeId, onMenu, children }: { darkMode: boolean; setDarkMode: (value: boolean) => void; logout: () => void; user: Account; modules: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }>; group?: string; locked?: boolean }>; activeId: string; onMenu: (id: string) => void; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const adminGroups = ["Área do cliente", "Administração"];
  const activeModule = modules.find((item) => item.id === activeId);
  const freeUser = user.role === "CLIENTE" && isFreePlan(user.planId, String(user.selectedPlanName || ""));
  const groupedModules = user.role === "ADMIN"
    ? adminGroups.map((group) => ({ group, items: modules.filter((item) => item.group === group) })).filter((item) => item.items.length)
    : [{ group: "Menu principal", items: modules }];

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(sidebar.querySelectorAll<HTMLElement>(focusableSelector));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSidebarOpen(false);
        return;
      }
      if (event.key === "Tab" && first && last) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    if (mobile) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    first?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (mobile) document.body.style.overflow = "";
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const navigation = navigationRef.current;
    const active = navigation?.querySelector<HTMLElement>('[data-active="true"]');
    if (!navigation || !active) return;
    const navigationRect = navigation.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (activeRect.top < navigationRect.top || activeRect.bottom > navigationRect.bottom) active.scrollIntoView({ block: "nearest" });
  }, [activeId, modules]);

  const renderMenuButton = (item: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; locked?: boolean }) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        data-active={activeId === item.id}
        aria-current={activeId === item.id ? "page" : undefined}
        aria-label={item.locked ? `${item.label}, recurso bloqueado no plano atual` : item.label}
        title={item.locked ? `${item.label} disponível nos planos pagos` : undefined}
        onClick={() => {
          onMenu(item.id);
          setSidebarOpen(false);
        }}
        className={cls(
          "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition",
          activeId === item.id
            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_14px_35px_rgba(14,165,233,0.28)]"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        )}
      >
        <span className={cls(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
          activeId === item.id ? "bg-white/20" : "bg-slate-100 text-slate-500 group-hover:bg-white dark:bg-white/5 dark:text-slate-300 dark:group-hover:bg-white/10"
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.locked && <Lock className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />}
        {activeId === item.id && <ChevronRight className="h-4 w-4 shrink-0" />}
      </button>
    );
  };

  return (
    <main className={cls("min-h-screen text-slate-950 transition-colors", darkMode ? "dark bg-[#020817] text-slate-100" : "bg-slate-100 text-slate-950")}>
      <div className="fixed inset-0 -z-10 bg-slate-100 dark:bg-[#020817]" />
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[8%] top-[-10%] h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-[6%] top-[8%] h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute bottom-[8%] left-[35%] h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {sidebarOpen && <button aria-label="Fechar menu lateral" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden" />}

      <div className="flex min-h-screen">
        <aside
          ref={sidebarRef}
          id="main-sidebar"
          data-open={sidebarOpen}
          aria-label="Menu principal"
          className={cls(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[19rem] flex-col border-r border-slate-200/70 bg-white/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 dark:border-white/10 dark:bg-slate-950/95 lg:translate-x-0 lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="relative shrink-0 border-b border-slate-200/70 p-5 dark:border-white/10">
            <button type="button" onClick={() => setSidebarOpen(false)} className="absolute right-3 top-3 rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-white/5 lg:hidden" aria-label="Fechar menu lateral"><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-3">
              <img src="/logo-alfatec.png" alt="Invest Pro" className="h-14 w-14 object-contain" />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white">INVEST PRO</h1>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-500">Análise premium</p>
              </div>
            </div>
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Perfil</p>
              <div className="mt-1 flex min-w-0 items-center gap-2"><p className="min-w-0 truncate text-sm font-black">{user.name}</p>{freeUser && <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">FREE</span>}</div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{user.role === "ADMIN" ? "Administrador" : "Cliente"}</p>
            </div>
          </div>

          <nav ref={navigationRef} aria-label="Navegação principal" className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 [scrollbar-gutter:stable]">
            {groupedModules.map(({ group, items }) => (
              <div key={group}>
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">{group}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">{items.length}</span>
                </div>
                <div className="space-y-1.5">{items.map(renderMenuButton)}</div>
              </div>
            ))}
            {!modules.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5">Nenhum menu liberado para este acesso.</p>}
          </nav>

          <div className="shrink-0 border-t border-slate-200/70 p-4 dark:border-white/10">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold transition hover:scale-[1.02] dark:border-white/10 dark:bg-white/5">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Tema
              </button>
              <button onClick={logout} className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold text-red-500 transition hover:scale-[1.02] dark:border-red-500/20 dark:bg-red-500/10">
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:ml-[19rem]">
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex h-20 items-center justify-between gap-3 px-4 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button ref={menuTriggerRef} type="button" onClick={() => setSidebarOpen(true)} className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:scale-105 dark:border-white/10 dark:bg-white/5 lg:hidden" aria-label="Abrir menu lateral" aria-expanded={sidebarOpen} aria-controls="main-sidebar"><Menu className="h-5 w-5" /></button>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-500">{user.role === "ADMIN" ? "Painel administrativo" : "Área do cliente"}</p>
                  <h2 className="truncate text-lg font-black sm:text-2xl">{activeModule?.label ?? "INVEST PRO"}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell onOpen={() => onMenu("notificacoes")} />
                <span className="hidden rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold dark:bg-white/10 sm:inline-flex">{user.role === "ADMIN" ? "Admin" : "Cliente"}</span>
                <button onClick={() => setDarkMode(!darkMode)} className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:scale-105 dark:border-white/10 dark:bg-white/5">{darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

function LoginScreen({ darkMode, setDarkMode, loginUser, setLoginUser, loginPassword, setLoginPassword, showPassword, setShowPassword, loginError, registerMessage, databaseError, plans, stateLoaded, onSubmit, onRegister }: { darkMode: boolean; setDarkMode: (value: boolean) => void; loginUser: string; setLoginUser: (value: string) => void; loginPassword: string; setLoginPassword: (value: string) => void; showPassword: boolean; setShowPassword: (value: boolean) => void; loginError: string; registerMessage: string; databaseError: string; plans: Plan[]; stateLoaded: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onRegister: (payload: PublicRegistrationPayload) => Promise<PublicRegistrationResult> }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const activePlans = plans.filter((plan) => plan.status === "ativo" && (isFreePlan(plan.id, plan.name) ? plan.value === 0 : plan.value > 0));

  return (
    <div className="relative grid min-h-screen overflow-y-auto bg-slate-100 px-4 py-6 text-slate-950 dark:bg-[#020817] dark:text-slate-100 sm:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(6,182,212,0.22),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(20,184,166,0.12),transparent_34%)]" />
      <div className="relative z-10 grid min-h-full place-items-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 lg:grid-cols-[0.86fr_1fr]">
          <div className="hidden overflow-hidden bg-slate-950/95 p-7 text-white lg:flex lg:flex-col lg:justify-center">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_top,#0ea5e9_0,transparent_38%)] opacity-25" />
            <img src="/logo-alfatec.png" alt="Invest Pro" className="relative z-10 mx-auto h-56 w-56 object-contain" />
            <div className="relative z-10 mt-7">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Acesso seguro</p>
              <h2 className="mt-3 text-3xl font-black text-white">INVEST PRO</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">Gestão de clientes, planos, financeiro e análise inteligente de investimentos em uma interface profissional.</p>
            </div>
          </div>
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src="/logo-alfatec.png" alt="Invest Pro" className="h-16 w-16 object-contain lg:hidden" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-500">{mode === "login" ? "Login" : "Nova conta"}</p>
                  <h1 className="text-2xl font-black">{mode === "login" ? "Entrar na plataforma" : "Criar conta"}</h1>
                </div>
              </div>
              <button type="button" onClick={() => setDarkMode(!darkMode)} className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:scale-105 dark:border-white/10 dark:bg-white/5" aria-label="Alternar tema">{darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            </div>
            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/10">
              <button type="button" onClick={() => setMode("login")} className={cls("rounded-xl px-3 py-2 text-sm font-black", mode === "login" ? "bg-white text-slate-950 shadow dark:bg-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-300")}>Entrar</button>
              <button type="button" onClick={() => setMode("register")} className={cls("rounded-xl px-3 py-2 text-sm font-black", mode === "register" ? "bg-white text-slate-950 shadow dark:bg-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-300")}>Criar conta</button>
            </div>

            {mode === "login" ? (
              <form onSubmit={onSubmit}>
                <label className="mb-4 block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Nome, usuário ou e-mail</span>
                  <div className="relative"><UserCog className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400" placeholder="Digite nome, usuário ou e-mail" autoComplete="username" /></div>
                </label>
                <label className="mb-4 block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Senha</span>
                  <div className="relative"><KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input type={showPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400" placeholder="Digite sua senha" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Visualizar ou ocultar senha">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
                </label>
                <div className="mb-4 text-right"><a href="/esqueci-minha-senha" className="text-sm font-bold text-cyan-600 hover:underline dark:text-cyan-300">Esqueci minha senha</a></div>
                {loginError && <div className="mb-4 rounded-2xl bg-red-500/10 p-4 text-sm font-semibold text-red-500">{loginError}</div>}
                {!stateLoaded && <div className="mb-4 rounded-2xl bg-amber-500/10 p-4 text-sm font-semibold text-amber-600 dark:text-amber-300">Carregando dados do banco...</div>}
                {databaseError && <div className="mb-4 rounded-2xl bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300">{databaseError}</div>}
                <button disabled={!stateLoaded || Boolean(databaseError)} className="h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 font-black text-white shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">Entrar</button>
                <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">Você pode entrar pelo nome cadastrado, usuário ou e-mail em qualquer equipamento.</p>
              </form>
            ) : (
              <PendingRegistrationForm plans={activePlans} message={registerMessage} databaseError={databaseError} onRegister={onRegister} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function GlobalSearchBox({ globalSearch, setGlobalSearch, globalSuggestions, selectAsset, searchHistory, assets }: { globalSearch: string; setGlobalSearch: (value: string) => void; globalSuggestions: Asset[]; selectAsset: (asset: Asset, module?: ClientModuleId) => void; searchHistory: string[]; assets: Asset[] }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!containerRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  const choose = (asset: Asset) => { setOpen(false); setGlobalSearch(""); selectAsset(asset); };
  return <div ref={containerRef} className="relative mb-6"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={globalSearch} onFocus={() => setOpen(Boolean(globalSearch.trim()))} onChange={(event) => { setGlobalSearch(event.target.value); setOpen(Boolean(event.target.value.trim())); setActiveIndex(0); }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); event.currentTarget.blur(); } else if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => Math.min(value + 1, globalSuggestions.length - 1)); } else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => Math.max(value - 1, 0)); } else if (event.key === "Enter" && open && globalSuggestions[activeIndex]) { event.preventDefault(); choose(globalSuggestions[activeIndex]); } }} role="combobox" aria-expanded={open} aria-autocomplete="list" placeholder="Pesquisar em toda a plataforma: ticker, nome, setor, segmento ou tipo..." className="h-14 w-full rounded-3xl border border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400" />{globalSearch && <button type="button" onClick={() => { setGlobalSearch(""); setOpen(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Limpar busca"><X className="h-4 w-4" /></button>}{open && globalSearch.trim() && <div role="listbox" className="absolute top-16 z-50 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-premium dark:border-white/10 dark:bg-slate-900"><div className="border-b border-slate-100 p-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-white/10">Sugestões instantâneas</div>{globalSuggestions.map((asset, index) => <button key={asset.ticker} type="button" role="option" aria-selected={activeIndex === index} onPointerDown={(event) => event.preventDefault()} onClick={() => choose(asset)} className={cls("flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/5", activeIndex === index && "bg-cyan-500/10")}><span><strong>{asset.ticker}</strong><span className="ml-2 text-sm text-slate-500 dark:text-slate-300">{asset.name}</span></span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-white/10">{typeLabels[asset.type]}</span></button>)}{globalSuggestions.length === 0 && <p className="p-4 text-sm text-slate-500 dark:text-slate-300">Nenhum ativo encontrado.</p>}<div className="flex flex-wrap gap-2 border-t border-slate-100 p-3 text-xs dark:border-white/10">{searchHistory.length > 0 && <span className="text-slate-400">Histórico:</span>}{searchHistory.map((ticker) => <button type="button" key={ticker} onClick={() => choose(getAsset(ticker, assets))} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-white/10">{ticker}</button>)}</div></div>}</div>;
}
function Section({ title, subtitle, eyebrow, children }: { title: string; subtitle: string; eyebrow: string; children: React.ReactNode }) {
  return <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}><div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-500">{eyebrow}</p><h2 className="mt-2 text-3xl font-black tracking-tight lg:text-4xl">{title}</h2><p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">{subtitle}</p></div>{children}</motion.section>;
}
function PremiumCard({ title, description, icon: Icon, children }: { title: string; description: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/80"><div className="mb-5 flex items-start gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-500"><Icon className="h-5 w-5" /></div><div><h3 className="text-lg font-black">{title}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{description}</p></div></div>{children}</div>;
}
function FreeAccessSummary({ text }: { text: string }) {
  return <div className="rounded-lg border border-cyan-300 bg-cyan-500/10 p-4 text-sm font-semibold text-cyan-900 dark:border-cyan-400/30 dark:text-cyan-100">{text}</div>;
}

function FreeOpportunityList({ assets, onSelect }: { assets: Asset[]; onSelect: (asset: Asset) => void }) {
  return <div className="space-y-2">{assets.map((asset, index) => <button key={asset.ticker} type="button" onClick={() => onSelect(asset)} className="grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left dark:border-white/10 dark:bg-white/5"><span className="grid h-9 w-9 place-items-center rounded-md bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">{index + 1}</span><span className="min-w-0"><strong className="block">{asset.ticker}</strong><span className="block truncate text-xs text-slate-500 dark:text-slate-300">{asset.name}</span></span><span className="text-right"><strong className="block">{money.format(asset.price)}</strong><span className={cls("text-xs font-bold", asset.changeDay > 0 ? "text-emerald-600 dark:text-emerald-300" : asset.changeDay < 0 ? "text-red-600 dark:text-red-300" : "text-slate-500")}>{signedPct(asset.changeDay)}</span></span></button>)}{!assets.length && <p className="p-4 text-sm text-slate-500 dark:text-slate-300">Nenhuma oportunidade disponível com os dados atuais.</p>}<p className="rounded-lg bg-slate-100 p-3 text-center text-sm font-bold text-slate-700 dark:bg-white/5 dark:text-slate-200">Veja todas as oportunidades no Plano Premium.</p></div>;
}

function UpgradeNotice({ title, description, onUpgrade }: { title: string; description: string; onUpgrade: () => void }) {
  return <div className="mt-6 rounded-lg border border-amber-300 bg-amber-500/10 p-5 dark:border-amber-400/30"><div className="flex items-start gap-3"><Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" /><div><h3 className="font-black text-slate-950 dark:text-white">{title}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p></div></div><button type="button" onClick={onUpgrade} className="mt-4 rounded-md bg-cyan-600 px-4 py-2.5 text-sm font-black text-white">Conhecer Planos</button></div>;
}

function FreeMethodExplanation({ method, description, onUpgrade }: { method: string; description: string; onUpgrade: () => void }) {
  return <Section title={method} subtitle="Explicação educacional disponível no Plano FREE." eyebrow="Métodos de análise"><div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0f172a]"><h3 className="text-xl font-black">Entenda o método</h3><p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">{description}</p><p className="mt-4 rounded-md bg-amber-500/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">Os métodos são referências analíticas e não constituem recomendação de investimento.</p><UpgradeNotice title="Cálculos completos" description="Valor intrínseco, scores, preço justo, margem de segurança e cenários completos fazem parte dos planos pagos." onUpgrade={onUpgrade} /></div></Section>;
}
function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: string }) {
  const tones: Record<string, string> = { teal: "from-teal-400 to-cyan-500", green: "from-emerald-400 to-green-600", red: "from-red-400 to-rose-600", blue: "from-sky-400 to-blue-600", purple: "from-violet-400 to-purple-600", amber: "from-amber-400 to-orange-500", slate: "from-slate-500 to-slate-800" };
  return <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/80"><div className={cls("mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white", tones[tone])}><Icon className="h-5 w-5" /></div><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-2xl font-black tracking-tight">{value}</p></div>;
}
function AssetCard({ asset, favorites, onSelect, onFavorite }: { asset: Asset; favorites: string[]; onSelect: () => void; onFavorite: () => void }) {
  const source = externalDataSourceLabel(asset.sourceLabel, asset.source);
  return (
    <div className="asset-metrics-container min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <button onClick={onSelect} className="min-w-0 flex-1 text-left" title={asset.name}>
          <p className="overflow-wrap-anywhere text-xs text-slate-500 dark:text-slate-300">{typeLabels[asset.type]} • {asset.segment}</p>
          <h3 className="mt-1 text-xl font-black">{asset.ticker}</h3>
          <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{asset.name}</p>
          <p className="mt-2 break-words text-xs font-bold text-cyan-700 dark:text-cyan-300">Fonte dos dados: {source}</p>
        </button>
        <button onClick={onFavorite} className="shrink-0 rounded-xl bg-white p-2 dark:bg-white/10" title={favorites.includes(asset.ticker) ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-label={favorites.includes(asset.ticker) ? "Remover " + asset.ticker + " dos favoritos" : "Adicionar " + asset.ticker + " aos favoritos"}>
          <Star className={cls("h-4 w-4", favorites.includes(asset.ticker) && "fill-amber-400 text-amber-400")} />
        </button>
      </div>
      <AssetMetricsGrid price={asset.price} changeDay={asset.changeDay} score={asset.score} assetType={asset.type} />
    </div>
  );
}

function AssetPanel({ asset, favorites, setFavorites, onAddToPortfolio, onOpenFiiAnalysis, cryptoAnalysis, onOpenCryptoAnalysis, basicMode = false }: { asset: Asset; favorites: string[]; setFavorites: React.Dispatch<React.SetStateAction<string[]>>; onAddToPortfolio: (asset: Asset) => void; onOpenFiiAnalysis?: (asset: Asset) => void; cryptoAnalysis?: AlfatecCryptoAnalysis | null; onOpenCryptoAnalysis?: (asset: Asset) => void; basicMode?: boolean }) {
  const isFavorite = favorites.includes(asset.ticker);
  const source = externalDataSourceLabel(asset.sourceLabel, asset.source);
  return (
    <PremiumCard title="Página do ativo" description="Informações, indicadores, IA e fundamentos." icon={ShieldCheck}>
      <div className="asset-metrics-container min-w-0 rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="break-words text-sm text-cyan-300">{typeLabels[asset.type]} • {asset.segment}</p>
            <h3 className="mt-1 text-3xl font-black">{asset.ticker}</h3>
            <p className="break-words text-slate-300" title={asset.name}>{asset.name}</p>
            <p className="mt-2 break-words text-xs text-slate-300">Fonte dos dados: {source}</p>
          </div>
          <button onClick={() => setFavorites((current) => isFavorite ? current.filter((ticker) => ticker !== asset.ticker) : [asset.ticker, ...current])} className="shrink-0 rounded-2xl bg-white/10 p-3 hover:bg-white/20" aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
            <Star className={cls("h-5 w-5", isFavorite && "fill-amber-400 text-amber-400")} />
          </button>
        </div>
        <AssetMetricsGrid dark price={asset.price} changeDay={asset.changeDay} score={asset.score} assetType={asset.type} />
      </div>
      {basicMode ? (
        <div className="mt-4 rounded-lg border border-cyan-300 bg-cyan-500/10 p-4 text-sm text-cyan-900 dark:border-cyan-400/30 dark:text-cyan-100">
          <strong>Visão básica do Plano FREE.</strong> Cotação, variação diária, gráfico e informações essenciais permanecem disponíveis. Indicadores avançados e análises completas fazem parte dos planos pagos.
        </div>
      ) : (
        <>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoTile label="Mercado" value={asset.market} /><InfoTile label="Setor" value={asset.sector} />
        <InfoTile label="Liquidez" value={compactMoney.format(asset.liquidity)} /><InfoTile label="Risco" value={asset.risk} />
        <InfoTile label="Dividend Yield" value={pct(asset.metrics.dividendYield)} /><InfoTile label="P/VP" value={metric(asset.metrics.pvp)} />
        <InfoTile label="P/L" value={metric(asset.metrics.pl)} /><InfoTile label="ROE" value={pct(asset.metrics.roe)} />
      </div>
      <div className="mt-4 rounded-3xl border border-slate-200 p-4 dark:border-white/10">
        <p className="mb-2 text-sm font-black">Resumo IA do ativo</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">{asset.summary}</p>
        <ul className="mt-3 space-y-2">{generateAiNotes(asset).map((note) => <li key={note} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />{note}</li>)}</ul>
      </div>
      {asset.type === "FII" && <FiiAssetMiniSummary asset={asset} onOpen={() => onOpenFiiAnalysis?.(asset)} />}
      {asset.type === "CRIPTO" && <CryptoMiniSummary analysis={cryptoAnalysis ?? null} onOpen={() => onOpenCryptoAnalysis?.(asset)} />}
        </>
      )}
      <IncomeEventsCard asset={asset} compact={basicMode} />
      <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
        <strong>Consulta externa:</strong> Yahoo Finance. O destino de consulta pode ser diferente da fonte usada pela plataforma.
      </div>
      <ExternalFinanceLink ticker={asset.ticker} assetType={asset.type} className="mt-4 w-full" />
      <button onClick={() => onAddToPortfolio(asset)} className="mt-3 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-bold text-white">Adicionar à carteira</button>
    </PremiumCard>
  );
}
function FiiAssetMiniSummary({ asset, onOpen }: { asset: Asset; onOpen: () => void }) {
  const analysis = analisarAlfatecFii(asset);
  return <div className="mt-4 rounded-3xl border border-cyan-400/30 bg-cyan-500/10 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">Método AlfaTec FIIs</p><p className="mt-1 font-black">Score AlfaTec FIIs: {analysis.score === null ? "dados insuficientes" : `${analysis.score}/100`} · {analysis.classification}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{analysis.kindLabel}. Confiança: {analysis.confidence === "Media" ? "Média" : analysis.confidence}. {analysis.valuationInterpretation}.</p></div><button type="button" onClick={onOpen} className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-white">Ver análise completa</button></div></div>;
}

function InfoTile({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return <div className={cls("rounded-2xl p-3", dark ? "bg-white/10" : "bg-slate-50 dark:bg-white/5")}><p className={cls("text-xs", dark ? "text-slate-300" : "text-slate-500")}>{label}</p><p className="mt-1 font-black">{value}</p></div>;
}
function SearchBox({ label, value, onChange, assets, onSelect }: { label: string; value: string; onChange: (value: string) => void; assets: Asset[]; onSelect: (asset: Asset) => void }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestions = searchAssets(value, "TODOS", assets).slice(0, 6);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!containerRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  const choose = (asset: Asset) => { setOpen(false); onSelect(asset); };
  return <div ref={containerRef} className="relative"><label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</label><Search className="pointer-events-none absolute left-4 top-[43px] h-5 w-5 text-slate-400" /><input value={value} onFocus={() => setOpen(Boolean(value.trim()))} onChange={(event) => { onChange(event.target.value); setOpen(Boolean(event.target.value.trim())); setActiveIndex(0); }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); event.currentTarget.blur(); } else if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1)); } else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); } else if (event.key === "Enter" && suggestions[activeIndex]) { event.preventDefault(); choose(suggestions[activeIndex]); } }} role="combobox" aria-expanded={open} aria-autocomplete="list" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-950 outline-none placeholder:text-slate-400 focus:border-cyan-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400" placeholder="Digite ticker ou nome" />{open && value.trim() && <div role="listbox" className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-premium dark:border-white/10 dark:bg-slate-900">{suggestions.map((asset, index) => <button key={asset.ticker} type="button" role="option" aria-selected={activeIndex === index} onPointerDown={(event) => event.preventDefault()} onClick={() => choose(asset)} className={cls("flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5", activeIndex === index && "bg-cyan-500/10")}><span><strong>{asset.ticker}</strong><span className="ml-2 text-slate-500 dark:text-slate-300">{asset.name}</span></span><span className="text-xs text-slate-400">{typeLabels[asset.type]}</span></button>)}{suggestions.length === 0 && <p className="p-4 text-sm text-slate-500 dark:text-slate-300">Nenhum ativo encontrado.</p>}</div>}</div>;
}
function PerformancePill({ asset, value }: { asset: Asset; value: number }) {
  return <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{asset.name}</p><p className="text-xl font-black">{asset.ticker}</p></div><div className={cls("flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black", value >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>{value >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}{pct(value)}</div></div></div>;
}
function ComparisonRecommendationCard({ recommendation, a, b, returnA, returnB }: { recommendation: ReturnType<typeof buildComparisonRecommendation>; a: Asset; b: Asset; returnA: number; returnB: number }) {
  const winnerDividend = dividendPerShare(recommendation.winner);
  return (
    <PremiumCard title="Mais indicada pelo radar" description="Leitura comparativa entre os dois ativos selecionados." icon={ShieldCheck}>
      <div className="rounded-3xl bg-slate-950 p-5 text-white dark:bg-white/10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Ativo em destaque</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-4xl font-black">{recommendation.winner.ticker}</h3>
            <p className="mt-1 text-sm text-slate-300">{recommendation.winner.name}</p>
          </div>
          <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-sm font-black text-cyan-200">Score {recommendation.winner === a ? recommendation.scoreA : recommendation.scoreB}/100</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoTile label={a.ticker} value={`${recommendation.scoreA}/100 • ${pct(returnA)}`} />
        <InfoTile label={b.ticker} value={`${recommendation.scoreB}/100 • ${pct(returnB)}`} />
        <InfoTile label="Dividendos" value={`${dividendFrequency(recommendation.winner)} • ${winnerDividend === undefined ? "-" : money.format(winnerDividend)}`} />
        <InfoTile label="Risco" value={recommendation.winner.risk} />
      </div>
      <ul className="mt-4 space-y-2">
        {recommendation.reasons.map((reason) => <li key={reason} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />{reason}</li>)}
      </ul>
      <p className="mt-4 rounded-2xl bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300">Resumo automatizado: {recommendation.winner.ticker} aparece mais forte que {recommendation.loser.ticker} neste recorte por combinar score, retorno no período, dividendos e risco. Use como apoio de análise, não como recomendação personalizada.</p>
    </PremiumCard>
  );
}
function ComparisonTable({ a, b }: { a: Asset; b: Asset }) {
  const dividendA = dividendPerShare(a);
  const dividendB = dividendPerShare(b);
  const annualDividendA = annualDividendPerShare(a);
  const annualDividendB = annualDividendPerShare(b);
  const rows = [
    ["Preço", money.format(a.price), money.format(b.price)],
    ["Dividend Yield", pct(a.metrics.dividendYield), pct(b.metrics.dividendYield)],
    ["Frequência dos dividendos", dividendFrequency(a), dividendFrequency(b)],
    ["Dividendo por ação/cota", dividendA === undefined ? "-" : money.format(dividendA), dividendB === undefined ? "-" : money.format(dividendB)],
    ["Dividendo anual por ação/cota", annualDividendA === undefined ? "-" : money.format(annualDividendA), annualDividendB === undefined ? "-" : money.format(annualDividendB)],
    ["P/L", metric(a.metrics.pl), metric(b.metrics.pl)],
    ["P/VP", metric(a.metrics.pvp), metric(b.metrics.pvp)],
    ["ROE", pct(a.metrics.roe), pct(b.metrics.roe)],
    ["CAGR", pct(a.metrics.cagr), pct(b.metrics.cagr)],
    ["Volatilidade", pct(a.metrics.volatility), pct(b.metrics.volatility)],
    ["Drawdown", pct(a.metrics.drawdown), pct(b.metrics.drawdown)],
    ["Liquidez", compactMoney.format(a.liquidity), compactMoney.format(b.liquidity)],
    ["Risco", a.risk, b.risk]
  ];
  return <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 text-sm dark:border-white/10"><div className="grid grid-cols-3 bg-slate-50 p-3 font-bold dark:bg-white/5"><span>Indicador</span><span>{a.ticker}</span><span>{b.ticker}</span></div>{rows.map((row) => <div key={row[0]} className="grid grid-cols-3 border-t border-slate-100 p-3 dark:border-white/10"><span className="text-slate-500 dark:text-slate-300">{row[0]}</span><strong>{row[1]}</strong><strong>{row[2]}</strong></div>)}</div>;
}

function GrahamOpportunityTable({ assets, onSelect }: { assets: Asset[]; onSelect: (asset: Asset) => void }) {
  return <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500 dark:text-slate-300"><th className="p-3">Ticker</th><th className="p-3">Preço</th><th className="p-3">Valor de Graham</th><th className="p-3">Margem</th><th className="p-3">Potencial Graham</th><th className="p-3">Situação</th><th className="p-3">Score</th></tr></thead><tbody>{assets.map((asset) => { const graham = analisarNumeroGraham(asset); return <tr key={asset.ticker} onClick={() => onSelect(asset)} className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"><td className="p-3 font-black">{asset.ticker}<p className="text-xs font-normal text-slate-500 dark:text-slate-300">{asset.name}</p></td><td className="p-3">{money.format(asset.price)}</td><td className="p-3 font-black">{graham.value === undefined ? "-" : money.format(graham.value)}</td><td className="p-3">{graham.safetyMargin === undefined ? "-" : pct(graham.safetyMargin)}</td><td className="p-3">{graham.potential === undefined ? "-" : pct(graham.potential)}</td><td className="p-3">{graham.classification ?? "Dados insuficientes"}</td><td className="p-3 font-black text-cyan-600 dark:text-cyan-300">{asset.score}/100</td></tr>; })}</tbody></table>{assets.length === 0 && <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Nenhum ativo atende aos filtros atuais.</p>}<p className="mt-4 rounded-2xl bg-cyan-500/10 p-3 text-xs font-semibold text-cyan-700 dark:text-cyan-300">O Número de Graham é combinado com liquidez, rentabilidade, endividamento, ROE, P/L, P/VP, histórico, volatilidade e qualidade dos dados. Ele não é critério único de oportunidade.</p></div>;
}

function RadarGrahamFilters({ grahamOnly, setGrahamOnly, minMargin, setMinMargin, minPotential, setMinPotential, maxPl, setMaxPl, maxPvp, setMaxPvp, minLiquidity, setMinLiquidity, minRoe, setMinRoe, maxDebt, setMaxDebt }: { grahamOnly: boolean; setGrahamOnly: (value: boolean) => void; minMargin: number; setMinMargin: (value: number) => void; minPotential: number; setMinPotential: (value: number) => void; maxPl: number; setMaxPl: (value: number) => void; maxPvp: number; setMaxPvp: (value: number) => void; minLiquidity: number; setMinLiquidity: (value: number) => void; minRoe: number; setMinRoe: (value: number) => void; maxDebt: number; setMaxDebt: (value: number) => void }) {
  return <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"><p className="mb-3 text-sm font-black">Filtros de Graham e risco</p><div className="grid gap-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={grahamOnly} onChange={(e) => setGrahamOnly(e.target.checked)} />Preço abaixo do Número de Graham</label><Input label="Margem de segurança maior que (%)" type="number" value={minMargin} onChange={(e) => setMinMargin(Number(e.target.value))} /><Input label="Potencial maior que (%)" type="number" value={minPotential} onChange={(e) => setMinPotential(Number(e.target.value))} /><Input label="P/L abaixo de" type="number" value={maxPl} onChange={(e) => setMaxPl(Number(e.target.value))} /><Input label="P/VP abaixo de" type="number" value={maxPvp} onChange={(e) => setMaxPvp(Number(e.target.value))} /><Input label="Liquidez mínima" type="number" value={minLiquidity} onChange={(e) => setMinLiquidity(Number(e.target.value))} /><Input label="ROE mínimo (%)" type="number" value={minRoe} onChange={(e) => setMinRoe(Number(e.target.value))} /><Input label="Dívida máxima" type="number" value={maxDebt} onChange={(e) => setMaxDebt(Number(e.target.value))} /></div><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">O Número de Graham contribui como componente do valuation e não ultrapassa 15% do score total.</p></div>;
}

function GrahamValuationSection({ assets, selectedAsset, search, setSearch, setSelectedAsset, currentUser, settings, saveSettings, growth, setGrowth, y, setY }: { assets: Asset[]; selectedAsset: Asset; search: string; setSearch: (value: string) => void; setSelectedAsset: (asset: Asset) => void; currentUser: Account; settings: GrahamSettings; saveSettings: (patch: Partial<GrahamSettings>) => void; growth: number; setGrowth: (value: number) => void; y: number; setY: (value: number) => void }) {
  const graham = analisarNumeroGraham(selectedAsset);
  const inputs = deriveGrahamInputs(selectedAsset);
  const growthValue = inputs.lpa ? calcularGrahamCrescimento(inputs.lpa, growth, y) : null;
  const growthPotential = growthValue === null ? null : calcularPotencial(growthValue, selectedAsset.price);
  const growthMargin = growthValue === null ? null : calcularMargemSeguranca(growthValue, selectedAsset.price);
  const scenarios = aplicarPrecoNosCenarios(calcularCenariosGraham(inputs.lpa ?? 0, y, growth, currentUser.role === "ADMIN" ? "administrador" : "usuario"), selectedAsset.price);
  const canEdit = currentUser.role === "ADMIN" || settings.clientsCanEditGrowth || settings.clientsCanEditY;
  const warning = growth > settings.maxGrowth ? "Taxas elevadas de crescimento podem produzir resultados excessivamente otimistas." : undefined;

  return <Section title="Valuation Graham" subtitle="Dois métodos de Benjamin Graham com fontes, datas, premissas e limitações visíveis." eyebrow="Valuation"><div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]"><div className="space-y-6"><PremiumCard title="Pesquisar ativo" description="Selecione uma ação para calcular os métodos." icon={Search}><SearchBox label="Ativo" value={search} onChange={setSearch} assets={assets} onSelect={(asset) => { setSelectedAsset(asset); setSearch(asset.ticker); }} /><div className="mt-4 grid gap-3 sm:grid-cols-2"><InfoTile label="Ativo" value={`${selectedAsset.ticker} - ${selectedAsset.name}`} /><InfoTile label="Última atualização" value={new Date(selectedAsset.lastUpdatedAt ?? selectedAsset.updatedAt).toLocaleString("pt-BR")} /><InfoTile label="Fonte" value={externalDataSourceLabel(selectedAsset.sourceLabel, selectedAsset.source)} /><InfoTile label="Tipo" value={typeLabels[selectedAsset.type]} /></div></PremiumCard>{currentUser.role === "ADMIN" && <PremiumCard title="Configuração administrativa" description="Parâmetros oficiais para Y, crescimento e score." icon={Settings}><div className="grid gap-3"><Input label="Y padrão (%)" type="number" step="0.1" value={settings.defaultY} onChange={(e) => saveSettings({ defaultY: Number(e.target.value) })} /><Input label="Crescimento mínimo (%)" type="number" value={settings.minGrowth} onChange={(e) => saveSettings({ minGrowth: Number(e.target.value) })} /><Input label="Crescimento máximo recomendado (%)" type="number" value={settings.maxGrowth} onChange={(e) => saveSettings({ maxGrowth: Number(e.target.value) })} /><Input label="Peso Graham no score" type="number" max="15" value={settings.scoreWeight} onChange={(e) => saveSettings({ scoreWeight: Math.min(15, Number(e.target.value)) })} /><Toggle label="Cálculo ativo" checked={settings.enabled} onChange={(value) => saveSettings({ enabled: value })} /><Toggle label="Cliente edita crescimento" checked={settings.clientsCanEditGrowth} onChange={(value) => saveSettings({ clientsCanEditGrowth: value })} /><Toggle label="Cliente edita Y" checked={settings.clientsCanEditY} onChange={(value) => saveSettings({ clientsCanEditY: value })} /></div><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Y exibido como parâmetro configurado pelo administrador quando não houver integração confiável para títulos corporativos AAA.</p></PremiumCard>}<GrahamExplanation /></div><div className="space-y-6"><IncomeEventsCard asset={selectedAsset} /><GrahamNumberCard analysis={graham} /><GrahamGrowthCard price={selectedAsset.price} lpa={inputs.lpa} growth={growth} y={y} value={growthValue} potential={growthPotential} safetyMargin={growthMargin} sourceLabel={`Crescimento informado pelo usuário; Y: Parâmetro configurado pelo administrador`} updatedAt={new Date().toISOString()} scenarios={scenarios} warning={warning} canEdit={canEdit} onGrowthChange={(value) => settings.clientsCanEditGrowth || currentUser.role === "ADMIN" ? setGrowth(value) : undefined} onYChange={(value) => settings.clientsCanEditY || currentUser.role === "ADMIN" ? setY(value) : undefined} /></div></div></Section>;
}


function AlfatecFiiSection({ assets, selectedAsset, search, setSearch, setSelectedAsset, currentUser, settings, saveSettings, filters, setFilters, segments, opportunities }: { assets: Asset[]; selectedAsset: Asset; search: string; setSearch: (value: string) => void; setSelectedAsset: (asset: Asset) => void; currentUser: Account; settings: AlfatecFiiSettings; saveSettings: (patch: Partial<AlfatecFiiSettings>) => void; filters: FiiOpportunityFilterState; setFilters: React.Dispatch<React.SetStateAction<FiiOpportunityFilterState>>; segments: string[]; opportunities: Array<{ asset: Asset; analysis: AlfatecFiiAnalysis }> }) {
  const analysis = analisarAlfatecFii(selectedAsset, settings);
  const comparison = compararFiiPorSegmento(selectedAsset, assets, settings);
  const kindWeights = settings.weightsByKind[analysis.kind] ?? settings.weightsByKind.outro;
  const fiiAssets = assets.filter((asset) => asset.type === "FII");

  function updateKindWeight(key: keyof typeof kindWeights, value: number) {
    saveSettings({ weightsByKind: { ...settings.weightsByKind, [analysis.kind]: { ...kindWeights, [key]: value } } });
  }

  return <Section title="Método AlfaTec FIIs" subtitle="Análise própria para fundos imobiliários, sem usar Graham, PEG ou P/L como método principal." eyebrow="Fundos imobiliários"><div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]"><div className="space-y-6"><PremiumCard title="Pesquisar FII" description="Selecione um fundo imobiliário real para analisar." icon={Search}><SearchBox label="Ticker ou nome do FII" value={search} onChange={setSearch} assets={fiiAssets} onSelect={(asset) => { setSelectedAsset(asset); setSearch(asset.ticker); }} /><div className="mt-4 grid gap-3 sm:grid-cols-2"><InfoTile label="Ativo" value={`${selectedAsset.ticker} - ${selectedAsset.name}`} /><InfoTile label="Tipo" value={analysis.kindLabel} /><InfoTile label="Última atualização" value={new Date(analysis.updatedAt).toLocaleString("pt-BR")} /><InfoTile label="Fonte do preço" value={analysis.price.source} /></div></PremiumCard><PremiumCard title="Entenda o método" description="Critérios, limitações e leitura correta da nota." icon={ShieldCheck}><div className="space-y-3 text-sm text-slate-600 dark:text-slate-300"><p>O Método AlfaTec FIIs combina indicadores financeiros, operacionais, patrimoniais e de risco. A ponderação muda conforme o tipo do fundo: tijolo, papel, híbrido, fundo de fundos, renda urbana, desenvolvimento, infraestrutura ou outro tipo compatível.</p><p>O método considera P/VP ajustado, Dividend Yield recorrente, prêmio de risco, liquidez, diversificação, risco do segmento, qualidade de dados e comparação com fundos semelhantes. P/VP abaixo de 1 e Dividend Yield alto nunca são usados isoladamente como oportunidade.</p><p className="rounded-2xl bg-amber-500/10 p-3 font-semibold text-amber-700 dark:text-amber-300">O Método AlfaTec FIIs é um modelo analítico próprio. A nota gerada não representa garantia de rendimento, valorização ou recomendação personalizada de investimento.</p></div></PremiumCard>{currentUser.role === "ADMIN" && <PremiumCard title="Configurações do Método AlfaTec FIIs" description="Pesos, taxa de referência e ativação do método." icon={Settings}><div className="grid gap-3"><Toggle label="Método ativo" checked={settings.enabled} onChange={(value) => saveSettings({ enabled: value })} /><Input label="Taxa de referência (%)" type="number" step="0.1" value={settings.referenceRate} onChange={(e) => saveSettings({ referenceRate: Number(e.target.value), referenceRateSource: "Parâmetro configurado pelo administrador" })} /><Input label="Fonte da taxa" value={settings.referenceRateSource} onChange={(e) => saveSettings({ referenceRateSource: e.target.value })} /><Select label="Confiança mínima" value={settings.minimumConfidence} onChange={(e) => saveSettings({ minimumConfidence: e.target.value as AlfatecFiiSettings["minimumConfidence"] })}><option value="Alta">Alta</option><option value="Media">Média</option><option value="Baixa">Baixa</option><option value="Insuficiente">Insuficiente</option></Select><div className="rounded-3xl bg-slate-50 p-4 dark:bg-white/5"><p className="mb-2 text-sm font-black">Pesos para {analysis.kindLabel}</p>{(Object.keys(kindWeights) as Array<keyof typeof kindWeights>).map((key) => <WeightSlider key={key} label={`${key} (${kindWeights[key]}%)`} value={kindWeights[key]} onChange={(value) => updateKindWeight(key, value)} />)}</div></div></PremiumCard>}</div><div className="space-y-6"><IncomeEventsCard asset={selectedAsset} /><AlfatecFiiScoreCard analysis={analysis} /><FiiScoreBreakdown analysis={analysis} /><FiiSegmentComparison comparison={comparison} ticker={analysis.ticker} score={analysis.score} /><FiiDataSourceInfo analysis={analysis} /><PremiumCard title="Comparação com FIIs filtrados" description="Lista rápida com fundos compatíveis e filtros do método." icon={TrendingUp}><FiiOpportunityFilters value={filters} onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))} segments={segments} /><div className="mt-4"><FiiOpportunitiesTable items={opportunities.slice(0, 8)} onSelect={(asset) => { setSelectedAsset(asset); setSearch(asset.ticker); }} /></div></PremiumCard></div></div></Section>;
}

function FiiOpportunitiesTable({ items, onSelect }: { items: Array<{ asset: Asset; analysis: AlfatecFiiAnalysis }>; onSelect: (asset: Asset) => void }) {
  return <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500 dark:text-slate-300"><th className="p-3">Ticker</th><th className="p-3">Tipo</th><th className="p-3">Preço</th><th className="p-3">P/VP</th><th className="p-3">DY recorrente</th><th className="p-3">Prêmio</th><th className="p-3">Score AlfaTec FIIs</th><th className="p-3">Confiança</th><th className="p-3">Classificação</th></tr></thead><tbody>{items.map(({ asset, analysis }) => <tr key={asset.ticker} onClick={() => onSelect(asset)} className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"><td className="p-3 font-black">{asset.ticker}<p className="text-xs font-normal text-slate-500 dark:text-slate-300">{asset.name}</p></td><td className="p-3">{analysis.kindLabel}</td><td className="p-3">{money.format(asset.price)}</td><td className="p-3">{metric(fiiNumeric(analysis.pvp.value))}</td><td className="p-3">{pct(fiiNumeric(analysis.recurrentDividendYield.value))}</td><td className="p-3">{fiiNumeric(analysis.riskPremium.value) === undefined ? "-" : pp(fiiNumeric(analysis.riskPremium.value))}</td><td className="p-3 font-black text-cyan-600 dark:text-cyan-300">{analysis.score === null ? "Dados insuficientes" : `${analysis.score}/100`}</td><td className="p-3">{analysis.confidence === "Media" ? "Média" : analysis.confidence}</td><td className="p-3">{analysis.classification}</td></tr>)}</tbody></table>{items.length === 0 && <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Nenhum FII atende aos filtros atuais.</p>}<p className="mt-4 rounded-2xl bg-cyan-500/10 p-3 text-xs font-semibold text-cyan-700 dark:text-cyan-300">Oportunidades em FIIs usam o Método AlfaTec FIIs. Graham, PEG e P/L não são aplicados como método principal para fundos imobiliários.</p></div>;
}

function FiiComparison({ a, b, assets, settings }: { a: Asset; b: Asset; assets: Asset[]; settings: AlfatecFiiSettings }) {
  const analysisA = analisarAlfatecFii(a, settings);
  const analysisB = analisarAlfatecFii(b, settings);
  const best = (analysisA.score ?? -Infinity) >= (analysisB.score ?? -Infinity) ? analysisA : analysisB;
  const rows = [
    ["Score AlfaTec FIIs", analysisA.score === null ? "Dados insuficientes" : `${analysisA.score}/100`, analysisB.score === null ? "Dados insuficientes" : `${analysisB.score}/100`],
    ["Qualidade", metric(analysisA.scores.qualidade ?? undefined), metric(analysisB.scores.qualidade ?? undefined)],
    ["Renda", metric(analysisA.scores.renda ?? undefined), metric(analysisB.scores.renda ?? undefined)],
    ["Risco", metric(analysisA.scores.risco ?? undefined), metric(analysisB.scores.risco ?? undefined)],
    ["Valuation", metric(analysisA.scores.valuation ?? undefined), metric(analysisB.scores.valuation ?? undefined)],
    ["Gestão", metric(analysisA.scores.gestao ?? undefined), metric(analysisB.scores.gestao ?? undefined)],
    ["Liquidez", metric(analysisA.scores.liquidez ?? undefined), metric(analysisB.scores.liquidez ?? undefined)],
    ["Diversificação", metric(analysisA.scores.diversificacao ?? undefined), metric(analysisB.scores.diversificacao ?? undefined)],
    ["P/VP", metric(fiiNumeric(analysisA.pvp.value)), metric(fiiNumeric(analysisB.pvp.value))],
    ["DY recorrente", pct(fiiNumeric(analysisA.recurrentDividendYield.value)), pct(fiiNumeric(analysisB.recurrentDividendYield.value))],
    ["Prêmio de risco", fiiNumeric(analysisA.riskPremium.value) === undefined ? "Dado indisponível" : pp(fiiNumeric(analysisA.riskPremium.value)), fiiNumeric(analysisB.riskPremium.value) === undefined ? "Dado indisponível" : pp(fiiNumeric(analysisB.riskPremium.value))],
    ["Vacância", analysisA.vacancy.status === "nao_aplicavel" ? "Não aplicável ao tipo deste fundo" : pct(fiiNumeric(analysisA.vacancy.value)), analysisB.vacancy.status === "nao_aplicavel" ? "Não aplicável ao tipo deste fundo" : pct(fiiNumeric(analysisB.vacancy.value))],
    ["LTV", analysisA.ltv.status === "nao_aplicavel" ? "Não aplicável ao tipo deste fundo" : "Dado indisponível", analysisB.ltv.status === "nao_aplicavel" ? "Não aplicável ao tipo deste fundo" : "Dado indisponível"],
    ["Confiança", analysisA.confidence === "Media" ? "Média" : analysisA.confidence, analysisB.confidence === "Media" ? "Média" : analysisB.confidence]
  ];
  const comparisonA = compararFiiPorSegmento(a, assets, settings);
  const comparisonB = compararFiiPorSegmento(b, assets, settings);
  return <div className="mt-5 rounded-3xl border border-slate-200 p-4 dark:border-white/10"><h4 className="font-black">Comparação pelo Método AlfaTec FIIs</h4><p className="mt-2 rounded-2xl bg-cyan-500/10 p-3 text-sm font-semibold text-cyan-700 dark:text-cyan-300">Maior score segundo este método: {best.score === null ? "dados insuficientes" : best.ticker}. Isso não declara automaticamente o melhor investimento; serve como leitura analítica entre fundos compatíveis.</p><div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 text-sm dark:border-white/10"><div className="grid grid-cols-3 bg-slate-50 p-3 font-bold dark:bg-white/5"><span>Critério</span><span>{a.ticker}</span><span>{b.ticker}</span></div>{rows.map((row) => <div key={row[0]} className="grid grid-cols-3 border-t border-slate-100 p-3 dark:border-white/10"><span className="text-slate-500 dark:text-slate-300">{row[0]}</span><strong>{row[1]}</strong><strong>{row[2]}</strong></div>)}</div><div className="mt-4 grid gap-4 lg:grid-cols-2"><FiiSegmentComparison comparison={comparisonA} ticker={a.ticker} score={analysisA.score} /><FiiSegmentComparison comparison={comparisonB} ticker={b.ticker} score={analysisB.score} /></div></div>;
}

function FiiRadarTable({ items, onSelect }: { items: Array<{ asset: Asset; analysis: AlfatecFiiAnalysis }>; onSelect: (asset: Asset) => void }) {
  return <div className="space-y-3">{items.map(({ asset, analysis }, index) => <button key={asset.ticker} onClick={() => onSelect(asset)} className="flex w-full items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:scale-[1.01] dark:border-white/10 dark:bg-white/5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 font-black text-white dark:bg-white dark:text-slate-950">{index + 1}</span><span className="min-w-0 flex-1"><strong>{asset.ticker}</strong><span className="ml-2 text-sm text-slate-500 dark:text-slate-300">{asset.name}</span><p className="mt-1 text-xs text-slate-400">{analysis.kindLabel} · {asset.segment}</p><p className="mt-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300">Score AlfaTec FIIs: {analysis.score === null ? "dados insuficientes" : `${analysis.score}/100`} · Renda {analysis.scores.renda === null ? "indisponível" : Math.round(analysis.scores.renda)} · Valuation {analysis.scores.valuation === null ? "indisponível" : Math.round(analysis.scores.valuation)}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Confiança: {analysis.confidence === "Media" ? "Média" : analysis.confidence}. O método entra como componente identificado do Radar IA para FIIs.</p></span><span className="rounded-full bg-cyan-500/10 px-3 py-1 font-black text-cyan-600 dark:text-cyan-300">{analysis.score ?? "--"}</span></button>)}{items.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">Nenhum FII atende aos filtros do Radar IA.</p>}</div>;
}

function ClientPlanSection({ user, plans, payments, upgradeResource = null }: { user: Account; plans: Plan[]; payments: Payment[]; upgradeResource?: "comparador" | "radar" | null }) {
  const plan = plans.find((item) => item.id === user.planId);
  const free = isFreePlan(user.planId, plan?.name);
  const freeBenefits = getFreePlanBenefits(plan);
  const lastPayment = [...payments].filter((payment) => payment.clientId === user.id).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0];
  const days = calcularDiasRestantes(user.dueDate ?? todayIso());
  const status = planVisualStatus(user);
  const alert = planAlertText(user);
  const paidPlans = plans.filter((item) => item.status === "ativo" && !isFreePlan(item.id, item.name) && item.value > 0);
  const lockedName = upgradeResource === "comparador" ? "Comparador Inteligente" : "Radar IA";
  const lockedDescription = upgradeResource === "comparador"
    ? "Compare ativos, indicadores, rentabilidade, risco e desempenho histórico nos planos pagos."
    : "Acesse análises inteligentes, filtros avançados e identificação automatizada de oportunidades nos planos pagos.";

  return <Section title="Plano" subtitle="Assinatura, vencimento, dias restantes e recursos liberados." eyebrow="Meu acesso">
    {upgradeResource && <UpgradeNotice title={`${lockedName} disponível nos planos pagos`} description={lockedDescription} onUpgrade={() => document.getElementById("upgrade-planos")?.scrollIntoView({ behavior: "smooth", block: "start" })} />}
    <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <PremiumCard title="Plano atual" description="Valor contratado e validade do acesso." icon={WalletCards}>
        <div className="grid gap-3 sm:grid-cols-2"><InfoTile label="Plano" value={free ? freePlanDisplayName(plan?.name) : plan?.name ?? "Sem plano"} /><InfoTile label="Valor" value={money.format(user.planValue ?? plan?.value ?? 0)} /><InfoTile label="Início" value={user.planStartedAt ? new Date(user.planStartedAt).toLocaleDateString("pt-BR") : "-"} /><InfoTile label="Vencimento" value={free ? "Sem vencimento" : user.dueDate ? new Date(user.dueDate).toLocaleDateString("pt-BR") : "-"} /><InfoTile label="Duração" value={free ? "Sem prazo de expiração" : `${plan?.durationDays ?? 0} dias`} /><InfoTile label="Dias restantes" value={free ? "Acesso gratuito" : `${days} dias`} /><InfoTile label="Renovação automática" value={free ? "Não se aplica" : "Conforme contratação"} /><InfoTile label="Status" value={status.label} /><InfoTile label="Último pagamento" value={free ? "Não se aplica" : lastPayment ? money.format(lastPayment.value) : "-"} /></div>
        {alert && !free && <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm font-bold text-amber-700 dark:text-amber-300">{alert}</p>}
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">{free ? "O Plano FREE mantém os recursos básicos e permite upgrade a qualquer momento." : status.detail}</p>
        <a href="mailto:alfatecinvestpro@gmail.com" className="mt-4 inline-flex rounded-md bg-cyan-600 px-5 py-3 font-bold text-white">Entrar em contato com o administrador</a>
      </PremiumCard>
      {free ? <PremiumCard title="Benefícios do Plano FREE" description="Recursos básicos disponíveis na conta." icon={ShieldCheck}><div className="grid gap-2 sm:grid-cols-2">{freeBenefits.map((item) => <p key={item} className="rounded-md bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">Liberado - {item}</p>)}{freePlanLockedFeatures.map((item) => <p key={item} className="rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300">Bloqueado - {item}</p>)}</div></PremiumCard> : <PremiumCard title="Menus liberados" description="Recursos disponíveis conforme plano e permissões do cliente." icon={ShieldCheck}><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{clientModules.map((module) => <div key={module.id} className={cls("rounded-md p-3 text-sm font-bold", user.permissions.includes(module.id) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400")}>{user.permissions.includes(module.id) ? "Liberado" : "Bloqueado"} - {module.label}</div>)}</div></PremiumCard>}
    </div>
    <div id="upgrade-planos" className="mt-6 scroll-mt-24"><h3 className="mb-4 text-xl font-black">{free ? "Fazer upgrade" : "Assinar ou renovar plano"}</h3><MercadoPagoLinkCheckout plans={paidPlans} currentPlanId={free ? undefined : user.planId} userName={user.name} userEmail={user.email} /></div>
  </Section>;
}
function PlanPriceEditor({ plan, onUpdatePlan }: { plan: Plan; onUpdatePlan: (planId: string, patch: Partial<Plan>, notes?: string) => void }) {
  const [value, setValue] = useState(plan.value);
  const [durationDays, setDurationDays] = useState(plan.durationDays);
  const [status, setStatus] = useState<Plan["status"]>(plan.status);
  const [notes, setNotes] = useState(plan.notes ?? "");
  useEffect(() => { setValue(plan.value); setDurationDays(plan.durationDays); setStatus(plan.status); setNotes(plan.notes ?? ""); }, [plan]);
  return <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"><div className="flex items-center justify-between gap-3"><div><h4 className="font-black">Plano {plan.name}</h4><p className="text-xs text-slate-500 dark:text-slate-400">Atualizado por {plan.updatedBy ?? "Sistema"} em {plan.updatedAt ? new Date(plan.updatedAt).toLocaleString("pt-BR") : "-"}</p></div><StatusPill status={status === "ativo" ? "ativo" : "bloqueado"} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input label="Valor atual" type="number" step="0.01" value={value} onChange={(e) => setValue(Number(e.target.value))} /><Input label="Duração em dias" type="number" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} /><Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as Plan["status"])}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></Select><Input label="Observação" value={notes} onChange={(e) => setNotes(e.target.value)} /></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => onUpdatePlan(plan.id, { value, durationDays, status, notes }, notes)} className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-white">Salvar</button><button type="button" onClick={() => { setValue(plan.value); setDurationDays(plan.durationDays); setStatus(plan.status); setNotes(plan.notes ?? ""); }} className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-100">Cancelar</button><button type="button" onClick={() => { const next = status === "ativo" ? "inativo" : "ativo"; setStatus(next); onUpdatePlan(plan.id, { status: next }, notes); }} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-950">{status === "ativo" ? "Desativar" : "Ativar"}</button></div></div>;
}

function PlanValuesManager({ plans, history, clients, payments, onUpdatePlan }: { plans: Plan[]; history: PlanPriceHistory[]; clients: Account[]; payments: Payment[]; onUpdatePlan: (planId: string, patch: Partial<Plan>, notes?: string) => void }) {
  const monthlyForecast = clients.filter((client) => client.status === "ativo").reduce((sum, client) => sum + (client.planValue ?? plans.find((plan) => plan.id === client.planId)?.value ?? 0), 0);
  const expiringSeven = clients.filter((client) => calcularDiasRestantes(client.dueDate ?? todayIso()) <= 7 && !isExpired(client.dueDate)).length;
  return <PremiumCard title="Valores dos Planos" description="Fonte única de verdade para novos cadastros, renovações e cobranças." icon={CircleDollarSign}><div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><InfoTile label="Valor semanal" value={money.format(plans.find((plan) => plan.id === "semanal")?.value ?? 0)} /><InfoTile label="Valor mensal" value={money.format(plans.find((plan) => plan.id === "mensal")?.value ?? 0)} /><InfoTile label="Valor anual" value={money.format(plans.find((plan) => plan.id === "anual")?.value ?? 0)} /><InfoTile label="Receita mensal prevista" value={money.format(monthlyForecast)} /><InfoTile label="Receita anual prevista" value={money.format(monthlyForecast * 12)} /><InfoTile label="Planos vencendo em 7 dias" value={String(expiringSeven)} /></div><div className="grid gap-4 xl:grid-cols-3">{plans.filter((plan) => !isFreePlan(plan.id, plan.name)).map((plan) => <PlanPriceEditor key={plan.id} plan={plan} onUpdatePlan={onUpdatePlan} />)}</div><div className="mt-5 rounded-3xl border border-slate-200 p-4 dark:border-white/10"><h4 className="font-black">Histórico de alteração de preço</h4><div className="mt-3 space-y-2">{history.slice(0, 8).map((item) => <div key={item.id} className="grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5 sm:grid-cols-5"><strong>{item.planName}</strong><span>{money.format(item.previousPrice)}</span><span>{money.format(item.newPrice)}</span><span>{item.changedByName}</span><span>{new Date(item.createdAt).toLocaleString("pt-BR")}</span></div>)}{history.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma alteração de preço registrada.</p>}</div></div><p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Pagamentos antigos permanecem com o valor registrado na época. Novas cobranças usam o valor vigente do plano.</p></PremiumCard>;
}

function PasswordRequirementList({ value }: { value: string }) {
  return <div className="mt-3 grid gap-2 text-sm text-slate-500 dark:text-slate-400">{passwordChecks(value).map((item) => <div key={item.id} className={cls("flex items-center gap-2", item.valid && "text-emerald-500")}><span className={cls("grid h-5 w-5 place-items-center rounded-full border", item.valid ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400")}>{item.valid && <CheckCircle2 className="h-3.5 w-3.5" />}</span><span>{item.label}</span></div>)}</div>;
}
function PasswordInputWithRules({ label, name, value, onChange, placeholder, autoComplete }: { label: string; name: string; value: string; onChange: (value: string) => void; placeholder?: string; autoComplete?: string }) {
  const [visible, setVisible] = useState(false);
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span><div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"><input name={name} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="h-12 min-w-0 flex-1 bg-transparent px-4 outline-none text-slate-950 placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-400" /><button type="button" onClick={() => setVisible(!visible)} className="border-l border-slate-200 px-4 text-sm font-black text-slate-600 dark:border-white/10 dark:text-slate-200">{visible ? "Ocultar" : "Mostrar"}</button></div><PasswordRequirementList value={value} /></label>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className, ...rest } = props;
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span><input {...rest} className={cls("h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 dark:border-white/10 dark:bg-white/5 text-slate-950 placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-400", className)} /></label>;
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: React.ReactNode }) {
  const { label, className, children, ...rest } = props;
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span><select {...rest} className={cls("h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 dark:border-white/10 dark:bg-slate-950 text-slate-950 dark:text-white", className)}>{children}</select></label>;
}
function MiniList({ data, total }: { data: Array<{ name: string; value: number }>; total: number }) {
  return <div className="space-y-3">{data.map((item, index) => { const share = total > 0 ? item.value / total * 100 : 0; return <div key={item.name}><div className="mb-1 flex justify-between text-sm"><span>{item.name}</span><strong>{pct(share)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full" style={{ width: `${Math.min(100, share)}%`, background: palette[index % palette.length] }} /></div></div>; })}</div>;
}
function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="mb-4 block"><div className="mb-2 flex justify-between text-sm"><span>{label}</span><strong>{value}</strong></div><input type="range" min="0" max="40" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-cyan-500" /></label>;
}
function RankingRow({ asset, index, onClick }: { asset: Asset; index: number; onClick: () => void }) {
  const dividend = dividendPerShare(asset);
  const graham = analisarNumeroGraham(asset);
  const grahamContribution = grahamScoreContribution(asset);
  return (
    <button onClick={onClick} className="flex w-full items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:scale-[1.01] hover:shadow-premium dark:border-white/10 dark:bg-white/5">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 font-black text-white dark:bg-white dark:text-slate-950">{index}</span>
      <span className="min-w-0 flex-1">
        <strong>{asset.ticker}</strong><span className="ml-2 text-sm text-slate-500 dark:text-slate-300">{asset.name}</span>
        <p className="mt-1 text-xs text-slate-400">{typeLabels[asset.type]} · {asset.segment}</p>
        <p className="mt-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300">Dividendos: {dividendFrequency(asset)} · {dividend === undefined ? "sem valor recorrente" : `${money.format(dividend)} por ação/cota`}</p>
        <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Graham: {graham.value === undefined ? "não aplicável" : `${money.format(graham.value)} - margem ${pct(graham.safetyMargin)}`} - contribuição {grahamContribution}/10</p>
      </span>
      <span className="rounded-full bg-cyan-500/10 px-3 py-1 font-black text-cyan-600 dark:text-cyan-300">{asset.score}</span>
    </button>
  );
}
function StatusPill({ status }: { status: ClientStatus | PaymentStatus }) {
  const map: Record<string, string> = { ativo: "bg-emerald-500/10 text-emerald-500", pago: "bg-emerald-500/10 text-emerald-500", bloqueado: "bg-red-500/10 text-red-500", vencido: "bg-amber-500/10 text-amber-500", pendente: "bg-amber-500/10 text-amber-500", cancelado: "bg-slate-500/10 text-slate-500" };
  return <span className={cls("inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-black uppercase", map[status])}>{status}</span>;
}
function PlanCard({ plan, setPlans, setAccounts }: { plan: Plan; setPlans: React.Dispatch<React.SetStateAction<Plan[]>>; setAccounts: React.Dispatch<React.SetStateAction<Account[]>> }) {
  const [draft, setDraft] = useState<Plan>(plan);
  const free = isFreePlan(plan.id, plan.name);
  const freeLimits = getFreePlanLimits(draft);
  const [saved, setSaved] = useState(false);
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(plan);
  const canSave = (free ? draft.value === 0 : draft.value >= 0) && draft.durationDays > 0;

  useEffect(() => {
    setDraft(plan);
    setSaved(false);
  }, [plan]);

  function updateDraft(patch: Partial<Plan>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  }

  function savePlan() {
    if (!canSave) return;
    setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, ...draft } : item));
    setAccounts((current) => current.map((account) => account.role === "CLIENTE" && account.planId === plan.id ? { ...account, planValue: account.planValue ?? draft.value, permissions: draft.permissions } : account));
    setSaved(true);
  }

  return (
    <PremiumCard title={free ? freePlanDisplayName(plan.name) : plan.name} description={free ? "Sem cobrança e sem vencimento" : `${draft.durationDays} dias de acesso`} icon={ShieldCheck}>
      <div className="space-y-3">
        <Input label="Valor" type="number" step="0.01" min="0" value={free ? 0 : draft.value} disabled={free} onChange={(e) => updateDraft({ value: Number(e.target.value) })} />
        <Input label="Duração em dias" type="number" min="1" value={draft.durationDays} disabled={free} onChange={(e) => updateDraft({ durationDays: Number(e.target.value) })} />
        {free && <div className="space-y-3 rounded-xl bg-emerald-500/10 p-3"><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">O plano gratuito permanece em R$ 0,00 e sem vencimento. Status, limites e permissões podem ser administrados abaixo.</p><div className="grid gap-3 sm:grid-cols-3"><Input label="Limite da carteira" type="number" min="1" value={freeLimits.portfolio} onChange={(event) => updateDraft({ limits: { ...freeLimits, portfolio: Math.max(1, Number(event.target.value)) } })} /><Input label="Oportunidades por dia" type="number" min="1" value={freeLimits.opportunities} onChange={(event) => updateDraft({ limits: { ...freeLimits, opportunities: Math.max(1, Number(event.target.value)) } })} /><Input label="Notificações por dia" type="number" min="1" value={freeLimits.notifications} onChange={(event) => updateDraft({ limits: { ...freeLimits, notifications: Math.max(1, Number(event.target.value)) } })} /></div></div>}
        <Select label="Status" value={draft.status} onChange={(e) => updateDraft({ status: e.target.value as "ativo" | "inativo" })}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </Select>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
          <p className="mb-2 text-sm font-bold">Permissões</p>
          {clientModules.map((module) => (
            <label key={module.id} className="mb-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.permissions.includes(module.id)} onChange={(e) => updateDraft({ permissions: e.target.checked ? [...draft.permissions, module.id] : draft.permissions.filter((id) => id !== module.id) })} />
              {module.label}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={savePlan} disabled={!hasChanges || !canSave} className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-white/10 dark:disabled:text-slate-400">Salvar alterações</button>
          <button type="button" onClick={() => { setDraft(plan); setSaved(false); }} disabled={!hasChanges} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-100">Desfazer</button>
          {saved && <span className="text-sm font-bold text-emerald-500">Plano salvo</span>}
          {!canSave && <span className="text-sm font-bold text-red-500">Informe valor e duração válidos</span>}
        </div>
      </div>
    </PremiumCard>
  );
}
function PermissionsEditor({ client, updateClient }: { client: Account; updateClient: (id: string, patch: Partial<Account>) => void }) {
  return <div className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><p className="mb-2 text-sm font-bold">Menus liberados para o cliente</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{clientModules.map((module) => <label key={module.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={client.permissions.includes(module.id)} onChange={(e) => updateClient(client.id, { permissions: e.target.checked ? [...client.permissions, module.id] : client.permissions.filter((id) => id !== module.id) })} />{module.label}</label>)}</div></div>;
}
function ChartRevenue({ payments }: { payments: Payment[] }) {
  const data = ["pago", "pendente", "vencido", "cancelado"].map((status) => ({ status, valor: payments.filter((item) => item.status === status).reduce((sum, item) => sum + item.value, 0) }));
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" opacity={0.18} /><XAxis dataKey="status" /><YAxis tickFormatter={(value) => compactMoney.format(Number(value))} /><Tooltip formatter={(value) => money.format(Number(value))} /><Bar dataKey="valor" name="Valor" radius={[12, 12, 0, 0]} fill="#06b6d4" /></BarChart></ResponsiveContainer>;
}
function PieBlock({ data }: { data: Array<{ name: string; value: number }> }) {
  return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={65} outerRadius={110} paddingAngle={3}>{data.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip formatter={(value) => money.format(Number(value))} /></PieChart></ResponsiveContainer></div>;
}
function SettingsSection({
  currentUser,
  darkMode,
  setDarkMode,
  settings,
  setSettings,
  changePassword,
  logout,
  onAccountUpdated
}: {
  currentUser: Account;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  settings: { currency: string; language: string; autoUpdate: boolean; priceAlerts: boolean; dividendAlerts: boolean };
  setSettings: React.Dispatch<React.SetStateAction<{ currency: string; language: string; autoUpdate: boolean; priceAlerts: boolean; dividendAlerts: boolean }>>;
  changePassword: (event: React.FormEvent<HTMLFormElement>) => void;
  logout: () => void;
  onAccountUpdated: (account: AccountIdentity) => void;
}) {
  const [newPassword, setNewPassword] = useState("");

  return (
    <Section title="Configurações" subtitle="Conta, senha, tema, alertas e preferências." eyebrow="Preferências">
      <div className="grid gap-6 lg:grid-cols-2">
        <PremiumCard title="Dados da conta" description="Informações do usuário autenticado." icon={UserCog}>
          <InfoTile label="Nome" value={currentUser.name} />
          <div className="mt-3"><InfoTile label="E-mail" value={currentUser.email} /></div>
          <div className="mt-3"><InfoTile label="Perfil" value={currentUser.role === "ADMIN" ? "Administrador" : "Cliente"} /></div>
          <div className="mt-3"><InfoTile label="Status" value={currentUser.status} /></div>
          <button onClick={logout} className="mt-4 rounded-2xl bg-red-500 px-5 py-3 font-bold text-white"><LogOut className="mr-2 inline h-4 w-4" />Sair da conta</button>
        </PremiumCard>
        <PremiumCard title="Alterar nome" description="Atualize o nome exibido na plataforma." icon={UserCog}>
          <ChangeNameForm account={currentUser} onUpdated={onAccountUpdated} />
        </PremiumCard>
        <PremiumCard title="Alterar e-mail" description="A troca exige senha e confirmação no novo endereço." icon={UserCog}>
          <ChangeEmailForm currentEmail={currentUser.email} />
        </PremiumCard>
        <PremiumCard title="Alterar senha" description="A nova senha precisa cumprir todos os requisitos de segurança." icon={KeyRound}>
          <form onSubmit={changePassword} className="grid gap-3">
            <Input name="currentPassword" type="password" label="Senha atual" required />
            <PasswordInputWithRules label="Nova senha" name="newPassword" value={newPassword} onChange={setNewPassword} placeholder="Crie uma senha segura" autoComplete="new-password" />
            <Input name="confirmPassword" type="password" label="Confirmar nova senha" required />
            <button className="rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-white">Alterar senha</button>
          </form>
        </PremiumCard>
        <PremiumCard title="Tema e visual" description="Modo claro ou escuro aplicado em toda a plataforma." icon={Moon}>
          <Toggle label="Modo escuro" checked={darkMode} onChange={setDarkMode} />
          <Toggle label="Atualização automática" checked={settings.autoUpdate} onChange={(value) => setSettings((current) => ({ ...current, autoUpdate: value }))} />
          <Toggle label="Alertas de preço" checked={settings.priceAlerts} onChange={(value) => setSettings((current) => ({ ...current, priceAlerts: value }))} />
          <Toggle label="Alertas de dividendos" checked={settings.dividendAlerts} onChange={(value) => setSettings((current) => ({ ...current, dividendAlerts: value }))} />
        </PremiumCard>
        <PremiumCard title="Localização" description="Moeda e idioma da interface." icon={Settings}>
          <Select label="Moeda" value={settings.currency} onChange={(event) => setSettings((current) => ({ ...current, currency: event.target.value }))}>
            <option value="BRL">Real brasileiro</option>
            <option value="USD">Dólar americano</option>
          </Select>
          <div className="mt-3">
            <Select label="Idioma" value={settings.language} onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value }))}>
              <option value="pt-BR">Português Brasil</option>
              <option value="en-US">English</option>
            </Select>
          </div>
        </PremiumCard>
        {currentUser.role === "ADMIN" && (
          <>
            <PremiumCard title="Saúde do sistema - E-mail" description="Configuração SMTP, conexão, histórico e envio de teste." icon={MailCheck}>
              <EmailHealthPanel />
            </PremiumCard>
            <MarketDataHealthPanel />
          </>
        )}
      </div>
    </Section>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button onClick={() => onChange(!checked)} className="mb-3 flex w-full items-center justify-between rounded-2xl bg-slate-50 p-4 text-left dark:bg-white/5"><span className="font-semibold">{label}</span><span className={cls("h-7 w-12 rounded-full p-1 transition", checked ? "bg-cyan-500" : "bg-slate-300")}><span className={cls("block h-5 w-5 rounded-full bg-white transition", checked && "translate-x-5")} /></span></button>;
}
function buildFinancialSummary(clients: Account[], plans: Plan[], payments: Payment[]) {
  const active = clients.filter((client) => client.status === "ativo" && !isExpired(client.dueDate)).length;
  const blocked = clients.filter((client) => client.status === "bloqueado").length;
  const expired = clients.filter((client) => client.status === "vencido" || isExpired(client.dueDate)).length;
  const received = payments.filter((payment) => payment.status === "pago").reduce((sum, payment) => sum + payment.value, 0);
  const pending = payments.filter((payment) => ["pendente", "vencido"].includes(payment.status)).reduce((sum, payment) => sum + payment.value, 0);
  const expected = clients.reduce((sum, client) => sum + (client.planValue ?? planValueFor(plans, client.planId)), 0);
  return { active, blocked, expired, received, pending, expected };
}
function buildEquityCurve(lines: ReturnType<typeof analyzePortfolio>["lines"]) {
  const map = new Map<string, number>();
  lines.forEach((line) => line.asset.priceHistory.slice(-36).forEach((point) => map.set(point.label, (map.get(point.label) ?? 0) + multiplyDecimalToNumber(line.quantity, point.price))));
  return Array.from(map.entries()).map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }));
}
function radarLabel(key: string) {
  const map: Record<string, string> = { dividendYield: "Dividendos", valuation: "Valuation", quality: "Qualidade", growth: "Crescimento", liquidity: "Liquidez", risk: "Risco" };
  return map[key] ?? key;
}
