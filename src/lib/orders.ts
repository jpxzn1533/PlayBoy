import "server-only";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "./db";
import { formatMoney, formatOrderNumber } from "./format";
import { emailLayout, escapeHtml, sendEmail, absoluteUrl } from "./mail";
import { getSettings } from "./settings";
import type { CartSummary } from "./cart";
import { getPaymentProvider } from "./payments";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Aguardando pagamento",
  PROCESSING: "Em processamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  FAILED: "Recusado",
  REFUNDED: "Reembolsado",
};

export class OrderError extends Error {}

/** Cria o pedido a partir do carrinho em uma transação: reserva estoque, aplica cupom e registra o pagamento. */
export async function createOrderFromCart(params: {
  user: { id: string; name: string; email: string };
  summary: CartSummary;
  paymentMethod: PaymentMethod;
  notes: string | null;
}) {
  const { user, summary, paymentMethod, notes } = params;
  if (!summary.cartId || summary.lines.length === 0) throw new OrderError("Seu carrinho está vazio.");
  if (summary.hasIssues) throw new OrderError("Alguns itens do carrinho estão indisponíveis. Revise o carrinho.");
  if (summary.couponError) throw new OrderError(summary.couponError);

  const provider = getPaymentProvider();

  const order = await prisma.$transaction(async (tx) => {
    for (const line of summary.lines) {
      // Decremento condicional: falha se outro pedido consumiu o estoque nesse meio tempo.
      const reserved = await tx.product.updateMany({
        where: { id: line.productId, active: true, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (reserved.count !== 1) throw new OrderError(`Estoque insuficiente para "${line.name}".`);
    }
    if (summary.couponId) {
      const coupon = await tx.coupon.findUniqueOrThrow({ where: { id: summary.couponId } });
      if (coupon.maxUses !== null) {
        const used = await tx.coupon.updateMany({
          where: { id: coupon.id, usedCount: { lt: coupon.maxUses } },
          data: { usedCount: { increment: 1 } },
        });
        if (used.count !== 1) throw new OrderError("O cupom atingiu o limite de usos.");
      } else {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }
    }
    const created = await tx.order.create({
      data: {
        userId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        paymentMethod,
        subtotalCents: summary.subtotalCents,
        discountCents: summary.discountCents,
        totalCents: summary.totalCents,
        couponId: summary.couponId,
        couponCode: summary.couponId ? summary.couponCode : null,
        notes,
        items: {
          create: summary.lines.map((l) => ({
            productId: l.productId,
            productName: l.name,
            unitPriceCents: l.unitCents,
            quantity: l.quantity,
            totalCents: l.totalCents,
          })),
        },
        history: { create: { status: "PENDING", note: "Pedido criado pelo cliente." } },
      },
    });
    await tx.cartItem.deleteMany({ where: { cartId: summary.cartId! } });
    await tx.cart.update({ where: { id: summary.cartId! }, data: { couponCode: null } });
    return created;
  });

  const charge = await provider.createCharge({
    orderId: order.id,
    orderNumber: order.number,
    amountCents: order.totalCents,
    method: paymentMethod,
    customer: { name: user.name, email: user.email },
  });
  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: provider.id,
      method: paymentMethod,
      amountCents: order.totalCents,
      providerRef: charge.providerRef,
      instructions: charge.instructions,
    },
  });

  void notifyNewOrder(order.id);
  return order;
}

/** Confirma o pagamento: pedido concluído (entrega digital), contadores de venda atualizados. */
export async function markOrderPaid(orderId: string, actor: string | null, note = "Pagamento confirmado.") {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new OrderError("Pedido não encontrado.");
  if (order.paymentStatus === "PAID") return order;
  if (order.status === "CANCELLED" || order.status === "REFUNDED")
    throw new OrderError("Não é possível confirmar o pagamento de um pedido cancelado.");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "PAID" } });
    for (const item of order.items) {
      if (item.productId)
        await tx.product.update({ where: { id: item.productId }, data: { salesCount: { increment: item.quantity } } });
    }
    await tx.orderStatusHistory.create({ data: { orderId, status: "COMPLETED", note, createdBy: actor } });
    return tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PAID", status: "COMPLETED", paidAt: new Date() },
    });
  });

  await sendEmail(
    order.customerEmail,
    `Pagamento aprovado — pedido ${formatOrderNumber(order.number)}`,
    emailLayout(
      "Pagamento aprovado!",
      `<p>Olá, ${escapeHtml(order.customerName)}. Recebemos o pagamento do pedido <strong>${formatOrderNumber(order.number)}</strong> no valor de <strong>${formatMoney(order.totalCents)}</strong>.</p>
       <p>Seus produtos digitais já estão disponíveis na sua conta.</p>`,
      { label: "Ver meu pedido", url: absoluteUrl(`/conta/pedidos/${order.number}`) },
    ),
  );
  await checkLowStock(order.items.map((i) => i.productId).filter(Boolean) as string[]);
  return updated;
}

/** Atualiza o status do pedido aplicando efeitos colaterais (estoque, pagamento, contadores). */
export async function changeOrderStatus(orderId: string, status: OrderStatus, actor: string | null, note: string | null) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new OrderError("Pedido não encontrado.");
  if (order.status === status) return order;
  if (order.status === "CANCELLED" || order.status === "REFUNDED")
    throw new OrderError("Pedidos cancelados ou reembolsados não podem ser reabertos.");

  if (status === "COMPLETED" && order.paymentStatus !== "PAID") {
    return markOrderPaid(orderId, actor, note ?? "Pedido concluído manualmente pelo administrador.");
  }

  return prisma.$transaction(async (tx) => {
    const releasing = status === "CANCELLED" || status === "REFUNDED";
    let paymentStatus: PaymentStatus = order.paymentStatus;
    if (releasing) {
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            ...(order.paymentStatus === "PAID" ? { salesCount: { decrement: item.quantity } } : {}),
          },
        });
      }
      if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { decrement: 1 } } });
      paymentStatus = order.paymentStatus === "PAID" ? "REFUNDED" : "FAILED";
      await tx.payment.updateMany({ where: { orderId }, data: { status: paymentStatus } });
    }
    await tx.orderStatusHistory.create({ data: { orderId, status, note, createdBy: actor } });
    return tx.order.update({ where: { id: orderId }, data: { status, paymentStatus } });
  });
}

async function notifyNewOrder(orderId: string) {
  try {
    const settings = await getSettings();
    if (!settings.notifyNewOrder || !settings.notificationEmail) return;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    await sendEmail(
      settings.notificationEmail,
      `Novo pedido ${formatOrderNumber(order.number)} — ${formatMoney(order.totalCents)}`,
      emailLayout(
        "Novo pedido recebido",
        `<p>${escapeHtml(order.customerName)} (${escapeHtml(order.customerEmail)}) realizou o pedido <strong>${formatOrderNumber(order.number)}</strong> no valor de <strong>${formatMoney(order.totalCents)}</strong>.</p>`,
        { label: "Abrir no painel", url: absoluteUrl(`/admin/pedidos/${order.id}`) },
      ),
    );
  } catch (err) {
    console.error("[orders] falha ao notificar novo pedido", err);
  }
}

async function checkLowStock(productIds: string[]) {
  const settings = await getSettings();
  if (!settings.notifyLowStock || !settings.notificationEmail || productIds.length === 0) return;
  const low = await prisma.product.findMany({
    where: { id: { in: productIds }, stock: { lte: settings.lowStockThreshold } },
    select: { name: true, stock: true },
  });
  if (low.length === 0) return;
  await sendEmail(
    settings.notificationEmail,
    "Alerta de estoque baixo",
    emailLayout(
      "Estoque baixo",
      `<ul>${low.map((p) => `<li>${escapeHtml(p.name)}: <strong>${p.stock}</strong> unidade(s)</li>`).join("")}</ul>`,
      { label: "Gerenciar produtos", url: absoluteUrl("/admin/produtos") },
    ),
  );
}
