"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({ className, onDone }: { className?: string; onDone?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim().slice(0, 80);
    router.push(term ? `/produtos?q=${encodeURIComponent(term)}` : "/produtos");
    onDone?.();
  };

  return (
    <form onSubmit={submit} role="search" className={cn("relative w-full max-w-xl", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar produtos, serviços, categorias..."
        aria-label="Buscar produtos"
        maxLength={80}
        className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pr-4 pl-10 text-sm text-fg placeholder:text-subtle transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] focus:border-white/25 focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.04)] focus:outline-none"
      />
    </form>
  );
}
