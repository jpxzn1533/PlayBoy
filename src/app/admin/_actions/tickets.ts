"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { changeOrderStatus, OrderError } from "@/lib/orders";
import { notifyCustomer } from "@/lib/tickets";
import { formToObject, ticketMessageSchema, zodErrors, type ActionState } from "@/lib/validation";
import { adminGuard, DENIED } from "./guard";

const refresh = (number: number) => {
  revalidatePath(`/admin/atendimento/${number}`);
  revalidatePath("/admin/atendimento");
  revalidatePath("/admin/entregas");
  revalidatePath(`/conta/atendimento/${number}`);
};

/** Equipe responde um ticket. */
export async function staffReplyAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminGuard("support");
  if (!admin) return DENIED;
  if (!rateLimit(`staff-msg:${admin.id}`, 60, 60 * 1000).ok) return { ok: false, error: "Muitas mensagens seguidas. Aguarde um instante." };
  const parsed = ticketMessageSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const ticket = await prisma.ticket.findUnique({ where: { id: String(formData.get("ticketId") ?? "") } });
  if (!ticket) return { ok: false, error: "Ticket não encontrado." };

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      // Atendimento: passa a aguardar o cliente. Entrega: continua pendente até ser marcada como entregue.
      status: ticket.type === "SUPPORT" ? "WAITING_CUSTOMER" : ticket.status === "CLOSED" ? "CLOSED" : "OPEN",
      customerUnread: true,
      lastMessageAt: new Date(),
      messages: { create: { authorId: admin.id, fromStaff: true, body: parsed.data.body } },
    },
  });
  // Registra que houve resposta, sem gravar o conteúdo (pode conter dados de acesso da conta).
  await audit(admin.id, "reply", "Ticket", ticket.id, { number: ticket.number });
  void notifyCustomer(ticket.id);
  refresh(ticket.number);
  return { ok: true };
}

/** Encerra ou reabre um ticket de atendimento. */
export async function setTicketStatusAction(ticketId: string, status: "OPEN" | "CLOSED"): Promise<ActionState> {
  const admin = await adminGuard("support");
  if (!admin) return DENIED;
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, error: "Ticket não encontrado." };
  if (ticket.type === "DELIVERY" && status === "CLOSED")
    return { ok: false, error: "Chats de entrega são encerrados ao marcar a entrega como concluída." };
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status,
      messages: { create: { system: true, fromStaff: true, body: status === "CLOSED" ? "Atendimento encerrado pela equipe." : "Atendimento reaberto pela equipe." } },
    },
  });
  await audit(admin.id, status === "CLOSED" ? "close" : "reopen", "Ticket", ticket.id, { number: ticket.number });
  refresh(ticket.number);
  return { ok: true, message: status === "CLOSED" ? "Ticket encerrado." : "Ticket reaberto." };
}

/** Conclui a entrega manual: pedido vira "Concluído" e o chat é encerrado. */
export async function markDeliveredAction(ticketId: string): Promise<ActionState> {
  const admin = await adminGuard("support");
  if (!admin) return DENIED;
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { order: true } });
  if (!ticket || ticket.type !== "DELIVERY" || !ticket.order) return { ok: false, error: "Chat de entrega não encontrado." };
  if (ticket.order.paymentStatus !== "PAID") return { ok: false, error: "O pagamento deste pedido não está confirmado." };
  if (ticket.order.status === "COMPLETED") return { ok: true, message: "Este pedido já está concluído." };
  try {
    await changeOrderStatus(ticket.order.id, "COMPLETED", admin.email, "Entrega manual concluída pelo atendimento.");
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    throw e;
  }
  await audit(admin.id, "deliver", "Pedido", ticket.order.id, { ticket: ticket.number, order: ticket.order.number });
  void notifyCustomer(ticket.id, true);
  refresh(ticket.number);
  revalidatePath(`/admin/pedidos/${ticket.order.id}`);
  return { ok: true, message: "Entrega concluída. O cliente foi avisado por e-mail." };
}
