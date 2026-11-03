import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDateTime, formatMoney, formatOrderNumber } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/payments";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/confirm-button";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/status-badges";
import { confirmPaymentAction } from "../../_actions/orders";
import { StatusForm } from "./status-form";

export const metadata = { title: "Detalhes do pedido" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("orders");
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      items: { include: { product: { select: { id: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      history: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();
  const closed = order.status === "CANCELLED" || order.status === "REFUNDED";

  return (
    <div>
      <AdminHeader
        title={`Pedido ${formatOrderNumber(order.number)}`}
        description={`Criado em ${formatDateTime(order.createdAt)}${order.paidAt ? ` · pago em ${formatDateTime(order.paidAt)}` : ""}`}
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
        actions={
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="Itens do pedido" bodyClassName="p-0">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-5 py-3">
                      {i.product ? <Link href={`/admin/produtos/${i.product.id}`} className="font-medium hover:underline">{i.productName}</Link> : <span className="font-medium">{i.productName}</span>}
                      {!i.product && <span className="ml-2 text-xs text-subtle">(produto removido)</span>}
                    </td>
                    <td className="px-5 py-3 text-muted tabular-nums">{i.quantity} × {formatMoney(i.unitPriceCents)}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{formatMoney(i.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(order.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Desconto {order.couponCode && `(${order.couponCode})`}</dt><dd className="tabular-nums">−{formatMoney(order.discountCents)}</dd></div>
              <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(order.totalCents)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Pagamentos" bodyClassName="p-0">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-subtle"><th className="px-5 py-2.5 font-medium">Data</th><th className="px-5 py-2.5 font-medium">Provedor</th><th className="px-5 py-2.5 font-medium">Método</th><th className="px-5 py-2.5 font-medium">Referência</th><th className="px-5 py-2.5 font-medium">Status</th><th className="px-5 py-2.5 text-right font-medium">Valor</th></tr></thead>
              <tbody className="divide-y divide-line border-t border-line">
                {order.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 text-muted">{formatDateTime(p.createdAt)}</td>
                    <td className="px-5 py-3">{p.provider}</td>
                    <td className="px-5 py-3">{PAYMENT_METHOD_LABEL[p.method]}</td>
                    <td className="px-5 py-3 font-mono text-xs text-subtle">{p.providerRef ?? "—"}</td>
                    <td className="px-5 py-3">{PAYMENT_STATUS_LABEL[p.status]}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatMoney(p.amountCents)}</td>
                  </tr>
                ))}
                {order.payments.length === 0 && <tr><td colSpan={6} className="px-5 py-6 text-center text-subtle">Nenhum pagamento registrado.</td></tr>}
              </tbody>
            </table>
          </Panel>

          <Panel title="Histórico de status">
            <ol className="space-y-4">
              {order.history.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fg" />
                  <div>
                    <p className="font-medium">{ORDER_STATUS_LABEL[h.status]}</p>
                    {h.note && <p className="text-muted">{h.note}</p>}
                    <p className="text-xs text-subtle">{formatDateTime(h.createdAt)}{h.createdBy && ` · por ${h.createdBy}`}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Cliente">
            <p className="font-medium">{order.customerName}</p>
            <p className="text-sm text-muted">{order.customerEmail}</p>
            {order.user.phone && <p className="text-sm text-muted">{order.user.phone}</p>}
            <Link href={`/admin/clientes/${order.user.id}`} className="mt-3 inline-block text-sm underline underline-offset-4">Ver histórico do cliente</Link>
            {order.notes && (
              <div className="mt-4 rounded-lg bg-surface-2 p-3 text-sm">
                <p className="mb-1 text-xs text-subtle">Observações do cliente</p>
                {order.notes}
              </div>
            )}
          </Panel>
          <Panel title="Pagamento">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Método</dt><dd>{PAYMENT_METHOD_LABEL[order.paymentMethod]}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Status</dt><dd>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</dd></div>
            </dl>
            {order.paymentStatus === "PENDING" && !closed && (
              <ActionButton
                action={confirmPaymentAction.bind(null, order.id)}
                confirm="Confirmar o recebimento do pagamento? O pedido será concluído e liberado ao cliente."
                variant="primary"
                size="md"
                className="mt-4 w-full"
              >
                Confirmar pagamento
              </ActionButton>
            )}
          </Panel>
          {!closed && (
            <Panel title="Atualizar status">
              <StatusForm orderId={order.id} current={order.status} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
