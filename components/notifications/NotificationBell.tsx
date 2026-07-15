"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function NotificationBell({ onOpen }: { onOpen: () => void }) {
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const body = await response.json().catch(() => ({}));
    setUnread(Number(body.unreadCount || 0));
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    const handler = () => void refresh();
    window.addEventListener("alfatec:notifications-updated", handler);
    return () => { window.clearInterval(interval); window.removeEventListener("alfatec:notifications-updated", handler); };
  }, [refresh]);

  return <button type="button" onClick={onOpen} title="Notificações" aria-label={unread ? `${unread} notificações não lidas` : "Notificações"} className="relative grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-cyan-400 hover:text-cyan-600 dark:border-white/10 dark:bg-white/5 dark:text-white">
    <Bell className="h-5 w-5" />
    {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}
  </button>;
}