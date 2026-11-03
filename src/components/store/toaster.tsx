"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastItem = { id: number; message: string; tone: "success" | "error"; action?: { label: string; href: string } };
type Listener = (t: ToastItem) => void;

const listeners = new Set<Listener>();
let counter = 0;

/** Exibe uma notificação curta. Pode ser chamada de qualquer componente cliente. */
export function toast(message: string, tone: ToastItem["tone"] = "success", action?: ToastItem["action"]) {
  const item = { id: ++counter, message, tone, action };
  listeners.forEach((l) => l(item));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      setItems((prev) => [...prev.slice(-2), t]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== t.id)), 4000);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 left-4 z-[100] flex flex-col items-end gap-2 sm:left-auto" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm animate-fade-up items-center gap-3 rounded-xl border bg-surface-2/95 px-4 py-3 text-sm shadow-2xl backdrop-blur",
            t.tone === "success" ? "border-line-strong" : "border-danger/30",
          )}
        >
          {t.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <AlertCircle className="h-4 w-4 shrink-0 text-danger" />}
          <span className="flex-1 text-fg">{t.message}</span>
          {t.action && (
            <Link href={t.action.href} className="shrink-0 text-xs font-semibold underline underline-offset-4">
              {t.action.label}
            </Link>
          )}
          <button onClick={() => setItems((p) => p.filter((i) => i.id !== t.id))} aria-label="Fechar" className="text-subtle hover:text-fg">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
