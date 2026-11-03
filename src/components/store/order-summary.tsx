import type { ReactNode } from "react";
import type { CartSummary } from "@/lib/cart";
import { formatMoney } from "@/lib/format";

export function OrderSummary({ summary, children, title = "Resumo do pedido" }: { summary: CartSummary; children?: ReactNode; title?: string }) {
  return (
    <div className="card p-5">
      <h2 className="heading-md mb-4">{title}</h2>
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal ({summary.itemCount} {summary.itemCount === 1 ? "item" : "itens"})</dt>
          <dd>{formatMoney(summary.subtotalCents)}</dd>
        </div>
        {summary.discountCents > 0 && (
          <div className="flex justify-between text-success">
            <dt>Desconto {summary.couponCode && `(${summary.couponCode})`}</dt>
            <dd>−{formatMoney(summary.discountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">Entrega</dt>
          <dd className="text-success">Digital · grátis</dd>
        </div>
      </dl>
      {children && <div className="mt-4">{children}</div>}
      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
        <span className="font-medium">Total</span>
        <span className="font-display text-2xl font-bold">{formatMoney(summary.totalCents)}</span>
      </div>
    </div>
  );
}
