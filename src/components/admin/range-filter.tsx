"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/ui/form";

const PRESETS = [
  ["today", "Hoje"],
  ["7d", "7 dias"],
  ["30d", "30 dias"],
  ["90d", "90 dias"],
  ["custom", "Personalizado"],
] as const;

export function RangeFilter({ current, from, to, basePath = "/admin" }: { current: string; from: string; to: string; basePath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState(current);
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-line bg-surface p-0.5" role="tablist" aria-label="Período">
        {PRESETS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            onClick={() => {
              setMode(key);
              if (key !== "custom") router.push(`${basePath}?range=${key}`);
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === key ? "bg-white/10 text-fg" : "text-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "custom" && (
        <form
          className="flex animate-fade-in items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`${basePath}?range=custom&from=${f}&to=${t}`);
          }}
        >
          <input type="date" value={f} max={t} onChange={(e) => setF(e.target.value)} className={cn(inputClass, "h-9 w-auto py-1")} aria-label="Data inicial" required />
          <span className="text-subtle">–</span>
          <input type="date" value={t} min={f} onChange={(e) => setT(e.target.value)} className={cn(inputClass, "h-9 w-auto py-1")} aria-label="Data final" required />
          <button className="h-9 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg">Aplicar</button>
        </form>
      )}
    </div>
  );
}
