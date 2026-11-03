import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { changeOrderStatus, markOrderPaid } from "@/lib/orders";

/**
 * Endpoint de notificações dos provedores de pagamento.
 * Cada provedor valida a assinatura em `parseWebhook`; eventos não assinados são rejeitados.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await params;
  let provider;
  try {
    provider = getPaymentProvider(providerId);
  } catch {
    return NextResponse.json({ error: "Provedor desconhecido." }, { status: 404 });
  }

  const event = await provider.parseWebhook(request).catch(() => null);
  if (!event) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });

  const payment = await prisma.payment.findUnique({ where: { providerRef: event.providerRef } });
  if (!payment) return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });

  if (event.status === "PAID") await markOrderPaid(payment.orderId, `webhook:${providerId}`);
  if (event.status === "FAILED") await changeOrderStatus(payment.orderId, "CANCELLED", `webhook:${providerId}`, "Pagamento recusado pelo provedor.");
  if (event.status === "REFUNDED") await changeOrderStatus(payment.orderId, "REFUNDED", `webhook:${providerId}`, "Reembolso confirmado pelo provedor.");

  return NextResponse.json({ received: true });
}
