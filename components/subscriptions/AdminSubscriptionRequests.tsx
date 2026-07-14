"use client";

import { Ban, CheckCircle2, Clock3, RefreshCw, Save, ShieldCheck, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import {
  subscriptionStatusLabels,
  type ManualSubscriptionRequest,
} from "@/lib/subscriptions/manual-subscription";

type Draft = {
  confirmationDate: string;
  startDate: string;
  expiryDate: string;
  transactionId: string;
  note: string;
};

type AdminAction =
  | "confirm_payment"
  | "activate"
  | "refuse"
  | "cancel"
  | "expire"
  | "edit_expiration"
  | "add_note";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export function AdminSubscriptionRequests() {
  const [items, setItems] = useState<ManualSubscriptionRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [filter, setFilter] = useState("todos");
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/subscription-requests", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível carregar as solicitações.");

    const requests = (body.requests || []) as ManualSubscriptionRequest[];
    setItems(requests);
    setDrafts((current) =>
      Object.fromEntries(
        requests.map((item) => [
          item.id,
          current[item.id] || {
            confirmationDate: item.confirmedAt?.slice(0, 10) || today(),
            startDate: item.activatedAt?.slice(0, 10) || today(),
            expiryDate: item.expiresAt?.slice(0, 10) || addDays(item.durationDays),
            transactionId: item.transactionId || "",
            note: item.adminNote || "",
          },
        ]),
      ),
    );
  }, []);

  useEffect(() => {
    void load().catch((reason) => setError(reason.message));
  }, [load]);

  const visible = useMemo(
    () => items.filter((item) => filter === "todos" || item.status === filter),
    [items, filter],
  );

  const updateDraft = (id: string, field: keyof Draft, value: string) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  };

  async function performAction(item: ManualSubscriptionRequest, action: AdminAction) {
    setWorking(item.id + ":" + action);
    setError("");
    try {
      const draft = drafts[item.id];
      const response = await fetch("/api/admin/subscription-requests/" + item.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          confirmationDate: draft.confirmationDate || undefined,
          startDate: draft.startDate || undefined,
          expiryDate: draft.expiryDate || undefined,
          transactionId: draft.transactionId || undefined,
          note: draft.note || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Operação não concluída.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Operação não concluída.");
    } finally {
      setWorking("");
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">Solicitações de assinatura</h3>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Confirmação e ativação manual de pagamentos feitos no link oficial.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-slate-950 p-3 text-white dark:bg-white dark:text-slate-950"
          title="Atualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <select
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-slate-900"
      >
        <option value="todos">Todos os status</option>
        {Object.entries(subscriptionStatusLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {error && (
        <p className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {visible.map((item) => {
          const draft = drafts[item.id];
          if (!draft) return null;
          return (
            <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h4 className="font-black">{item.userName}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-300">{item.email}</p>
                  <p className="mt-1 text-sm">
                    <strong>{item.planName}</strong> · {brl.format(item.planValue)} · {item.durationDays} dias
                  </p>
                </div>
                <span className="h-fit rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-200">
                  {subscriptionStatusLabels[item.status]}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-300 sm:grid-cols-3">
                <span>Solicitado: {new Date(item.requestedAt).toLocaleString("pt-BR")}</span>
                <span>Confirmado: {item.confirmedAt ? new Date(item.confirmedAt).toLocaleDateString("pt-BR") : "-"}</span>
                <span>Ativado: {item.activatedAt ? new Date(item.activatedAt).toLocaleDateString("pt-BR") : "-"}</span>
              </div>

              {item.clientNote && (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
                  <strong>Cliente:</strong> {item.clientNote}
                </p>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <AdminField label="Confirmação" type="date" value={draft.confirmationDate} onChange={(value) => updateDraft(item.id, "confirmationDate", value)} />
                <AdminField label="Início" type="date" value={draft.startDate} onChange={(value) => updateDraft(item.id, "startDate", value)} />
                <AdminField label="Vencimento" type="date" value={draft.expiryDate} onChange={(value) => updateDraft(item.id, "expiryDate", value)} />
                <AdminField label="Transação" value={draft.transactionId} onChange={(value) => updateDraft(item.id, "transactionId", value)} />
                <AdminField label="Observação" value={draft.note} onChange={(value) => updateDraft(item.id, "note", value)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Action icon={CheckCircle2} label="Confirmar pagamento" disabled={Boolean(working)} onClick={() => void performAction(item, "confirm_payment")} />
                <Action icon={ShieldCheck} label="Ativar assinatura" disabled={Boolean(working) || item.status === "ativo"} onClick={() => void performAction(item, "activate")} />
                <Action icon={XCircle} label="Recusar" disabled={Boolean(working)} onClick={() => void performAction(item, "refuse")} />
                <Action icon={Ban} label="Cancelar" disabled={Boolean(working)} onClick={() => void performAction(item, "cancel")} />
                <Action icon={Clock3} label="Marcar expirada" disabled={Boolean(working)} onClick={() => void performAction(item, "expire")} />
                <Action icon={Save} label="Salvar vencimento" disabled={Boolean(working)} onClick={() => void performAction(item, "edit_expiration")} />
                <Action icon={Save} label="Adicionar observação" disabled={Boolean(working)} onClick={() => void performAction(item, "add_note")} />
              </div>
            </article>
          );
        })}
        {visible.length === 0 && (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-300">
            Nenhuma solicitação neste filtro.
          </p>
        )}
      </div>
    </section>
  );
}

function AdminField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-xs font-bold text-slate-500 dark:text-slate-300">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
      />
    </label>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-800 hover:bg-cyan-500 hover:text-white disabled:opacity-50 dark:bg-white/10 dark:text-white"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}