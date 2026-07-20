"use client";

import { Bell, CheckCheck, Clock3, ExternalLink, Mail, Settings2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  notificationTopics,
  type AppNotification,
  type NotificationFrequency,
  type NotificationPreference
} from "@/lib/notifications/notifications";

const filters = [
  ["all", "Todas"], ["unread", "Não lidas"], ["opportunities", "Oportunidades"], ["portfolio", "Carteira"],
  ["plan", "Plano"], ["payments", "Pagamentos"], ["risk", "Risco"], ["system", "Sistema"]
] as const;
const frequencyLabels: Record<NotificationFrequency, string> = { immediate: "Imediata", daily: "Resumo diário", weekly: "Resumo semanal", in_app_only: "Somente na plataforma" };
const priorityStyle = {
  informative: "bg-blue-500/10 text-blue-700 dark:text-blue-200", attention: "bg-amber-500/10 text-amber-700 dark:text-amber-200",
  important: "bg-orange-500/10 text-orange-700 dark:text-orange-200", critical: "bg-red-500/10 text-red-700 dark:text-red-200"
};

export function NotificationCenter() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("all");
  const [period, setPeriod] = useState<"all" | "7" | "30">("all");
  const [showPreferences, setShowPreferences] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [notificationResponse, preferenceResponse] = await Promise.all([
        fetch("/api/notifications", { cache: "no-store" }), fetch("/api/notification-preferences", { cache: "no-store" })
      ]);
      const notificationsBody = await notificationResponse.json().catch(() => ({}));
      const preferencesBody = await preferenceResponse.json().catch(() => ({}));
      if (!notificationResponse.ok) throw new Error(notificationsBody.error || "Não foi possível carregar as notificações.");
      if (!preferenceResponse.ok) throw new Error(preferencesBody.error || "Não foi possível carregar as preferências.");
      const essentialTopics = new Set(notificationTopics.filter((item) => item.essential).map((item) => item.topic));
      const loadedPreferences = (preferencesBody.preferences || []) as NotificationPreference[];
      setItems(notificationsBody.notifications || []);
      setPreferences(loadedPreferences.map((item) => {
        const linked = essentialTopics.has(item.topic) || item.emailEnabled;
        return {
          ...item,
          inAppEnabled: linked,
          emailEnabled: linked,
          frequency: linked && item.frequency === "in_app_only" ? "immediate" : item.frequency
        };
      }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar as notificações."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => {
    const cutoff = period === "all" ? 0 : Date.now() - Number(period) * 24 * 60 * 60 * 1000;
    return items.filter((item) => (filter === "all" || (filter === "unread" ? !item.readAt : item.category === filter)) && new Date(item.createdAt).getTime() >= cutoff);
  }, [items, filter, period]);
  const grouped = useMemo(() => {
    const values = new Map<string, AppNotification[]>();
    for (const item of visible) {
      const label = new Date(item.createdAt).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      values.set(label, [...(values.get(label) || []), item]);
    }
    return Array.from(values.entries());
  }, [visible]);
  const unread = items.filter((item) => !item.readAt).length;

  async function updateNotifications(action: "mark_read" | "mark_all_read" | "delete", id?: string) {
    setError("");
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || "Não foi possível atualizar a notificação."); return; }
    const now = new Date().toISOString();
    setItems((current) => action === "delete" ? current.filter((item) => item.id !== id) : current.map((item) => (action === "mark_all_read" || item.id === id) ? { ...item, readAt: item.readAt || now } : item));
    window.dispatchEvent(new Event("alfatec:notifications-updated"));
  }

  function updatePreference(topic: string, field: "inAppEnabled" | "emailEnabled" | "frequency", value: boolean | NotificationFrequency) {
    setPreferences((current) => current.map((item) => {
      if (item.topic !== topic) return item;
      if (field === "inAppEnabled" || field === "emailEnabled") {
        const enabled = Boolean(value);
        return {
          ...item,
          inAppEnabled: enabled,
          emailEnabled: enabled,
          frequency: enabled && item.frequency === "in_app_only" ? "immediate" : item.frequency
        };
      }
      return { ...item, frequency: value as NotificationFrequency };
    }));
  }

  async function savePreferences() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/notification-preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferences: preferences.map(({ topic, inAppEnabled, emailEnabled, frequency }) => ({ topic, inAppEnabled, emailEnabled, frequency })) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível salvar as preferências.");
      setPreferences(body.preferences || []); setMessage("Preferências salvas.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar as preferências."); }
    finally { setSaving(false); }
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Central</p><h2 className="text-2xl font-black">Notificações</h2><p className="text-sm text-slate-500 dark:text-slate-300">Acompanhe alertas do plano, pagamentos, carteira, risco e plataforma.</p></div><div className="flex gap-2"><button type="button" onClick={() => void updateNotifications("mark_all_read")} disabled={!unread} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black disabled:opacity-50 dark:border-white/10"><CheckCheck className="h-4 w-4" />Marcar todas como lidas</button><button type="button" onClick={() => setShowPreferences((value) => !value)} className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950" title="Preferências"><Settings2 className="h-5 w-5" /></button></div></div>
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">{filters.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-black ${filter === value ? "bg-cyan-500 text-white" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white"}`}>{label}{value === "unread" && unread > 0 ? ` (${unread})` : ""}</button>)}</div>
    <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">Período<select value={period} onChange={(event) => setPeriod(event.target.value as "all" | "7" | "30")} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"><option value="all">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select></label>
    {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p>}{message && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{message}</p>}
    {showPreferences && <NotificationPreferencesPanel preferences={preferences} saving={saving} onChange={updatePreference} onSave={savePreferences} />}
    <div className="space-y-5">
      {loading && <p className="rounded-2xl bg-slate-100 p-4 text-sm dark:bg-white/5">Carregando notificações...</p>}
      {!loading && visible.length === 0 && <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-300">Nenhuma notificação neste filtro.</p>}
      {grouped.map(([dateLabel, dateItems]) => <section key={dateLabel} className="space-y-3"><h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{dateLabel}</h3>{dateItems.map((item) => <NotificationRow key={item.id} item={item} onUpdate={updateNotifications} />)}</section>)}
    </div>    <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><Mail className="h-4 w-4" />Assuntos ativados são entregues na plataforma e no e-mail cadastrado, conforme a frequência escolhida.</p>
  </section>;

function NotificationPreferencesPanel({ preferences, saving, onChange, onSave }: {
  preferences: NotificationPreference[];
  saving: boolean;
  onChange: (topic: string, field: "inAppEnabled" | "emailEnabled" | "frequency", value: boolean | NotificationFrequency) => void;
  onSave: () => Promise<void>;
}) {
  return <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
    <div className="mb-4">
      <h3 className="font-black">Preferências por assunto</h3>
      <p className="text-sm text-slate-500 dark:text-slate-300">Ao ativar um assunto, o aviso aparece na plataforma e também é enviado por e-mail. Avisos essenciais permanecem ativos.</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead><tr className="border-b border-slate-200 dark:border-white/10"><th className="p-3">Assunto</th><th className="p-3">Plataforma + e-mail</th><th className="p-3">Frequência</th></tr></thead>
        <tbody>{notificationTopics.map((topic) => {
          const preference = preferences.find((item) => item.topic === topic.topic);
          if (!preference) return null;
          const enabled = preference.inAppEnabled && preference.emailEnabled;
          return <tr key={topic.topic} className="border-b border-slate-100 dark:border-white/5">
            <td className="p-3 font-bold">{topic.label}{topic.essential && <span className="ml-2 rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] uppercase text-cyan-700 dark:text-cyan-200">Essencial</span>}</td>
            <td className="p-3"><input type="checkbox" checked={enabled} disabled={topic.essential} onChange={(event) => onChange(topic.topic, "inAppEnabled", event.target.checked)} aria-label={`Ativar ${topic.label} na plataforma e por e-mail`} className="h-4 w-4" /></td>
            <td className="p-3"><select value={preference.frequency === "in_app_only" ? "immediate" : preference.frequency} disabled={topic.essential || !enabled} onChange={(event) => onChange(topic.topic, "frequency", event.target.value as NotificationFrequency)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-slate-950 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white">{Object.entries(frequencyLabels).filter(([value]) => value !== "in_app_only").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <button type="button" onClick={() => void onSave()} disabled={saving} className="mt-4 min-h-11 rounded-xl bg-cyan-500 px-5 py-2 font-black text-white disabled:opacity-60">{saving ? "Salvando..." : "Salvar preferências"}</button>
  </div>;
}

function NotificationRow({ item, onUpdate }: { item: AppNotification; onUpdate: (action: "mark_read" | "mark_all_read" | "delete", id?: string) => Promise<void> }) {
  return <article className={`rounded-2xl border p-4 ${item.readAt ? "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]" : "border-cyan-300 bg-cyan-500/5 dark:border-cyan-400/30 dark:bg-cyan-400/5"}`}><div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${priorityStyle[item.priority]}`}><Bell className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black">{item.title}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.summary}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${priorityStyle[item.priority]}`}>{item.priority}</span></div><p className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Clock3 className="h-3.5 w-3.5" />{new Date(item.createdAt).toLocaleString("pt-BR")}</p><div className="mt-3 flex flex-wrap gap-2">{!item.readAt && <button type="button" onClick={() => void onUpdate("mark_read", item.id)} className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-black text-white">Marcar como lida</button>}{item.actionUrl && <a href={item.actionUrl} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black dark:bg-white/10"><ExternalLink className="h-3.5 w-3.5" />Abrir</a>}<button type="button" onClick={() => void onUpdate("delete", item.id)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black text-red-600 dark:text-red-300"><Trash2 className="h-3.5 w-3.5" />Excluir</button></div></div></div></article>;
}}