"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AddToCartButton } from "@/components/store/add-to-cart-button";

const MAX = 10;

export function PurchaseBox({ productId, stock }: { productId: string; stock: number }) {
  const [qty, setQty] = useState(1);
  const limit = Math.min(stock, MAX);
  return (
    <div className="flex gap-3">
      <div className="flex h-12 items-center rounded-lg border border-line bg-surface-2">
        <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || stock === 0} className="flex h-full w-10 items-center justify-center text-muted hover:text-fg disabled:opacity-40" aria-label="Diminuir quantidade">
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">{qty}</span>
        <button onClick={() => setQty((q) => Math.min(limit, q + 1))} disabled={qty >= limit} className="flex h-full w-10 items-center justify-center text-muted hover:text-fg disabled:opacity-40" aria-label="Aumentar quantidade">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1">
        <AddToCartButton productId={productId} quantity={qty} disabled={stock === 0} />
      </div>
    </div>
  );
}
