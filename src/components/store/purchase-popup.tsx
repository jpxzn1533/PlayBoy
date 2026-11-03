"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, X } from "lucide-react";
import { ProductImage } from "./product-image";
import { relativeTime } from "@/lib/format";

type Purchase = { id: string; buyer: string; product: string; slug: string | null; image: string | null; paidAt: string };

const LAST_KEY = "pb_popup_last";
const SEEN_KEY = "pb_popup_seen";
const FIRST_DELAY_MS = 15_000;
const VISIBLE_MS = 8_000;

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // armazenamento indisponível: o aviso apenas volta a aparecer
  }
};

/**
 * Aviso discreto de compras recentes no canto da tela. Usa somente pedidos pagos reais
 * (via /api/recent-purchases) e respeita o intervalo configurado no painel, mesmo entre
 * navegações e recarregamentos (o horário do último aviso fica no navegador).
 */
export function PurchasePopup() {
  const [current, setCurrent] = useState<Purchase | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let cancelled = false;
    let tick: ReturnType<typeof setInterval> | undefined;

    const showNext = async () => {
      const res = await fetch("/api/recent-purchases").catch(() => null);
      if (!res?.ok || cancelled) return;
      const data = (await res.json()) as { enabled: boolean; intervalMinutes: number; purchases: Purchase[] };
      if (!data.enabled || data.purchases.length === 0) return;

      const intervalMs = data.intervalMinutes * 60_000;
      const last = Number(read(LAST_KEY) ?? 0);
      if (Date.now() - last < intervalMs) return;

      const seen = new Set<string>(JSON.parse(read(SEEN_KEY) ?? "[]") as string[]);
      const next = data.purchases.find((p) => !seen.has(p.id));
      if (!next) return; // nada novo para mostrar: não repete compras já exibidas

      seen.add(next.id);
      write(SEEN_KEY, JSON.stringify([...seen].slice(-50)));
      write(LAST_KEY, String(Date.now()));
      setCurrent(next);
      setVisible(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), VISIBLE_MS);
    };

    const start = setTimeout(() => {
      void showNext();
      tick = setInterval(() => void showNext(), 60_000);
    }, FIRST_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(start);
      clearInterval(tick);
      clearTimeout(hideTimer.current);
    };
  }, []);

  if (!current) return null;

  const body = (
    <>
      <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-3">
        <ProductImage src={current.image} alt="" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted">
          <span className="font-medium text-fg">{current.buyer}</span> comprou
        </p>
        <p className="truncate text-sm font-medium">{current.product}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-subtle">
          <BadgeCheck className="h-3 w-3 text-success" /> Compra verificada · {relativeTime(current.paidAt)}
        </p>
      </div>
    </>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-4 z-[90] w-[calc(100%-2rem)] max-w-xs transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="relative flex items-center gap-3 rounded-xl border border-line-strong bg-surface-2/95 p-3 pr-8 shadow-2xl backdrop-blur">
        {current.slug ? (
          <Link href={`/produto/${current.slug}`} className="flex min-w-0 flex-1 items-center gap-3" onClick={() => setVisible(false)}>
            {body}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
        )}
        <button onClick={() => setVisible(false)} className="absolute top-2 right-2 text-subtle hover:text-fg" aria-label="Fechar aviso">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
