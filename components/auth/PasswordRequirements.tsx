"use client";

import { CheckCircle2, Circle } from "lucide-react";

export function PasswordRequirements({ password, confirmation }: { password: string; confirmation?: string }) {
  const checks = [
    { label: "Mínimo de 12 caracteres", valid: password.length >= 12 },
    { label: "Letras", valid: /[A-Za-z]/.test(password) },
    { label: "Número", valid: /\d/.test(password) },
    { label: "Caractere especial", valid: /[^A-Za-z0-9]/.test(password) },
    ...(confirmation !== undefined ? [{ label: "As senhas coincidem", valid: Boolean(password) && password === confirmation }] : [])
  ];
  return <div className="grid gap-2 text-sm">{checks.map((item) => <div key={item.label} className={item.valid ? "flex items-center gap-2 text-emerald-600 dark:text-emerald-300" : "flex items-center gap-2 text-slate-500 dark:text-slate-400"}>{item.valid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}<span>{item.label}</span></div>)}</div>;
}