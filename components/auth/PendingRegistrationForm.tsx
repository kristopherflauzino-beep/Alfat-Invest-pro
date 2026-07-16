"use client";

import { Check, Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

export type PublicRegistrationPayload = {
  name: string;
  username: string;
  email: string;
  confirmEmail: string;
  phone: string;
  password: string;
  confirmPassword: string;
  planId: string;
  acceptTerms: true;
  acceptPrivacy: true;
  acceptMarketing: boolean;
};

type Plan = { id: string; name: string; value: number; durationDays: number; status: string; permissions: string[] };
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const stages = ["Dados", "Plano", "E-mail", "Pagamento", "Ativação"];

export function PendingRegistrationForm({
  plans,
  message,
  databaseError,
  onRegister
}: {
  plans: Plan[];
  message: string;
  databaseError: string;
  onRegister: (payload: PublicRegistrationPayload) => Promise<void>;
}) {
  const activePlans = useMemo(() => plans.filter((plan) => plan.status === "ativo"), [plans]);
  const [planId, setPlanId] = useState(activePlans[0]?.id || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const requirements = [
    { label: "Mínimo de 12 caracteres", valid: password.length >= 12 },
    { label: "Letra", valid: /[A-Za-z]/.test(password) },
    { label: "Número", valid: /\d/.test(password) },
    { label: "Caractere especial", valid: /[^A-Za-z0-9]/.test(password) }
  ];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    setRegistrationEmail(email);
    setLoading(true);
    try {
      await onRegister({
        name: String(form.get("name") || ""),
        username: String(form.get("username") || ""),
        email,
        confirmEmail: String(form.get("confirmEmail") || ""),
        phone: String(form.get("phone") || ""),
        password,
        confirmPassword,
        planId,
        acceptTerms: true,
        acceptPrivacy: true,
        acceptMarketing: form.get("acceptMarketing") === "on"
      });
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    if (!registrationEmail || resending) return;
    setResending(true);
    setResendMessage("");
    try {
      const response = await fetch("/api/auth/email-verification/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registrationEmail })
      });
      const body = await response.json().catch(() => ({}));
      setResendMessage(body.message || "Se existir um cadastro pendente, enviaremos uma nova confirmação.");
    } catch {
      setResendMessage("Não foi possível solicitar o reenvio agora.");
    } finally {
      setResending(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <ol className="grid grid-cols-5 gap-1" aria-label="Etapas do cadastro">
        {stages.map((stage, index) => (
          <li key={stage} className={"min-w-0 rounded-xl px-0.5 py-2 text-center text-[9px] font-black sm:px-1 sm:text-xs " + (index < 2 ? "bg-cyan-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300")}>
            <span className="block">{index + 1}</span>
            <span className="block break-words">{stage}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="name" label="Nome completo" placeholder="Seu nome completo" autoComplete="name" required />
        <Field name="username" label="Nome de usuário" placeholder="seu.usuario" autoComplete="username" required />
        <Field name="email" type="email" label="E-mail" placeholder="voce@email.com" autoComplete="email" required />
        <Field name="confirmEmail" type="email" label="Confirmar e-mail" placeholder="Repita seu e-mail" autoComplete="email" required />
        <Field name="phone" label="Telefone (opcional)" placeholder="(00) 00000-0000" autoComplete="tel" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PasswordField label="Senha" value={password} setValue={setPassword} show={showPassword} setShow={setShowPassword} />
        <PasswordField label="Confirmar senha" value={confirmPassword} setValue={setConfirmPassword} show={showPassword} setShow={setShowPassword} />
      </div>
      <div className="grid gap-1 rounded-2xl bg-slate-100 p-3 text-xs dark:bg-white/5 sm:grid-cols-2">
        {requirements.map((item) => (
          <span key={item.label} className={"flex items-center gap-2 " + (item.valid ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-300")}>
            <span className="grid h-4 w-4 place-items-center rounded-full border" aria-hidden="true">{item.valid && <Check className="h-3 w-3" />}</span>
            {item.label}
          </span>
        ))}
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Escolha do plano</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {activePlans.map((plan, index) => (
            <label key={plan.id} className={"min-w-0 cursor-pointer rounded-2xl border p-3 " + (planId === plan.id ? "border-cyan-500 bg-cyan-500/10" : "border-slate-200 dark:border-white/10")}>
              <input className="sr-only" type="radio" name="planId" value={plan.id} checked={planId === plan.id} onChange={() => setPlanId(plan.id)} />
              <span className="block font-black">{plan.name}</span>
              <span className="mt-1 block text-lg font-black">{brl.format(plan.value)}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-300">{plan.durationDays} dias</span>
              {index === 1 && <span className="mt-2 inline-block rounded-full bg-cyan-500 px-2 py-1 text-[10px] font-black text-white">Mais escolhido</span>}
              {index === activePlans.length - 1 && <span className="mt-2 inline-block rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-black text-white">Melhor custo-benefício</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-xs"><input name="acceptTerms" type="checkbox" required className="mt-0.5 h-4 w-4" /><span>Aceito os Termos de Uso.</span></label>
      <label className="flex items-start gap-3 text-xs"><input name="acceptPrivacy" type="checkbox" required className="mt-0.5 h-4 w-4" /><span>Aceito a Política de Privacidade.</span></label>
      <label className="flex items-start gap-3 text-xs"><input name="acceptMarketing" type="checkbox" className="mt-0.5 h-4 w-4" /><span>Quero receber comunicações e novidades (opcional).</span></label>

      <div className="rounded-2xl bg-blue-500/10 p-3 text-xs leading-5 text-blue-800 dark:text-blue-200">
        <ShieldCheck className="mr-2 inline h-4 w-4" />
        Primeiro enviaremos a confirmação do e-mail. A conta só será criada após a conferência manual do pagamento pelo administrador.
      </div>
      {message && <div className="rounded-2xl bg-cyan-500/10 p-4 text-sm font-semibold text-cyan-800 dark:text-cyan-200"><MailCheck className="mr-2 inline h-5 w-5" />{message}</div>}
      {message && registrationEmail && <button type="button" onClick={() => void resendConfirmation()} disabled={resending} className="min-h-11 rounded-xl border border-cyan-500 px-4 text-sm font-black text-cyan-700 disabled:opacity-50 dark:text-cyan-200">{resending ? "Reenviando..." : "Reenviar confirmação"}</button>}
      {resendMessage && <p className="rounded-xl bg-slate-100 p-3 text-xs font-semibold text-slate-700 dark:bg-white/5 dark:text-slate-200">{resendMessage}</p>}
      {databaseError && <div className="rounded-2xl bg-amber-500/10 p-4 text-sm font-semibold text-amber-800 dark:text-amber-200">{databaseError}</div>}
      <button disabled={loading || Boolean(databaseError) || activePlans.length === 0} className="min-h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 font-black text-white disabled:opacity-50">
        {loading ? "Criando cadastro provisório..." : "Continuar e confirmar e-mail"}
      </button>
    </form>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="text-xs font-bold text-slate-500 dark:text-slate-300">{label}<input {...props} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white" /></label>;
}

function PasswordField({ label, value, setValue, show, setShow }: { label: string; value: string; setValue: (value: string) => void; show: boolean; setShow: (value: boolean) => void }) {
  return <label className="text-xs font-bold text-slate-500 dark:text-slate-300">{label}<span className="relative mt-1 block"><input type={show ? "text" : "password"} value={value} onChange={(event) => setValue(event.target.value)} minLength={12} maxLength={256} required autoComplete="new-password" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-12 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white" /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>;
}
