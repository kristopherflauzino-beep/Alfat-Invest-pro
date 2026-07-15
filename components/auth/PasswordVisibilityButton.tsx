"use client";

import { Eye, EyeOff } from "lucide-react";

export function PasswordVisibilityButton({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-cyan-500" aria-label={visible ? "Ocultar senha" : "Mostrar senha"}>{visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>;
}