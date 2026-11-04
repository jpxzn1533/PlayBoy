import "server-only";
import type { Prisma, TicketStatus, TicketType } from "@prisma/client";
import { prisma } from "./db";
import { formatOrderNumber } from "./format";
import { absoluteUrl, emailLayout, escapeHtml, sendEmail } from "./mail";
import { getSettings } from "./settings";

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Aguardando equipe",
  WAITING_CUSTOMER: "Respondido",
  CLOSED: "Encerrado",
};

export const TICKET_TYPE_LABEL: Record<TicketType, string> = {
  SUPPORT: "Atendimento",
  DELIVERY: "Entrega de conta",
};

export const formatTicketNumber = (n: number) => `#${String(n).padStart(5, "0")}`;

/** Mensagem automática enviada ao abrir o chat de entrega manual. */
export const DELIVERY_WELCOME_MESSAGE =
  "Olá! Aqui é da equipe de atendimento da PlayBoy Store. Parabéns pela sua compra! A entrega (como foi dita na descrição do produto) é manual, então peço que aguarde a entrega do seu produto. O prazo é de 24h a 48h. E fique tranquilo, a entrega será realizada, assim que possível. Obrigado pela paciência e agradeço por ser mais um de nossos clientes!";

/** Pendências para os contadores do painel. */
export async function getTicketCounts() {
  const [support, delivery] = await Promise.all([
    prisma.ticket.count({ where: { type: "SUPPORT", status: "OPEN" } }),
    prisma.ticket.count({ where: { type: "DELIVERY", status: { not: "CLOSED" } } }),
  ]);
  return { support, delivery };
}

/**
 * Abre (uma única vez) o chat de entrega de um pedido pago que tem produtos com entrega manual,
 * já com a mensagem automática de boas-vindas.
 */
export async function openDeliveryTicket(orderId: string, tx: Prisma.TransactionClient = prisma) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { ticket: true, items: { include: { product: { select: { manualDelivery: true } } } } },
  });
  if (!order || order.ticket) return order?.ticket ?? null;
  const manualItems = order.items.filter((i) => i.product?.manualDelivery);
  if (manualItems.length === 0) return null;

  const subject = `Entrega do pedido ${formatOrderNumber(order.number)} — ${manualItems.map((i) => i.productName).join(", ")}`.slice(0, 160);
  return tx.ticket.create({
    data: {
      type: "DELIVERY",
      status: "OPEN",
      subject,
      userId: order.userId,
      orderId: order.id,
      customerUnread: true,
      messages: { create: { fromStaff: true, system: true, body: DELIVERY_WELCOME_MESSAGE } },
    },
  });
}

/** Avisa a equipe por e-mail sobre ticket novo ou nova mensagem do cliente. */
export async function notifyStaff(ticketId: string, kind: "new" | "message") {
  try {
    const settings = await getSettings();
    if (!settings.notificationEmail) return;
    const t = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { user: { select: { name: true } } } });
    if (!t) return;
    const label = TICKET_TYPE_LABEL[t.type];
    await sendEmail(
      settings.notificationEmail,
      `${kind === "new" ? "Novo ticket" : "Nova mensagem"} ${formatTicketNumber(t.number)} · ${label}`,
      emailLayout(
        kind === "new" ? `Novo ticket de ${label.toLowerCase()}` : "Nova mensagem do cliente",
        `<p><strong>${escapeHtml(t.user.name)}</strong> — ${escapeHtml(t.subject)}</p>`,
        { label: "Responder no painel", url: absoluteUrl(`/admin/atendimento/${t.number}`) },
      ),
    );
  } catch (err) {
    console.error("[tickets] falha ao notificar equipe", err);
  }
}

/** Avisa o cliente por e-mail quando a equipe responde (o conteúdo fica no site). */
export async function notifyCustomer(ticketId: string, delivered = false) {
  try {
    const t = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { user: { select: { name: true, email: true } } } });
    if (!t) return;
    await sendEmail(
      t.user.email,
      delivered ? `Seu pedido foi entregue — ticket ${formatTicketNumber(t.number)}` : `Nova resposta no ticket ${formatTicketNumber(t.number)}`,
      emailLayout(
        delivered ? "Entrega concluída!" : "Você tem uma nova resposta",
        delivered
          ? `<p>Olá, ${escapeHtml(t.user.name)}! A entrega do seu pedido foi concluída. Os dados estão no chat do atendimento, na sua conta.</p>`
          : `<p>Olá, ${escapeHtml(t.user.name)}! A equipe da PLAYBOY STORE respondeu o seu ticket <strong>${escapeHtml(t.subject)}</strong>.</p>`,
        { label: "Abrir atendimento", url: absoluteUrl(`/conta/atendimento/${t.number}`) },
      ),
    );
  } catch (err) {
    console.error("[tickets] falha ao notificar cliente", err);
  }
}
