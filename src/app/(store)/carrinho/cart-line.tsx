"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { updateCartItemAction } from "@/app/actions/store";
import { ProductImage } from "@/components/store/product-image";
import { toast } from "@/components/store/toaster";
import { formatMoney } from "@/lib/format";
import type { CartSummary } from "@/lib/cart";
import { cn } from "@/lib/utils";

export function CartLine({ line }: { line: CartSummary["lines"][number] }) {
  const [pending, start] = useTransition();
  const update = (qty: number) =>
    start(async () => {
      const res = await updateCartItemAction(line.id, qty);
      if (!res.ok) toast(res.error ?? "Erro ao atualizar.", "error");
      else if (qty === 0) toast("Item removido do carrinho.");
    });

  return (
    <div className={cn("card flex gap-4 p-4 transition-opacity", pending && "opacity-60")}>
      <Link href={`/produto/${line.slug}`} className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:h-24 sm:w-32">
        <ProductImage src={line.image} alt={line.name} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/produto/${line.slug}`} className="line-clamp-2 font-medium hover:underline">{line.name}</Link>
            {line.platform && <p className="mt-0.5 text-xs text-subtle">{line.platform}</p>}
          </div>
          <button onClick={() => update(0)} disabled={pending} className="shrink-0 rounded-md p-1.5 text-subtle transition-colors hover:bg-white/5 hover:text-danger" aria-label="Remover item">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {!line.available && (
          <p className="mt-1 text-xs text-warning">
            {!line.active || line.stock === 0 ? "Produto indisponível — remova para continuar." : `Apenas ${line.stock} disponível(is).`}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="flex h-9 items-center rounded-lg border border-line bg-surface-2">
            <button onClick={() => update(line.quantity - 1)} disabled={pending} className="flex h-full w-9 items-center justify-center text-muted hover:text-fg" aria-label="Diminuir">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-sm tabular-nums">{pending ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : line.quantity}</span>
            <button onClick={() => update(line.quantity + 1)} disabled={pending || line.quantity >= Math.min(10, line.stock)} className="flex h-full w-9 items-center justify-center text-muted hover:text-fg disabled:opacity-40" aria-label="Aumentar">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-right">
            {line.originalUnitCents !== line.unitCents && (
              <p className="text-xs text-subtle line-through">{formatMoney(line.originalUnitCents * line.quantity)}</p>
            )}
            <p className="font-display font-semibold">{formatMoney(line.totalCents)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
