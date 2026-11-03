import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getCartSummary } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { CartLine } from "./cart-line";
import { OrderSummary } from "@/components/store/order-summary";
import { CouponForm } from "./coupon-form";

export const metadata: Metadata = { title: "Carrinho" };

export default async function CartPage() {
  const [summary, user] = await Promise.all([getCartSummary(), getCurrentUser()]);

  if (summary.lines.length === 0)
    return (
      <div className="container-pb pt-12">
        <h1 className="heading-lg mb-8">Carrinho</h1>
        <EmptyState
          icon={<ShoppingBag className="h-5 w-5" />}
          title="Seu carrinho está vazio"
          description="Explore o catálogo da PLAYBOY STORE e adicione seus produtos favoritos."
          action={<LinkButton href="/produtos">Explorar produtos</LinkButton>}
        />
      </div>
    );

  return (
    <div className="container-pb pt-12">
      <h1 className="heading-lg mb-8">
        Carrinho <span className="text-muted">({summary.itemCount})</span>
      </h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {summary.lines.map((line) => (
            <CartLine key={line.id} line={line} />
          ))}
          <Link href="/produtos" className="inline-block pt-2 text-sm text-muted hover:text-fg">← Continuar comprando</Link>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <OrderSummary summary={summary}>
            <CouponForm applied={summary.couponCode} error={summary.couponError} />
          </OrderSummary>
          {summary.hasIssues ? (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              Alguns itens estão indisponíveis na quantidade escolhida. Ajuste o carrinho para continuar.
            </p>
          ) : (
            <LinkButton href={user ? "/checkout" : "/entrar?next=/checkout"} size="lg" className="w-full">
              {user ? "Finalizar compra" : "Entrar para finalizar"}
            </LinkButton>
          )}
        </aside>
      </div>
    </div>
  );
}
