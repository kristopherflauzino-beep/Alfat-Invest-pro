"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function AuthPageShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const stored = window.localStorage.getItem("alfatec-theme");
    setDark(stored ? stored === "dark" : true);
  }, []);
  function toggle() {
    setDark((current) => {
      window.localStorage.setItem("alfatec-theme", current ? "light" : "dark");
      return !current;
    });
  }
  return <main className={dark ? "dark min-h-screen bg-[#020817] text-slate-100" : "min-h-screen bg-slate-100 text-slate-950"}><div className="grid min-h-screen place-items-center px-4 py-8"><section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-950 sm:p-8"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><img src="/logo-alfatec.png" alt="AlfaTec Invest Pro" className="h-16 w-16 object-contain" /><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-500">{eyebrow}</p><h1 className="text-2xl font-black">{title}</h1></div></div><button type="button" onClick={toggle} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button></div><p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p><div className="mt-6">{children}</div></section></div></main>;
}