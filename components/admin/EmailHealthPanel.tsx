"use client";

import { Eye, Image as ImageIcon, MailCheck, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Health = {
  configuration: {
    provider: string;
    configured: boolean;
    fromName: string;
    fromAddress: string;
    host: string;
    port: number | null;
    secure: boolean;
    errors: string[];
  };
  logo: { ok: boolean; url: string; status: number | null; contentType: string; size: number | null; checkedAt: string; error: string | null };
  previewHtml: string;
  deliveries: {
    pending: number;
    failed: number;
    sent: number;
    lastSuccessAt: string | null;
    lastErrorAt: string | null;
    lastError: string | null;
  };
};

export function EmailHealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/email/health", { cache: "no-store" });
    if (!response.ok) return;
    setHealth(await response.json());
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function run(action: "verify" | "check_logo" | "send_test") {
    setLoading(action);
    setMessage("");
    try {
      const response = await fetch("/api/admin/email/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, recipient: action === "send_test" ? recipient : undefined })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || body.errors?.join(" ") || body.errorMessage || "Teste não concluído.");
      setMessage(action === "verify" ? "Conexão SMTP verificada." : action === "check_logo" ? "Logo público verificado como imagem PNG." : "Mensagem aceita pelo provedor SMTP.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Teste não concluído.");
      await refresh();
    } finally {
      setLoading("");
    }
  }

  if (!health) return <div className="flex items-center gap-2 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />Carregando diagnóstico...</div>;
  const configuration = health.configuration;
  const deliveries = health.deliveries;
  const logo = health.logo;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5"><span className="text-slate-500 dark:text-slate-400">Provedor</span><strong className="mt-1 block uppercase">{configuration.provider}</strong></div>
        <div className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5"><span className="text-slate-500 dark:text-slate-400">Configuração</span><strong className="mt-1 block">{configuration.configured ? "Carregada" : "Incompleta"}</strong></div>
        <div className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5"><span className="text-slate-500 dark:text-slate-400">Remetente</span><strong className="mt-1 block break-all">{configuration.fromAddress || "Não configurado"}</strong></div>
        <div className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5"><span className="text-slate-500 dark:text-slate-400">Servidor</span><strong className="mt-1 block">{configuration.host || "-"}:{configuration.port || "-"}</strong></div>
      </div>
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><span className="text-sm text-slate-500 dark:text-slate-400">Logo dos e-mails</span><strong className="mt-1 block break-all text-sm">{logo.url}</strong><p className={`mt-1 text-xs font-bold ${logo.ok ? "text-emerald-600 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}`}>{logo.ok ? `PNG disponível${logo.size ? ` · ${Math.round(logo.size / 1024)} KB` : ""}` : logo.error || "Falha na verificação"}</p></div><button type="button" onClick={() => run("check_logo")} disabled={Boolean(loading)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-400 px-4 text-sm font-black text-cyan-700 disabled:opacity-50 dark:text-cyan-200"><ImageIcon className="h-4 w-4" />{loading === "check_logo" ? "Verificando..." : "Verificar logo"}</button></div>
        <button type="button" onClick={() => setShowPreview((value) => !value)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 dark:bg-white/10 dark:text-white"><Eye className="h-4 w-4" />{showPreview ? "Ocultar prévia" : "Visualizar modelo de e-mail"}</button>
        {showPreview && <iframe title="Prévia do modelo de e-mail" sandbox="" srcDoc={health.previewHtml} className="mt-4 h-[34rem] w-full rounded-xl border border-slate-200 bg-white dark:border-white/10" />}
      </div>      {configuration.errors.length > 0 && <div className="rounded-2xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"><strong>Configuração de e-mail incompleta.</strong>{configuration.errors.map((item) => <p key={item} className="mt-1">{item}</p>)}</div>}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-emerald-500/10 p-3"><strong className="block text-lg">{deliveries.sent}</strong>Enviados</div>
        <div className="rounded-xl bg-amber-500/10 p-3"><strong className="block text-lg">{deliveries.pending}</strong>Pendentes</div>
        <div className="rounded-xl bg-red-500/10 p-3"><strong className="block text-lg">{deliveries.failed}</strong>Falhas</div>
      </div>
      <button type="button" onClick={() => run("verify")} disabled={Boolean(loading)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 font-black text-white disabled:opacity-50 dark:bg-white/10"><MailCheck className="h-4 w-4" />{loading === "verify" ? "Verificando..." : "Testar conexão SMTP"}</button>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="destinatario@email.com" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white" />
        <button type="button" onClick={() => run("send_test")} disabled={Boolean(loading) || !recipient} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 font-black text-white disabled:opacity-50"><Send className="h-4 w-4" />{loading === "send_test" ? "Enviando..." : "Enviar e-mail de teste"}</button>
      </div>
      {deliveries.lastSuccessAt && <p className="text-xs text-slate-500 dark:text-slate-400">Último envio bem-sucedido: {new Date(deliveries.lastSuccessAt).toLocaleString("pt-BR")}</p>}
      {deliveries.lastError && <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">Último erro: {deliveries.lastError}</p>}
      {message && <p className="rounded-xl bg-cyan-500/10 p-3 text-sm font-semibold text-cyan-800 dark:text-cyan-200">{message}</p>}
    </div>
  );
}
