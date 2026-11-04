import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Download, MessageSquare, PartyPopper } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatDateTime, formatMoney, formatOrderNumber } from "@/lib/format";
import QRCode from "qrcode";
import { getPaymentProvider, getProviderById, PAYMENT_METHOD_LABEL, type PaymentInstructions } from "@/lib/payments";
import { CheckPaymentButton } from "./check-payment-button";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { firstParam } from "@/lib/utils";
import { cancelMyOrderAction, simulatePaymentAction } from "@/app/actions/store";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/status-badges";
import { buttonClass } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

type Props = { params: Promise<{ number: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Pedido ${formatOrderNumber(Number((await params).number) || 0)}` };
}

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { number } = await params;
  const user = await requireUserPage(`/conta/pedidos/${number}`);
  const n = Number(number);
  if (!Number.isInteger(n) || n <= 0) notFound();

  // Filtra pelo dono: um cliente nunca acessa pedidos de outro.
  const order = await prisma.order.findFirst({
    where: { number: n, userId: user.id },
    include: {
      items: { include: { product: { select: { slug: true, deliveryType: true, manualDelivery: true } } } },
      ticket: { select: { number: true } },
      payments: { orderBy: { createdAt: "desc" } },
      history: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();
  const isNew = firstParam((await searchParams).novo) === "1";
  const payment = order.payments[0];
  const instructions = payment?.instructions as PaymentInstructions | null;
  const awaiting = order.paymentStatus === "PENDING" && order.status === "PENDING";
  const sandbox = getPaymentProvider().isSandbox && payment?.provider === "sandbox";
  const canCheck = !!payment?.providerRef && !!getProviderById(payment.provider)?.fetchStatus;
  const qrSvg =
    awaiting && instructions?.kind === "pix"
      ? await QRCode.toString(instructions.copyPaste, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#080808", light: "#ffffff" } }).catch(() => null)
      : null;

  return (
    <div className="space-y-6">
      <Link href="/conta/pedidos" className="text-sm text-muted hover:text-fg">← Voltar aos pedidos</Link>

      {isNew && (
        <div className="flex items-center gap-3 rounded-xl border border-line-strong bg-surface-2 p-4 text-sm">
          <PartyPopper className="h-5 w-5" /> Pedido criado com sucesso! {awaiting && "Conclua o pagamento para liberar seus produtos."}
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-subtle">Pedido</p>
            <p className="font-mono text-xl font-semibold">{formatOrderNumber(order.number)}</p>
            <p className="mt-1 text-xs text-subtle">Realizado em {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>
      </div>

      {awaiting && payment && (
        <section className="card p-6">
          <h2 className="heading-md mb-1">Pagamento · {PAYMENT_METHOD_LABEL[order.paymentMethod]}</h2>
          <p className="mb-4 text-sm text-muted">Valor: <strong className="text-fg">{formatMoney(order.totalCents)}</strong></p>
          {instructions?.kind === "pix" && (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {qrSvg && (
                <div
                  className="mx-auto w-44 shrink-0 overflow-hidden rounded-xl bg-white p-2 sm:mx-0"
                  aria-label="QR Code Pix"
                  role="img"
                  // SVG gerado localmente pela biblioteca qrcode (somente formas, sem texto do usuário).
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm text-muted">Abra o app do seu banco, escolha pagar com Pix e escaneie o QR Code ou use o código copia e cola.</p>
                <p className="text-xs text-subtle">Pix copia e cola</p>
                <div className="flex gap-2">
                  <code className="flex-1 truncate rounded-lg border border-line bg-surface-2 px-3 py-2.5 font-mono text-xs">{instructions.copyPaste}</code>
                  <CopyButton value={instructions.copyPaste} />
                </div>
                {instructions.expiresAt && <p className="text-xs text-subtle">Válido até {formatDateTime(instructions.expiresAt)}.</p>}
              </div>
            </div>
          )}
          {instructions?.kind === "boleto" && (
            <div className="space-y-2">
              <p className="text-xs text-subtle">Linha digitável</p>
              <div className="flex gap-2">
                <code className="flex-1 truncate rounded-lg border border-line bg-surface-2 px-3 py-2.5 font-mono text-xs">{instructions.barcode}</code>
                <CopyButton value={instructions.barcode} />
              </div>
              {instructions.url && /^https:\/\//.test(instructions.url) && (
                <a href={instructions.url} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm", "mt-1")}>
                  Abrir boleto (PDF)
                </a>
              )}
              {instructions.dueDate && <p className="text-xs text-subtle">Vencimento: {formatDateTime(instructions.dueDate)}.</p>}
            </div>
          )}
          {instructions?.kind === "card" && <p className="text-sm text-muted">{instructions.message}</p>}
          {instructions?.kind === "manual-pix" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">{instructions.message}</p>
              {instructions.pixKey && (
                <div className="space-y-1.5">
                  <p className="text-xs text-subtle">Chave Pix{instructions.holder && ` · ${instructions.holder}`}</p>
                  <div className="flex gap-2">
                    <code className="flex-1 truncate rounded-lg border border-line bg-surface-2 px-3 py-2.5 font-mono text-sm">{instructions.pixKey}</code>
                    <CopyButton value={instructions.pixKey} />
                  </div>
                  <p className="text-xs text-subtle">
                    Informe o número do pedido <strong className="text-fg">{formatOrderNumber(order.number)}</strong> na descrição do Pix.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
            {canCheck && <CheckPaymentButton orderId={order.id} />}
            {sandbox && (
              <>
                <form action={simulatePaymentAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="outcome" value="PAID" />
                  <button className={buttonClass("primary")}>Simular pagamento aprovado</button>
                </form>
                <form action={simulatePaymentAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="outcome" value="FAILED" />
                  <button className={buttonClass("outline")}>Simular recusa</button>
                </form>
              </>
            )}
            <form action={cancelMyOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button className={buttonClass("ghost")}>Cancelar pedido</button>
            </form>
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <h2 className="heading-md border-b border-line px-6 py-4">Itens</h2>
        <div className="divide-y divide-line">
          {order.items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                {item.product ? (
                  <Link href={`/produto/${item.product.slug}`} className="font-medium hover:underline">{item.productName}</Link>
                ) : (
                  <p className="font-medium">{item.productName}</p>
                )}
                <p className="text-xs text-subtle">{item.quantity} × {formatMoney(item.unitPriceCents)}</p>
              </div>
              {order.paymentStatus === "PAID" &&
                (item.product?.manualDelivery && order.status !== "COMPLETED" ? (
                  <span className="flex items-center gap-1.5 rounded-md border border-warning/25 bg-warning/10 px-2.5 py-1 text-xs text-warning">
                    <Clock className="h-3.5 w-3.5" /> Entrega manual em andamento
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-md border border-success/25 bg-success/10 px-2.5 py-1 text-xs text-success">
                    <Download className="h-3.5 w-3.5" /> {item.product?.manualDelivery ? "Entregue" : "Acesso liberado"}
                  </span>
                ))}
              <p className="w-24 text-right font-medium">{formatMoney(item.totalCents)}</p>
            </div>
          ))}
        </div>
        <dl className="space-y-2 border-t border-line px-6 py-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(order.subtotalCents)}</dd></div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-success"><dt>Desconto {order.couponCode && `(${order.couponCode})`}</dt><dd>−{formatMoney(order.discountCents)}</dd></div>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(order.totalCents)}</dd></div>
        </dl>
        {order.paymentStatus === "PAID" &&
          (order.ticket ? (
            <div className="flex flex-col gap-3 border-t border-line bg-surface-2 px-6 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
              <p>
                {order.status === "COMPLETED"
                  ? "Entrega concluída. Os dados estão no chat de atendimento."
                  : "A entrega deste pedido é manual e acontece pelo chat de atendimento, em até 24h a 48h."}
              </p>
              <Link href={`/conta/atendimento/${order.ticket.number}`} className={buttonClass("primary", "sm", "shrink-0")}>
                <MessageSquare className="h-3.5 w-3.5" /> Abrir chat da entrega
              </Link>
            </div>
          ) : (
            <p className="border-t border-line bg-surface-2 px-6 py-4 text-sm text-muted">
              Os arquivos e instruções de acesso foram enviados para <strong className="text-fg">{order.customerEmail}</strong>. Para serviços, nossa equipe entrará em contato em até 24h.
            </p>
          ))}
      </section>

      <section className="card p-6">
        <h2 className="heading-md mb-4">Acompanhamento</h2>
        <ol className="space-y-4">
          {order.history.map((h, i) => (
            <li key={h.id} className="flex gap-3">
              <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${i === order.history.length - 1 ? "text-fg" : "text-subtle"}`} />
              <div>
                <p className="text-sm font-medium">{ORDER_STATUS_LABEL[h.status]}</p>
                {h.note && <p className="text-xs text-muted">{h.note}</p>}
                <p className="text-xs text-subtle">{formatDateTime(h.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
