"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
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
  Lock,
  LogOut,
  Menu,
  Moon,
  PieChart as PieChartIcon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Star,
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
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
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
  isTickerLike,
  localAssets,
  normalizeTicker,
  searchAssets,
  typeLabels
} from "@/lib/market-data";
import type { Asset, AssetType, PortfolioPosition, RadarWeights } from "@/lib/types";

type Role = "ADMIN" | "CLIENTE";
type ClientStatus = "ativo" | "bloqueado" | "vencido";
type PaymentStatus = "pago" | "pendente" | "vencido" | "cancelado";
type ClientModuleId = "dashboard" | "mercado" | "oportunidades" | "comparador" | "carteira" | "radar" | "relatorios" | "configuracoes";
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
  history?: Asset["priceHistory"];
};

type Plan = {
  id: string;
  name: string;
  value: number;
  durationDays: number;
  status: "ativo" | "inativo";
  permissions: ClientModuleId[];
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
  status: ClientStatus;
  createdAt: string;
  dueDate?: string;
  notes?: string;
  permissions: ClientModuleId[];
};

type Payment = {
  id: string;
  clientId: string;
  planId: string;
  value: number;
  paymentDate: string;
  dueDate: string;
  status: PaymentStatus;
};

const ADMIN_DEFAULT_HASH = "cc5c75de95387000d28fce6a21f4d8c4ff8560b1b37e73d39eb63c3029697db5";
const allClientModules: ClientModuleId[] = ["dashboard", "mercado", "oportunidades", "comparador", "carteira", "radar", "relatorios", "configuracoes"];
const clientModules: Array<{ id: ClientModuleId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "mercado", label: "Mercado", icon: BarChart3 },
  { id: "oportunidades", label: "Oportunidades", icon: TrendingUp },
  { id: "comparador", label: "Comparador", icon: LineChartIcon },
  { id: "carteira", label: "Minha Carteira", icon: WalletCards },
  { id: "radar", label: "Radar IA", icon: BrainCircuit },
  { id: "relatorios", label: "Relatórios", icon: FileSpreadsheet },
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
const defaultPlans: Plan[] = [
  { id: "semanal", name: "Semanal", value: 49.9, durationDays: 7, status: "ativo", permissions: allClientModules },
  { id: "mensal", name: "Mensal", value: 149.9, durationDays: 30, status: "ativo", permissions: allClientModules },
  { id: "anual", name: "Anual", value: 1299.9, durationDays: 365, status: "ativo", permissions: allClientModules }
];
const starterPortfolio: PortfolioPosition[] = [
  { id: "p1", ticker: "GARE11", quantity: 120, averagePrice: 9.35, broker: "Rico", purchaseDate: "2026-02-10" },
  { id: "p2", ticker: "BBAS3", quantity: 80, averagePrice: 25.9, broker: "XP", purchaseDate: "2025-09-18" },
  { id: "p3", ticker: "HGLG11", quantity: 8, averagePrice: 154.3, broker: "BTG", purchaseDate: "2025-12-04" },
  { id: "p4", ticker: "IVVB11", quantity: 6, averagePrice: 322.5, broker: "Clear", purchaseDate: "2026-01-22" }
];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const number = new Intl.NumberFormat("pt-BR");
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const palette = ["#14b8a6", "#38bdf8", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#64748b"];

function cls(...values: Array<string | false | undefined | null>) {
  return values.filter(Boolean).join(" ");
}
function pct(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${percent.format(value)}%`;
}
function metric(value?: number, suffix = "") {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${number.format(Number(value.toFixed(value > 1000 ? 0 : 2)))}${suffix}`;
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
function rangeHistory(asset: Asset, range: RangeId) {
  const config = ranges.find((item) => item.id === range) ?? ranges[4];
  return asset.priceHistory.slice(-config.points);
}
function performance(history: Asset["priceHistory"]) {
  const first = history[0]?.price ?? 0;
  const last = history[history.length - 1]?.price ?? 0;
  return first > 0 ? ((last / first) - 1) * 100 : 0;
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
function googleFinanceUrl(asset: Pick<Asset, "ticker" | "sourceUrl">) {
  return asset.sourceUrl ?? `https://www.google.com/finance/beta/quote/${asset.ticker}:BVMF`;
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
    dayLow: quote.dayLow
  };
  asset.score = calculateAssetScore(asset);
  return asset;
}
async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AlfatecInvestPro() {
  const [darkMode, setDarkMode] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [clientModule, setClientModule] = useState<ClientModuleId>("dashboard");
  const [adminModule, setAdminModule] = useState<ClientModuleId | AdminModuleId>("admin-dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const [marketSearch, setMarketSearch] = useState("");
  const [marketType, setMarketType] = useState<AssetType | "TODOS">("TODOS");
  const [selectedAsset, setSelectedAsset] = useState<Asset>(() => getAsset("GARE11"));
  const [extraAssets, setExtraAssets] = useState<Asset[]>([]);
  const [favorites, setFavorites] = useState<string[]>(["GARE11", "PETR4", "BTC"]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(starterPortfolio);
  const [range, setRange] = useState<RangeId>("1A");
  const [assetA, setAssetA] = useState<Asset>(() => getAsset("GARE11"));
  const [assetB, setAssetB] = useState<Asset>(() => getAsset("PETR4"));
  const [searchA, setSearchA] = useState("GARE11");
  const [searchB, setSearchB] = useState("PETR4");
  const [weights, setWeights] = useState<RadarWeights>({ dividendYield: 22, valuation: 22, quality: 22, growth: 14, liquidity: 10, risk: 10 });
  const [settings, setSettings] = useState({ currency: "BRL", language: "pt-BR", autoUpdate: true, priceAlerts: true, dividendAlerts: true });
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [marketQuoteStatus, setMarketQuoteStatus] = useState<"idle" | "loading" | "error">("idle");
  const [marketQuoteMessage, setMarketQuoteMessage] = useState("");
  const [refreshingMarket, setRefreshingMarket] = useState(false);

  const assets = useMemo(() => buildAssetMap(extraAssets), [extraAssets]);
  const portfolioAnalysis = useMemo(() => analyzePortfolio(portfolio, assets), [portfolio, assets]);
  const marketResults = useMemo(() => searchAssets(marketSearch, marketType, assets, { includeDynamic: false }), [marketSearch, marketType, assets]);
  const currentUser = useMemo(() => accounts.find((account) => account.id === sessionId) ?? null, [accounts, sessionId]);
  const clients = useMemo(() => accounts.filter((account) => account.role === "CLIENTE"), [accounts]);
  const financial = useMemo(() => buildFinancialSummary(clients, plans, payments), [clients, plans, payments]);
  const globalSuggestions = useMemo(() => searchAssets(globalSearch, "TODOS", assets).slice(0, 8), [globalSearch, assets]);
  const comparison = useMemo(() => buildComparison(assetA, assetB, range), [assetA, assetB, range]);
  const returnA = performance(rangeHistory(assetA, range));
  const returnB = performance(rangeHistory(assetB, range));
  const allowedClientModules = currentUser?.role === "CLIENTE" ? clientModules.filter((item) => currentUser.permissions.includes(item.id)) : clientModules;
  const adminNavigationModules = useMemo(() => [
    ...clientModules.map((item) => ({ ...item, group: "Área do cliente" })),
    ...adminModules
      .filter((item) => !allClientModules.includes(item.id as ClientModuleId))
      .map((item) => ({ ...item, group: "Administração" }))
  ], []);

  useEffect(() => {
    const savedAccounts = window.localStorage.getItem("alfatec-users");
    const savedPlans = window.localStorage.getItem("alfatec-plans");
    const savedPayments = window.localStorage.getItem("alfatec-payments");
    const savedSession = window.localStorage.getItem("alfatec-session");
    const savedTheme = window.localStorage.getItem("alfatec-theme");
    const savedPortfolio = window.localStorage.getItem("alfatec-portfolio");
    const baseAdmin: Account = {
      id: "admin-flauzino",
      role: "ADMIN",
      username: "Flauzino",
      email: "admin@alfatec.local",
      name: "Flauzino",
      passwordHash: ADMIN_DEFAULT_HASH,
      status: "ativo",
      createdAt: todayIso(),
      permissions: allClientModules
    };
    let loadedAccounts: Account[] = savedAccounts ? JSON.parse(savedAccounts) : [baseAdmin];
    if (!loadedAccounts.some((account) => account.id === baseAdmin.id)) loadedAccounts = [baseAdmin, ...loadedAccounts];
    loadedAccounts = loadedAccounts.map((account) => {
      if (account.role === "ADMIN") return { ...account, permissions: allClientModules };
      const shouldHaveAll = account.permissions.length >= 7;
      const permissions = shouldHaveAll ? allClientModules : account.permissions;
      return account.role === "CLIENTE" && isExpired(account.dueDate) && account.status === "ativo" ? { ...account, permissions, status: "vencido" } : { ...account, permissions };
    });
    setAccounts(loadedAccounts);
    const loadedPlans: Plan[] = savedPlans ? JSON.parse(savedPlans) : defaultPlans;
    setPlans(loadedPlans.map((plan) => plan.permissions.length >= 7 ? { ...plan, permissions: allClientModules } : plan));
    if (savedPayments) setPayments(JSON.parse(savedPayments));
    if (savedSession) setSessionId(savedSession);
    if (savedTheme) setDarkMode(savedTheme === "dark");
    if (savedPortfolio) setPortfolio(JSON.parse(savedPortfolio));
  }, []);

  useEffect(() => { if (accounts.length) window.localStorage.setItem("alfatec-users", JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => window.localStorage.setItem("alfatec-plans", JSON.stringify(plans)), [plans]);
  useEffect(() => window.localStorage.setItem("alfatec-payments", JSON.stringify(payments)), [payments]);
  useEffect(() => window.localStorage.setItem("alfatec-theme", darkMode ? "dark" : "light"), [darkMode]);
  useEffect(() => window.localStorage.setItem("alfatec-portfolio", JSON.stringify(portfolio)), [portfolio]);
  useEffect(() => { extraAssets.filter((asset) => asset.source === "external").forEach((asset) => window.localStorage.setItem("alfatec-quote-" + asset.ticker, JSON.stringify(asset))); }, [extraAssets]);
  useEffect(() => { if (sessionId) window.localStorage.setItem("alfatec-session", sessionId); else window.localStorage.removeItem("alfatec-session"); }, [sessionId]);
  async function refreshTicker(tickerInput: string, options: { select?: boolean; silent?: boolean } = {}) {
    const clean = normalizeTicker(tickerInput);
    if (!isTickerLike(clean)) return null;
    if (!options.silent) { setMarketQuoteStatus("loading"); setMarketQuoteMessage("Atualizando..."); }
    try {
      const response = await fetch("/api/quotes/market?ticker=" + encodeURIComponent(clean) + "&range=1y&interval=1d");
      const data = await response.json();
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
      const cached = window.localStorage.getItem("alfatec-quote-" + clean);
      if (cached) { const asset = JSON.parse(cached) as Asset; setExtraAssets((current) => [asset, ...current.filter((item) => item.ticker !== asset.ticker)]); if (!options.silent) { setMarketQuoteStatus("error"); setMarketQuoteMessage("Fonte indisponível. Último dado disponível em cache."); } return asset; }
      if (!options.silent) { setMarketQuoteStatus("error"); setMarketQuoteMessage(error instanceof Error ? error.message : "Dado indisponível"); }
      return null;
    }
  }

  async function refreshVisibleMarket(options: { silent?: boolean } = {}) {
    const tickers = Array.from(new Set([selectedAsset.ticker, ...portfolio.map((item) => item.ticker), ...marketResults.slice(0, 8).map((asset) => asset.ticker)])).slice(0, 16);
    setRefreshingMarket(true);
    await Promise.all(tickers.map((ticker) => refreshTicker(ticker, { silent: options.silent })));
    setRefreshingMarket(false);
    if (!options.silent) setMarketQuoteMessage("Dados atualizados.");
  }

  useEffect(() => {
    const clean = normalizeTicker(marketSearch);
    if (!isTickerLike(clean)) return;
    const timeout = window.setTimeout(() => { void refreshTicker(clean, { select: false }); }, 450);
    return () => window.clearTimeout(timeout);
  }, [marketSearch]);

  useEffect(() => {
    void refreshVisibleMarket({ silent: true });
    const interval = window.setInterval(() => { if (settings.autoUpdate) void refreshVisibleMarket({ silent: true }); }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [settings.autoUpdate, portfolio.length, selectedAsset.ticker]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    const cleanUser = loginUser.trim().toLowerCase();
    if (!cleanUser || !loginPassword) {
      setLoginError("Informe usuário/e-mail e senha.");
      return;
    }
    const hash = await sha256(loginPassword);
    const found = accounts.find((account) => (account.username.toLowerCase() === cleanUser || account.email.toLowerCase() === cleanUser) && account.passwordHash === hash);
    if (!found) {
      setLoginError("Login inválido. Verifique usuário/e-mail e senha.");
      return;
    }
    if (found.role === "CLIENTE" && (found.status === "bloqueado" || found.status === "vencido" || isExpired(found.dueDate))) {
      setSessionId(found.id);
      return;
    }
    setSessionId(found.id);
    setClientModule("dashboard");
    setAdminModule("admin-dashboard");
  }

  function logout() {
    setSessionId(null);
    setLoginPassword("");
  }

  function handleAdminMenu(id: string) {
    setAdminModule(id as ClientModuleId | AdminModuleId);
    if (allClientModules.includes(id as ClientModuleId)) setClientModule(id as ClientModuleId);
  }

  function resolveAssetFromSearch(value: string) {
    const clean = normalizeTicker(value);
    const asset = assets.find((item) => item.ticker === clean) ?? (isTickerLike(clean) ? createGeneratedAsset(clean) : searchAssets(value, "TODOS", assets)[0]);
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

  function addPortfolioPosition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ticker = normalizeTicker(String(formData.get("ticker") ?? ""));
    const quantity = Number(formData.get("quantity") ?? 0);
    const averagePrice = Number(formData.get("averagePrice") ?? 0);
    const broker = String(formData.get("broker") ?? "").trim() || "Não informada";
    const purchaseDate = String(formData.get("purchaseDate") ?? "") || todayIso();
    if (!ticker || quantity <= 0 || averagePrice <= 0) return;
    const asset = resolveAssetFromSearch(ticker);
    if (!asset) return;
    setPortfolio((current) => [{ id: crypto.randomUUID(), ticker: asset.ticker, quantity, averagePrice, broker, purchaseDate }, ...current]);
    event.currentTarget.reset();
  }

  async function addClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const planId = String(formData.get("planId") ?? "mensal");
    const plan = plans.find((item) => item.id === planId) ?? plans[1];
    const password = String(formData.get("password") ?? "123456");
    const client: Account = {
      id: crypto.randomUUID(),
      role: "CLIENTE",
      username: String(formData.get("email") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      passwordHash: await sha256(password),
      planId,
      status: "ativo",
      createdAt: todayIso(),
      dueDate: String(formData.get("dueDate") ?? "") || addDays(plan.durationDays),
      notes: String(formData.get("notes") ?? "").trim(),
      permissions: plan.permissions
    };
    if (!client.name || !client.email) return;
    setAccounts((current) => [client, ...current]);
    setSelectedClientId(client.id);
    event.currentTarget.reset();
  }

  function updateClient(id: string, patch: Partial<Account>) {
    setAccounts((current) => current.map((account) => account.id === id ? { ...account, ...patch } : account));
  }

  function changeClientPlan(client: Account, planId: string) {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) return;
    updateClient(client.id, { planId, dueDate: addDays(plan.durationDays), status: "ativo", permissions: plan.permissions });
  }

  function addPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const clientId = String(formData.get("clientId") ?? "");
    const planId = String(formData.get("planId") ?? "");
    const plan = plans.find((item) => item.id === planId);
    const client = clients.find((item) => item.id === clientId);
    if (!client || !plan) return;
    const dueDate = String(formData.get("dueDate") ?? "") || addDays(plan.durationDays);
    const payment: Payment = {
      id: crypto.randomUUID(),
      clientId,
      planId,
      value: Number(formData.get("value") ?? plan.value),
      paymentDate: String(formData.get("paymentDate") ?? "") || todayIso(),
      dueDate,
      status: String(formData.get("status") ?? "pago") as PaymentStatus
    };
    setPayments((current) => [payment, ...current]);
    if (payment.status === "pago") updateClient(clientId, { status: "ativo", planId, dueDate, permissions: plan.permissions });
    event.currentTarget.reset();
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;
    const formData = new FormData(event.currentTarget);
    const current = String(formData.get("currentPassword") ?? "");
    const next = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");
    if (next.length < 6 || next !== confirm) {
      alert("A nova senha deve ter ao menos 6 caracteres e a confirmação deve ser igual.");
      return;
    }
    const currentHash = await sha256(current);
    if (currentHash !== currentUser.passwordHash) {
      alert("Senha atual incorreta.");
      return;
    }
    const nextHash = await sha256(next);
    updateClient(currentUser.id, { passwordHash: nextHash });
    setAccounts((currentAccounts) => currentAccounts.map((account) => account.id === currentUser.id ? { ...account, passwordHash: nextHash } : account));
    alert("Senha alterada com sucesso.");
    event.currentTarget.reset();
  }

  function exportAdminReport() {
    const lines = [
      "ALFATEC INVEST PRO - RELATÓRIO ADMIN",
      `Clientes cadastrados: ${clients.length}`,
      `Clientes ativos: ${financial.active}`,
      `Clientes bloqueados: ${financial.blocked}`,
      `Clientes vencidos: ${financial.expired}`,
      `Receita recebida: ${money.format(financial.received)}`,
      `Valores pendentes: ${money.format(financial.pending)}`,
      "",
      "Clientes:",
      ...clients.map((client) => `${client.name};${client.email};${client.status};${client.planId};${client.dueDate ?? ""}`)
    ];
    downloadText("relatorio-admin-alfatec.txt", lines.join("\n"));
  }

  function exportPortfolioCsv() {
    const header = "ticker,tipo,quantidade,preco_medio,preco_atual,valor_investido,valor_atual,lucro_prejuizo,rentabilidade,dividendos_ano\n";
    const rows = portfolioAnalysis.lines.map((line) => [
      line.ticker,
      line.asset.type,
      line.quantity,
      line.averagePrice.toFixed(2),
      line.asset.price.toFixed(2),
      line.invested.toFixed(2),
      line.currentValue.toFixed(2),
      line.profit.toFixed(2),
      line.profitability.toFixed(2),
      line.estimatedDividendsYear.toFixed(2)
    ].join(","));
    downloadText("carteira-alfatec-invest-pro.csv", header + rows.join("\n"), "text/csv;charset=utf-8");
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
        <LoginScreen darkMode={darkMode} setDarkMode={setDarkMode} loginUser={loginUser} setLoginUser={setLoginUser} loginPassword={loginPassword} setLoginPassword={setLoginPassword} showPassword={showPassword} setShowPassword={setShowPassword} loginError={loginError} onSubmit={handleLogin} />
      </main>
    );
  }

  if (currentUser.role === "CLIENTE" && (currentUser.status === "bloqueado" || currentUser.status === "vencido" || isExpired(currentUser.dueDate))) {
    return (
      <Shell darkMode={darkMode} setDarkMode={setDarkMode} logout={logout} user={currentUser} modules={[]} activeId="" onMenu={() => undefined}>
        <div className="mx-auto max-w-3xl py-16">
          <PremiumCard title="Acesso bloqueado" description="Sua conta não possui permissão ativa para acessar a plataforma." icon={Lock}>
            <div className="rounded-3xl bg-red-500/10 p-6 text-red-500">
              <p className="text-xl font-black">Seu acesso está temporariamente bloqueado. Entre em contato com o administrador.</p>
              <p className="mt-2 text-sm">Status atual: {currentUser.status}. Vencimento: {currentUser.dueDate ?? "não informado"}.</p>
            </div>
            <button onClick={logout} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950">Sair da conta</button>
          </PremiumCard>
        </div>
      </Shell>
    );
  }

  if (currentUser.role === "ADMIN" && !allClientModules.includes(adminModule as ClientModuleId)) {
    return (
      <Shell darkMode={darkMode} setDarkMode={setDarkMode} logout={logout} user={currentUser} modules={adminNavigationModules} activeId={adminModule} onMenu={handleAdminMenu}>
        {adminModule === "admin-dashboard" && (
          <Section title="Dashboard Admin" subtitle="Controle geral de clientes, planos, bloqueios e receita." eyebrow="Administração">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Clientes cadastrados" value={String(clients.length)} icon={Users} tone="blue" />
              <MetricCard label="Clientes ativos" value={String(financial.active)} icon={CheckCircle2} tone="green" />
              <MetricCard label="Clientes bloqueados" value={String(financial.blocked)} icon={Lock} tone="red" />
              <MetricCard label="Receita recebida" value={money.format(financial.received)} icon={CircleDollarSign} tone="teal" />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <PremiumCard title="Receita por status" description="Pagamentos registrados manualmente pelo administrador." icon={BarChart3}>
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
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <PremiumCard title="Cadastrar novo cliente" description="Defina plano, senha inicial e vencimento." icon={UserCog}>
                <form onSubmit={addClient} className="grid gap-3">
                  <Input name="name" label="Nome" placeholder="Nome do cliente" required />
                  <Input name="email" type="email" label="E-mail / usuário" placeholder="cliente@email.com" required />
                  <Input name="phone" label="Telefone" placeholder="(00) 00000-0000" />
                  <Input name="password" label="Senha inicial" placeholder="Senha inicial" defaultValue="123456" required />
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
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <select value={client.planId ?? ""} onChange={(e) => changeClientPlan(client, e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950">
                            {plans.map((planItem) => <option key={planItem.id} value={planItem.id}>{planItem.name}</option>)}
                          </select>
                          <input type="date" value={client.dueDate ?? ""} onChange={(e) => updateClient(client.id, { dueDate: e.target.value, status: e.target.value < todayIso() ? "vencido" : "ativo" })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950" />
                          <button onClick={() => updateClient(client.id, { status: client.status === "bloqueado" ? "ativo" : "bloqueado" })} className={cls("rounded-2xl px-3 py-2 text-sm font-bold", client.status === "bloqueado" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>{client.status === "bloqueado" ? <Unlock className="mr-1 inline h-4 w-4" /> : <Lock className="mr-1 inline h-4 w-4" />}{client.status === "bloqueado" ? "Desbloquear" : "Bloquear"}</button>
                          <button onClick={() => setAccounts((current) => current.filter((account) => account.id !== client.id))} className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-red-500 dark:bg-white/10"><Trash2 className="mr-1 inline h-4 w-4" />Excluir</button>
                        </div>
                        <button onClick={() => setSelectedClientId(selectedClientId === client.id ? null : client.id)} className="mt-3 text-sm font-bold text-teal-500">{selectedClientId === client.id ? "Ocultar permissões" : "Editar permissões"}</button>
                        {selectedClientId === client.id && <PermissionsEditor client={client} updateClient={updateClient} />}
                      </div>
                    );
                  })}
                </div>
              </PremiumCard>
            </div>
          </Section>
        )}

        {adminModule === "planos" && (
          <Section title="Planos" subtitle="Configure valores, duração, status e permissões." eyebrow="Liberação comercial">
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => <PlanCard key={plan.id} plan={plan} setPlans={setPlans} />)}
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
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <PremiumCard title="Registrar pagamento" description="Baixe um pagamento e renove o acesso do cliente." icon={CircleDollarSign}>
                <form onSubmit={addPayment} className="grid gap-3">
                  <Select name="clientId" label="Cliente" required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select>
                  <Select name="planId" label="Plano" required>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</Select>
                  <Input name="value" type="number" step="0.01" label="Valor" placeholder="149.90" />
                  <Input name="paymentDate" type="date" label="Data do pagamento" defaultValue={todayIso()} />
                  <Input name="dueDate" type="date" label="Novo vencimento" />
                  <Select name="status" label="Status" defaultValue="pago"><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="vencido">Vencido</option><option value="cancelado">Cancelado</option></Select>
                  <button className="rounded-2xl bg-teal-500 px-4 py-3 font-bold text-white">Registrar pagamento</button>
                </form>
              </PremiumCard>
              <PremiumCard title="Histórico de pagamentos" description="Lista com status, vencimento e valor." icon={FileSpreadsheet}>
                <div className="mb-5 h-64"><ChartRevenue payments={payments} /></div>
                <div className="space-y-2">
                  {payments.map((payment) => {
                    const client = clients.find((item) => item.id === payment.clientId);
                    const plan = plans.find((item) => item.id === payment.planId);
                    return <div key={payment.id} className="grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5 sm:grid-cols-4"><strong>{client?.name ?? "Cliente"}</strong><span>{plan?.name}</span><span>{money.format(payment.value)}</span><StatusPill status={payment.status} /></div>;
                  })}
                  {payments.length === 0 && <p className="text-sm text-slate-500">Nenhum pagamento registrado.</p>}
                </div>
              </PremiumCard>
            </div>
          </Section>
        )}

        {adminModule === "admin-relatorios" && (
          <Section title="Relatórios Admin" subtitle="Exportação de clientes, planos, status e financeiro." eyebrow="Relatórios">
            <PremiumCard title="Relatório administrativo" description="Gere um arquivo TXT com o resumo do sistema." icon={Download}>
              <button onClick={exportAdminReport} className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950"><Download className="mr-2 inline h-4 w-4" />Exportar relatório admin</button>
              <button onClick={() => window.print()} className="ml-3 rounded-2xl bg-teal-500 px-5 py-3 font-bold text-white">Imprimir / PDF</button>
            </PremiumCard>
          </Section>
        )}

        {adminModule === "configuracoes" && <SettingsSection currentUser={currentUser} darkMode={darkMode} setDarkMode={setDarkMode} settings={settings} setSettings={setSettings} changePassword={changePassword} logout={logout} />}
      </Shell>
    );
  }

  return (
    <Shell darkMode={darkMode} setDarkMode={setDarkMode} logout={logout} user={currentUser} modules={currentUser.role === "ADMIN" ? adminNavigationModules : allowedClientModules} activeId={currentUser.role === "ADMIN" ? adminModule : clientModule} onMenu={currentUser.role === "ADMIN" ? handleAdminMenu : (id) => setClientModule(id as ClientModuleId)}>
      <div className="relative z-20">
        <GlobalSearchBox globalSearch={globalSearch} setGlobalSearch={setGlobalSearch} globalSuggestions={globalSuggestions} selectAsset={selectAsset} searchHistory={searchHistory} assets={assets} />
        {clientModule === "dashboard" && (
          <Section title="Dashboard executivo" subtitle="Visão consolidada da carteira, renda, risco e distribuição." eyebrow="Resumo premium">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardCards.map((card) => <MetricCard key={card.label} {...card} />)}
            </div>
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
              <AssetPanel asset={selectedAsset} favorites={favorites} setFavorites={setFavorites} onAddToPortfolio={(asset) => setPortfolio((current) => [{ id: crypto.randomUUID(), ticker: asset.ticker, quantity: 1, averagePrice: asset.price, broker: "Manual", purchaseDate: todayIso() }, ...current])} />
            </div>
          </Section>
        )}

        {clientModule === "oportunidades" && (
          <Section title="Oportunidades" subtitle="Ranking automático por score, dividendos, qualidade, valor e crescimento." eyebrow="Radar de oportunidades">
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <PremiumCard title="Filtros rápidos" description="Use para filtrar e encontrar oportunidades por tipo de mercado." icon={Search}>
                <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                  <div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={marketSearch} onChange={(e) => setMarketSearch(e.target.value)} placeholder="Ex.: GARE11, dividendos, logística, banco..." className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></div>
                  <select value={marketType} onChange={(e) => setMarketType(e.target.value as AssetType | "TODOS")} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-slate-950">{assetTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                </div>
                <div className="space-y-3">{marketResults.slice(0, 8).map((asset, index) => <RankingRow key={asset.ticker} asset={{ ...asset, score: calculateAssetScore(asset, weights) }} index={index + 1} onClick={() => selectAsset(asset, "mercado")} />)}</div>
              </PremiumCard>
              <PremiumCard title="Melhores scores do mercado" description="Classificação automatizada com critérios transparentes. Não é recomendação personalizada." icon={TrendingUp}>
                <div className="space-y-3">{[...assets].map((asset) => ({ ...asset, score: calculateAssetScore(asset, weights) })).sort((a, b) => b.score - a.score).slice(0, 12).map((asset, index) => <RankingRow key={asset.ticker} asset={asset} index={index + 1} onClick={() => selectAsset(asset, "mercado")} />)}</div>
              </PremiumCard>
            </div>
          </Section>
        )}

        {clientModule === "comparador" && (
          <Section title="Comparador" subtitle="Compare qualquer combinação: ação, FII, ETF, BDR ou cripto." eyebrow="Gráfico profissional">
            <PremiumCard title="Comparar ativos" description="Use as barras de pesquisa para escolher os dois lados da comparação." icon={LineChartIcon}>
              <div className="grid gap-4 lg:grid-cols-2">
                <SearchBox label="Pesquisar Ativo A" value={searchA} onChange={setSearchA} assets={assets} onSelect={(asset) => { setAssetA(asset); setSearchA(asset.ticker); }} />
                <SearchBox label="Pesquisar Ativo B" value={searchB} onChange={setSearchB} assets={assets} onSelect={(asset) => { setAssetB(asset); setSearchB(asset.ticker); }} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">{ranges.map((item) => <button key={item.id} onClick={() => setRange(item.id)} className={cls("rounded-full px-4 py-2 text-sm font-bold", range === item.id ? "bg-teal-500 text-white" : "bg-slate-100 dark:bg-white/10")}>{item.label}</button>)}</div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2"><PerformancePill asset={assetA} value={returnA} /><PerformancePill asset={assetB} value={returnB} /></div>
              <div className="mt-5 h-[430px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={comparison}><CartesianGrid strokeDasharray="3 3" opacity={0.16} /><XAxis dataKey="label" minTickGap={28} /><YAxis yAxisId="left" unit="%" /><YAxis yAxisId="right" orientation="right" tickFormatter={(value) => compactMoney.format(Number(value))} /><Tooltip formatter={(value, name) => name === "Volume" ? compactMoney.format(Number(value)) : `${value}%`} /><Legend /><Bar yAxisId="right" dataKey="volumeA" name="Volume" fill="#334155" opacity={0.22} /><Line yAxisId="left" type="monotone" dataKey={assetA.ticker} name={`${assetA.ticker} %`} stroke="#14b8a6" strokeWidth={3} dot={false} /><Line yAxisId="left" type="monotone" dataKey={assetB.ticker} name={`${assetB.ticker} %`} stroke="#38bdf8" strokeWidth={3} dot={false} /></ComposedChart></ResponsiveContainer></div>
              <ComparisonTable a={assetA} b={assetB} />
            </PremiumCard>
          </Section>
        )}

        {clientModule === "carteira" && (
          <Section title="Minha Carteira" subtitle="Cadastre ativos e acompanhe lucro, prejuízo, dividendos e concentração." eyebrow="Controle do usuário">
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <PremiumCard title="Adicionar ativo" description="Ticker, quantidade, preço médio, corretora e data." icon={Plus}>
                <form onSubmit={addPortfolioPosition} className="grid gap-3"><Input name="ticker" label="Ticker" placeholder="GARE11" required /><Input name="quantity" type="number" step="0.01" label="Quantidade" required /><Input name="averagePrice" type="number" step="0.01" label="Preço médio" required /><Input name="broker" label="Corretora" placeholder="XP, Rico, BTG..." /><Input name="purchaseDate" type="date" label="Data da compra" /><button className="rounded-2xl bg-teal-500 px-4 py-3 font-bold text-white">Adicionar à carteira</button></form>
              </PremiumCard>
              <PremiumCard title="Posições" description="Análise automática das posições cadastradas." icon={WalletCards}>
                <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Ativo</th><th className="p-3">Qtd.</th><th className="p-3">Preço médio</th><th className="p-3">Atual</th><th className="p-3">Lucro/Prejuízo</th><th className="p-3">Peso</th><th className="p-3"></th></tr></thead><tbody>{portfolioAnalysis.lines.map((line) => <tr key={line.id} className="border-t border-slate-100 dark:border-white/10"><td className="p-3 font-black">{line.ticker}<p className="text-xs font-normal text-slate-500">{typeLabels[line.asset.type]}</p></td><td className="p-3">{line.quantity}</td><td className="p-3">{money.format(line.averagePrice)}</td><td className="p-3">{money.format(line.asset.price)}</td><td className={cls("p-3 font-black", line.profit >= 0 ? "text-emerald-500" : "text-red-500")}>{money.format(line.profit)}<p className="text-xs">{pct(line.profitability)}</p></td><td className="p-3">{pct(line.weight)}</td><td className="p-3"><button onClick={() => setPortfolio((current) => current.filter((item) => item.id !== line.id))} className="rounded-xl bg-red-500/10 p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
              </PremiumCard>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2"><PremiumCard title="Análise IA da carteira" description="Diversificação, concentração, risco e dividendos." icon={BrainCircuit}><ul className="space-y-2">{portfolioAnalysis.aiSummary.map((item) => <li key={item} className="flex gap-2 text-sm"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />{item}</li>)}</ul></PremiumCard><PremiumCard title="Alertas automatizados" description="Condições de risco e concentração." icon={AlertTriangle}><ul className="space-y-2">{portfolioAnalysis.alerts.map((item) => <li key={item} className="flex gap-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{item}</li>)}</ul></PremiumCard></div>
          </Section>
        )}

        {clientModule === "radar" && (
          <Section title="Radar IA" subtitle="Ranking de oportunidades com score transparente e configurável." eyebrow="Inteligência automatizada">
            <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
              <PremiumCard title="Critérios do score" description="Ajuste os pesos da avaliação." icon={Settings}>{Object.entries(weights).map(([key, value]) => <WeightSlider key={key} label={radarLabel(key)} value={value} onChange={(next) => setWeights((current) => ({ ...current, [key]: next }))} />)}</PremiumCard>
              <PremiumCard title="Ranking geral" description="Ações, FIIs, ETFs, BDRs e criptomoedas." icon={BrainCircuit}><div className="space-y-3">{[...assets].map((asset) => ({ ...asset, score: calculateAssetScore(asset, weights) })).sort((a, b) => b.score - a.score).slice(0, 15).map((asset, index) => <RankingRow key={asset.ticker} asset={asset} index={index + 1} onClick={() => selectAsset(asset, "mercado")} />)}</div></PremiumCard>
            </div>
          </Section>
        )}

        {clientModule === "relatorios" && (
          <Section title="Relatórios" subtitle="Resumo profissional com carteira, dividendos, setores, alertas e exportação." eyebrow="PDF, Excel e CSV">
            <PremiumCard title="Relatório da carteira" description="Exportação CSV e impressão em PDF pelo navegador." icon={FileSpreadsheet}>
              <div className="grid gap-4 sm:grid-cols-3"><InfoTile label="Patrimônio" value={money.format(portfolioAnalysis.totalEquity)} /><InfoTile label="Lucro/Prejuízo" value={money.format(portfolioAnalysis.totalProfit)} /><InfoTile label="Dividendos/ano" value={money.format(portfolioAnalysis.projectedDividendsYear)} /></div>
              <div className="mt-5 flex flex-wrap gap-3"><button onClick={exportPortfolioCsv} className="rounded-2xl bg-teal-500 px-5 py-3 font-bold text-white"><Download className="mr-2 inline h-4 w-4" />Exportar CSV</button><button onClick={() => window.print()} className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950">Imprimir / PDF</button></div>
            </PremiumCard>
          </Section>
        )}

        {clientModule === "configuracoes" && <SettingsSection currentUser={currentUser} darkMode={darkMode} setDarkMode={setDarkMode} settings={settings} setSettings={setSettings} changePassword={changePassword} logout={logout} />}
      </div>
    </Shell>
  );
}

function Shell({ darkMode, setDarkMode, logout, user, modules, activeId, onMenu, children }: { darkMode: boolean; setDarkMode: (value: boolean) => void; logout: () => void; user: Account; modules: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }>; group?: string }>; activeId: string; onMenu: (id: string) => void; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const adminGroups = ["Área do cliente", "Administração"];
  const activeModule = modules.find((item) => item.id === activeId);
  const groupedModules = user.role === "ADMIN"
    ? adminGroups.map((group) => ({ group, items: modules.filter((item) => item.group === group) })).filter((item) => item.items.length)
    : [{ group: "Menu principal", items: modules }];

  const renderMenuButton = (item: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
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
        <aside className={cls(
          "fixed inset-y-0 left-0 z-50 flex w-[19rem] flex-col border-r border-slate-200/70 bg-white/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 dark:border-white/10 dark:bg-slate-950/95 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="border-b border-slate-200/70 p-5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <img src="/logo-alfatec.png" alt="Invest Pro" className="h-14 w-14 object-contain" />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white">INVEST PRO</h1>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-500">Análise premium</p>
              </div>
            </div>
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Perfil</p>
              <p className="mt-1 truncate text-sm font-black">{user.name}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{user.role === "ADMIN" ? "Administrador" : "Cliente"}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
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

          <div className="border-t border-slate-200/70 p-4 dark:border-white/10">
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

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex h-20 items-center justify-between gap-3 px-4 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:scale-105 dark:border-white/10 dark:bg-white/5 lg:hidden" aria-label="Abrir menu lateral"><Menu className="h-5 w-5" /></button>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-500">{user.role === "ADMIN" ? "Painel administrativo" : "Área do cliente"}</p>
                  <h2 className="truncate text-lg font-black sm:text-2xl">{activeModule?.label ?? "INVEST PRO"}</h2>
                </div>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold dark:bg-white/10">{user.role === "ADMIN" ? "Admin" : "Cliente"}</span>
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

function LoginScreen({ darkMode, setDarkMode, loginUser, setLoginUser, loginPassword, setLoginPassword, showPassword, setShowPassword, loginError, onSubmit }: { darkMode: boolean; setDarkMode: (value: boolean) => void; loginUser: string; setLoginUser: (value: string) => void; loginPassword: string; setLoginPassword: (value: string) => void; showPassword: boolean; setShowPassword: (value: boolean) => void; loginError: string; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="relative grid h-screen min-h-screen overflow-hidden bg-slate-100 px-4 text-slate-950 dark:bg-[#020817] dark:text-slate-100 sm:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(6,182,212,0.22),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(20,184,166,0.12),transparent_34%)]" />
      <div className="relative z-10 grid h-full place-items-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 lg:grid-cols-[0.9fr_1fr]">
          <div className="hidden overflow-hidden bg-slate-950/95 p-7 text-white lg:flex lg:flex-col lg:justify-center">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_top,#0ea5e9_0,transparent_38%)] opacity-25" />
            <img src="/logo-alfatec.png" alt="Invest Pro" className="relative z-10 mx-auto h-56 w-56 object-contain" />
            <div className="relative z-10 mt-7">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Acesso seguro</p>
              <h2 className="mt-3 text-3xl font-black text-white">INVEST PRO</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">Gestão de clientes, planos, financeiro e análise inteligente de investimentos em uma interface profissional.</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="relative p-6 sm:p-8 lg:p-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src="/logo-alfatec.png" alt="Invest Pro" className="h-16 w-16 object-contain lg:hidden" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-500">Login</p>
                  <h1 className="text-2xl font-black">Entrar na plataforma</h1>
                </div>
              </div>
              <button type="button" onClick={() => setDarkMode(!darkMode)} className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:scale-105 dark:border-white/10 dark:bg-white/5" aria-label="Alternar tema">{darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            </div>
            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Usuário ou e-mail</span>
              <div className="relative"><UserCog className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400" placeholder="Digite seu usuário ou e-mail" autoComplete="username" /></div>
            </label>
            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Senha</span>
              <div className="relative"><KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input type={showPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400" placeholder="Digite sua senha" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Visualizar ou ocultar senha">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
            </label>
            {loginError && <div className="mb-4 rounded-2xl bg-red-500/10 p-4 text-sm font-semibold text-red-500">{loginError}</div>}
            <button className="h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 font-black text-white shadow-glow transition hover:scale-[1.01]">Entrar</button>
            <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">Acesso protegido por perfil. Clientes bloqueados ou vencidos não acessam os módulos internos.</p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

function GlobalSearchBox({ globalSearch, setGlobalSearch, globalSuggestions, selectAsset, searchHistory, assets }: { globalSearch: string; setGlobalSearch: (value: string) => void; globalSuggestions: Asset[]; selectAsset: (asset: Asset, module?: ClientModuleId) => void; searchHistory: string[]; assets: Asset[] }) {
  return <div className="relative mb-6"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Pesquisar em toda a plataforma: ticker, nome, setor, segmento ou tipo..." className="h-14 w-full rounded-3xl border border-slate-200 bg-white pl-12 pr-12 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400" />{globalSearch && <button onClick={() => setGlobalSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-4 w-4" /></button>}{globalSearch && <div className="absolute top-16 z-50 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-premium dark:border-white/10 dark:bg-slate-900"><div className="border-b border-slate-100 p-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-white/10">Sugestões instantâneas</div>{globalSuggestions.map((asset) => <button key={asset.ticker} onClick={() => { selectAsset(asset); setGlobalSearch(""); }} className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"><span><strong>{asset.ticker}</strong><span className="ml-2 text-sm text-slate-500">{asset.name}</span></span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-white/10">{typeLabels[asset.type]}</span></button>)}<div className="flex flex-wrap gap-2 border-t border-slate-100 p-3 text-xs dark:border-white/10">{searchHistory.length > 0 && <span className="text-slate-400">Histórico:</span>}{searchHistory.map((ticker) => <button key={ticker} onClick={() => selectAsset(getAsset(ticker, assets))} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-white/10">{ticker}</button>)}</div></div>}</div>;
}

function Section({ title, subtitle, eyebrow, children }: { title: string; subtitle: string; eyebrow: string; children: React.ReactNode }) {
  return <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}><div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-500">{eyebrow}</p><h2 className="mt-2 text-3xl font-black tracking-tight lg:text-4xl">{title}</h2><p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">{subtitle}</p></div>{children}</motion.section>;
}
function PremiumCard({ title, description, icon: Icon, children }: { title: string; description: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/80"><div className="mb-5 flex items-start gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-500"><Icon className="h-5 w-5" /></div><div><h3 className="text-lg font-black">{title}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{description}</p></div></div>{children}</div>;
}
function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: string }) {
  const tones: Record<string, string> = { teal: "from-teal-400 to-cyan-500", green: "from-emerald-400 to-green-600", red: "from-red-400 to-rose-600", blue: "from-sky-400 to-blue-600", purple: "from-violet-400 to-purple-600", amber: "from-amber-400 to-orange-500", slate: "from-slate-500 to-slate-800" };
  return <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/80"><div className={cls("mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white", tones[tone])}><Icon className="h-5 w-5" /></div><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-2xl font-black tracking-tight">{value}</p></div>;
}
function AssetCard({ asset, favorites, onSelect, onFavorite }: { asset: Asset; favorites: string[]; onSelect: () => void; onFavorite: () => void }) {
  return <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"><div className="flex items-start justify-between gap-3"><button onClick={onSelect} className="text-left"><p className="text-xs text-slate-500 dark:text-slate-300">{typeLabels[asset.type]} • {asset.segment}</p><h3 className="mt-1 text-xl font-black">{asset.ticker}</h3><p className="text-sm text-slate-500 dark:text-slate-300">{asset.name}</p>{asset.source === "external" && <p className="mt-2 text-xs font-bold text-cyan-600 dark:text-cyan-300">Fonte: Google Finance via provedor externo</p>}</button><button onClick={onFavorite} className="rounded-xl bg-white p-2 dark:bg-white/10"><Star className={cls("h-4 w-4", favorites.includes(asset.ticker) && "fill-amber-400 text-amber-400")} /></button></div><div className="mt-4 grid grid-cols-3 gap-2"><InfoTile label="Preço" value={money.format(asset.price)} /><InfoTile label="Dia" value={pct(asset.changeDay)} /><InfoTile label="Score" value={`${asset.score}/100`} /></div></div>;
}
function AssetPanel({ asset, favorites, setFavorites, onAddToPortfolio }: { asset: Asset; favorites: string[]; setFavorites: React.Dispatch<React.SetStateAction<string[]>>; onAddToPortfolio: (asset: Asset) => void }) {
  const isFavorite = favorites.includes(asset.ticker);
  return <PremiumCard title="Página do ativo" description="Informações, indicadores, IA e fundamentos." icon={ShieldCheck}><div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-cyan-300">{typeLabels[asset.type]} • {asset.segment}</p><h3 className="mt-1 text-3xl font-black">{asset.ticker}</h3><p className="text-slate-300">{asset.name}</p></div><button onClick={() => setFavorites((current) => isFavorite ? current.filter((ticker) => ticker !== asset.ticker) : [asset.ticker, ...current])} className="rounded-2xl bg-white/10 p-3 hover:bg-white/20"><Star className={cls("h-5 w-5", isFavorite && "fill-amber-400 text-amber-400")} /></button></div><div className="mt-6 grid grid-cols-3 gap-3"><InfoTile dark label="Preço" value={money.format(asset.price)} /><InfoTile dark label="Ano" value={pct(asset.changeYear)} /><InfoTile dark label="Score" value={`${asset.score}/100`} /></div></div><div className="mt-4 grid grid-cols-2 gap-3"><InfoTile label="Mercado" value={asset.market} /><InfoTile label="Setor" value={asset.sector} /><InfoTile label="Liquidez" value={compactMoney.format(asset.liquidity)} /><InfoTile label="Risco" value={asset.risk} /><InfoTile label="Dividend Yield" value={pct(asset.metrics.dividendYield)} /><InfoTile label="P/VP" value={metric(asset.metrics.pvp)} /><InfoTile label="P/L" value={metric(asset.metrics.pl)} /><InfoTile label="ROE" value={pct(asset.metrics.roe)} /></div><div className="mt-4 rounded-3xl border border-slate-200 p-4 dark:border-white/10"><p className="mb-2 text-sm font-black">Resumo IA do ativo</p><p className="text-sm text-slate-600 dark:text-slate-300">{asset.summary}</p><ul className="mt-3 space-y-2">{generateAiNotes(asset).map((note) => <li key={note} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />{note}</li>)}</ul></div>{asset.source === "external" && <p className="mt-3 text-sm font-bold text-cyan-600 dark:text-cyan-300">Fonte: Google Finance via provedor externo</p>}<a href={googleFinanceUrl(asset)} target="_blank" rel="noreferrer" className="mt-4 flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10">Abrir no Google Finanças</a><button onClick={() => onAddToPortfolio(asset)} className="mt-3 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-bold text-white">Adicionar à carteira</button></PremiumCard>;
}
function InfoTile({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return <div className={cls("rounded-2xl p-3", dark ? "bg-white/10" : "bg-slate-50 dark:bg-white/5")}><p className={cls("text-xs", dark ? "text-slate-300" : "text-slate-500")}>{label}</p><p className="mt-1 font-black">{value}</p></div>;
}
function SearchBox({ label, value, onChange, assets, onSelect }: { label: string; value: string; onChange: (value: string) => void; assets: Asset[]; onSelect: (asset: Asset) => void }) {
  const suggestions = searchAssets(value, "TODOS", assets).slice(0, 6);
  return <div className="relative"><label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</label><Search className="absolute left-4 top-[43px] h-5 w-5 text-slate-400" /><input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { const asset = suggestions[0]; if (asset) onSelect(asset); } }} className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 outline-none focus:border-cyan-400 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400" placeholder="Digite ticker ou nome" />{value && <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-premium dark:border-white/10 dark:bg-slate-900">{suggestions.map((asset) => <button key={asset.ticker} onClick={() => onSelect(asset)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"><span><strong>{asset.ticker}</strong><span className="ml-2 text-slate-500">{asset.name}</span></span><span className="text-xs text-slate-400">{typeLabels[asset.type]}</span></button>)}</div>}</div>;
}
function PerformancePill({ asset, value }: { asset: Asset; value: number }) {
  return <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{asset.name}</p><p className="text-xl font-black">{asset.ticker}</p></div><div className={cls("flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black", value >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>{value >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}{pct(value)}</div></div></div>;
}
function ComparisonTable({ a, b }: { a: Asset; b: Asset }) {
  const rows = [["Preço", money.format(a.price), money.format(b.price)], ["Dividend Yield", pct(a.metrics.dividendYield), pct(b.metrics.dividendYield)], ["P/L", metric(a.metrics.pl), metric(b.metrics.pl)], ["P/VP", metric(a.metrics.pvp), metric(b.metrics.pvp)], ["ROE", pct(a.metrics.roe), pct(b.metrics.roe)], ["CAGR", pct(a.metrics.cagr), pct(b.metrics.cagr)], ["Volatilidade", pct(a.metrics.volatility), pct(b.metrics.volatility)], ["Drawdown", pct(a.metrics.drawdown), pct(b.metrics.drawdown)], ["Liquidez", compactMoney.format(a.liquidity), compactMoney.format(b.liquidity)], ["Risco", a.risk, b.risk]];
  return <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 text-sm dark:border-white/10"><div className="grid grid-cols-3 bg-slate-50 p-3 font-bold dark:bg-white/5"><span>Indicador</span><span>{a.ticker}</span><span>{b.ticker}</span></div>{rows.map((row) => <div key={row[0]} className="grid grid-cols-3 border-t border-slate-100 p-3 dark:border-white/10"><span className="text-slate-500">{row[0]}</span><strong>{row[1]}</strong><strong>{row[2]}</strong></div>)}</div>;
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
  return <button onClick={onClick} className="flex w-full items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:scale-[1.01] hover:shadow-premium dark:border-white/10 dark:bg-white/5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 font-black text-white dark:bg-white dark:text-slate-950">{index}</span><span className="min-w-0 flex-1"><strong>{asset.ticker}</strong><span className="ml-2 text-sm text-slate-500">{asset.name}</span><p className="mt-1 text-xs text-slate-400">{typeLabels[asset.type]} • {asset.segment}</p></span><span className="rounded-full bg-cyan-500/10 px-3 py-1 font-black text-cyan-600 dark:text-cyan-300">{asset.score}</span></button>;
}
function StatusPill({ status }: { status: ClientStatus | PaymentStatus }) {
  const map: Record<string, string> = { ativo: "bg-emerald-500/10 text-emerald-500", pago: "bg-emerald-500/10 text-emerald-500", bloqueado: "bg-red-500/10 text-red-500", vencido: "bg-amber-500/10 text-amber-500", pendente: "bg-amber-500/10 text-amber-500", cancelado: "bg-slate-500/10 text-slate-500" };
  return <span className={cls("inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-black uppercase", map[status])}>{status}</span>;
}
function PlanCard({ plan, setPlans }: { plan: Plan; setPlans: React.Dispatch<React.SetStateAction<Plan[]>> }) {
  function update(patch: Partial<Plan>) { setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, ...patch } : item)); }
  return <PremiumCard title={plan.name} description={`${plan.durationDays} dias de acesso`} icon={ShieldCheck}><div className="space-y-3"><Input label="Valor" type="number" step="0.01" value={plan.value} onChange={(e) => update({ value: Number(e.target.value) })} /><Input label="Duração em dias" type="number" value={plan.durationDays} onChange={(e) => update({ durationDays: Number(e.target.value) })} /><Select label="Status" value={plan.status} onChange={(e) => update({ status: e.target.value as "ativo" | "inativo" })}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></Select><div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><p className="mb-2 text-sm font-bold">Permissões</p>{clientModules.map((module) => <label key={module.id} className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={plan.permissions.includes(module.id)} onChange={(e) => update({ permissions: e.target.checked ? [...plan.permissions, module.id] : plan.permissions.filter((id) => id !== module.id) })} />{module.label}</label>)}</div></div></PremiumCard>;
}
function PermissionsEditor({ client, updateClient }: { client: Account; updateClient: (id: string, patch: Partial<Account>) => void }) {
  return <div className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><p className="mb-2 text-sm font-bold">Menus liberados para o cliente</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{clientModules.map((module) => <label key={module.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={client.permissions.includes(module.id)} onChange={(e) => updateClient(client.id, { permissions: e.target.checked ? [...client.permissions, module.id] : client.permissions.filter((id) => id !== module.id) })} />{module.label}</label>)}</div></div>;
}
function ChartRevenue({ payments }: { payments: Payment[] }) {
  const data = ["pago", "pendente", "vencido", "cancelado"].map((status) => ({ status, valor: payments.filter((item) => item.status === status).reduce((sum, item) => sum + item.value, 0) }));
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" opacity={0.18} /><XAxis dataKey="status" /><YAxis tickFormatter={(value) => compactMoney.format(Number(value))} /><Tooltip formatter={(value) => money.format(Number(value))} /><Bar dataKey="valor" name="Valor" radius={[12, 12, 0, 0]} fill="#06b6d4" /></BarChart></ResponsiveContainer>;
}
function PieBlock({ data }: { data: Array<{ name: string; value: number }> }) {
  return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={65} outerRadius={110} paddingAngle={3}>{data.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip formatter={(value) => money.format(Number(value))} /><Legend /></PieChart></ResponsiveContainer></div>;
}
function SettingsSection({ currentUser, darkMode, setDarkMode, settings, setSettings, changePassword, logout }: { currentUser: Account; darkMode: boolean; setDarkMode: (value: boolean) => void; settings: { currency: string; language: string; autoUpdate: boolean; priceAlerts: boolean; dividendAlerts: boolean }; setSettings: React.Dispatch<React.SetStateAction<{ currency: string; language: string; autoUpdate: boolean; priceAlerts: boolean; dividendAlerts: boolean }>>; changePassword: (event: React.FormEvent<HTMLFormElement>) => void; logout: () => void }) {
  return <Section title="Configurações" subtitle="Conta, senha, tema, alertas e preferências." eyebrow="Preferências"><div className="grid gap-6 lg:grid-cols-2"><PremiumCard title="Dados da conta" description="Informações do usuário autenticado." icon={UserCog}><InfoTile label="Nome" value={currentUser.name} /><div className="mt-3"><InfoTile label="Perfil" value={currentUser.role === "ADMIN" ? "Administrador" : "Cliente"} /></div><div className="mt-3"><InfoTile label="Status" value={currentUser.status} /></div><button onClick={logout} className="mt-4 rounded-2xl bg-red-500 px-5 py-3 font-bold text-white"><LogOut className="mr-2 inline h-4 w-4" />Sair da conta</button></PremiumCard><PremiumCard title="Alterar senha" description="A senha é armazenada como hash SHA-256 nesta versão local." icon={KeyRound}><form onSubmit={changePassword} className="grid gap-3"><Input name="currentPassword" type="password" label="Senha atual" required /><Input name="newPassword" type="password" label="Nova senha" required /><Input name="confirmPassword" type="password" label="Confirmar nova senha" required /><button className="rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-white">Alterar senha</button></form></PremiumCard><PremiumCard title="Tema e visual" description="Modo claro/escuro aplicado em toda a plataforma." icon={Moon}><Toggle label="Modo escuro" checked={darkMode} onChange={setDarkMode} /><Toggle label="Atualização automática" checked={settings.autoUpdate} onChange={(value) => setSettings((current) => ({ ...current, autoUpdate: value }))} /><Toggle label="Alertas de preço" checked={settings.priceAlerts} onChange={(value) => setSettings((current) => ({ ...current, priceAlerts: value }))} /><Toggle label="Alertas de dividendos" checked={settings.dividendAlerts} onChange={(value) => setSettings((current) => ({ ...current, dividendAlerts: value }))} /></PremiumCard><PremiumCard title="Localização" description="Moeda e idioma da interface." icon={Settings}><Select label="Moeda" value={settings.currency} onChange={(e) => setSettings((current) => ({ ...current, currency: e.target.value }))}><option value="BRL">Real brasileiro</option><option value="USD">Dólar americano</option></Select><div className="mt-3"><Select label="Idioma" value={settings.language} onChange={(e) => setSettings((current) => ({ ...current, language: e.target.value }))}><option value="pt-BR">Português Brasil</option><option value="en-US">English</option></Select></div></PremiumCard></div></Section>;
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
  const expected = clients.reduce((sum, client) => sum + (plans.find((plan) => plan.id === client.planId)?.value ?? 0), 0);
  return { active, blocked, expired, received, pending, expected };
}
function buildEquityCurve(lines: ReturnType<typeof analyzePortfolio>["lines"]) {
  const map = new Map<string, number>();
  lines.forEach((line) => line.asset.priceHistory.slice(-36).forEach((point) => map.set(point.label, (map.get(point.label) ?? 0) + point.price * line.quantity)));
  return Array.from(map.entries()).map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }));
}
function radarLabel(key: string) {
  const map: Record<string, string> = { dividendYield: "Dividendos", valuation: "Valuation", quality: "Qualidade", growth: "Crescimento", liquidity: "Liquidez", risk: "Risco" };
  return map[key] ?? key;
}
