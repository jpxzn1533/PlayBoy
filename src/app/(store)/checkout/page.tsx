import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUserPage } from "@/lib/auth/guards";
import { getCartSummary } from "@/lib/cart";
import { getPaymentProvider } from "@/lib/payments";
import { formatMoney } from "@/lib/format";
import { OrderSummary } from "@/components/store/order-summary";
import { ProductImage } from "@/components/store/product-image";
import { CheckoutForm } from "./checkout-form";
import { VerifyEmailNotice } from "@/components/store/verify-email-notice";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUserPage("/checkout");
  const summary = await getCartSummary();
  if (summary.lines.length === 0) redirect("/carrinho");
  if (summary.hasIssues) redirect("/carrinho");
  const provider = getPaymentProvider();

  return (
    <div className="container-pb pt-12">
      <p className="eyebrow mb-2">PLAYBOY STORE · Pagamento seguro</p>
      <h1 className="heading-lg mb-8">Finalizar compra</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {!user.emailVerifiedAt && <VerifyEmailNotice email={user.email} />}
          <section className="card p-6">
            <h2 className="heading-md mb-4">Seus dados</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-subtle">Nome</dt><dd className="mt-0.5">{user.name}</dd></div>
              <div><dt className="text-xs text-subtle">E-mail de entrega</dt><dd className="mt-0.5">{user.email}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-subtle">Os produtos digitais ficam disponíveis na sua conta e são enviados para este e-mail.</p>
          </section>
          <CheckoutForm disabled={!user.emailVerifiedAt} sandbox={provider.isSandbox} manual={provider.id === "manual"} methods={provider.methods} requireDocument={provider.requiresCustomerDocument} defaultDocument={user.document} defaultPhone={user.phone} totalLabel={formatMoney(summary.totalCents)} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <div className="card divide-y divide-line">
            {summary.lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-4">
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-surface-2"><ProductImage src={l.image} alt="" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{l.name}</p>
                  <p className="text-xs text-subtle">Qtd. {l.quantity}</p>
                </div>
                <p className="text-sm font-medium">{formatMoney(l.totalCents)}</p>
              </div>
            ))}
          </div>
          <OrderSummary summary={summary} />
        </aside>
      </div>
    </div>
  );
}
