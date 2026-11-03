"use client";

import { useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { adjustStockAction } from "../_actions/products";
import { toast } from "@/components/store/toaster";
import { cn } from "@/lib/utils";

export function StockAdjuster({ id, stock }: { id: string; stock: number }) {
  const [pending, start] = useTransition();
  const run = (delta: number) =>
    start(async () => {
      const res = await adjustStockAction(id, delta);
      if (res.error) toast(res.error, "error");
    });
  return (
    <div className={cn("inline-flex items-center gap-1", pending && "opacity-50")}>
      <button onClick={() => run(-1)} disabled={pending || stock === 0} className="rounded p-1 text-subtle hover:bg-white/5 hover:text-fg disabled:opacity-30" aria-label="Remover 1 do estoque">
        <Minus className="h-3 w-3" />
      </button>
      <span className={cn("w-10 text-center tabular-nums", stock === 0 ? "text-danger" : stock <= 5 ? "text-warning" : "")}>{stock}</span>
      <button onClick={() => run(1)} disabled={pending} className="rounded p-1 text-subtle hover:bg-white/5 hover:text-fg" aria-label="Adicionar 1 ao estoque">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
