"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { formatOrderNumber } from "@/lib/format";
import { notifyStaff } from "@/lib/tickets";
import { formToObject, newTicketSchema, ticketMessageSchema, zodErrors, type ActionState } from "@/lib/validation";

/** Cliente abre um ticket de atendimento. */
export async function createTicketAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!rateLimit(`ticket-new:${user.id}`, 5, 30 * 60 * 1000).ok)
    return { ok: false, error: "Você abriu vários tickets em pouco tempo. Aguarde um pouco ou continue em um ticket existente." };
  const parsed = newTicketSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { subject, body, orderNumber } = parsed.data;

  let prefix = "";
  if (orderNumber) {
    const order = await prisma.order.findFirst({ where: { number: orderNumber, userId: user.id }, select: { number: true } });
    if (!order) return { ok: false, fieldErrors: { orderNumber: ["Pedido não encontrado na sua conta."] }, error: "Revise os campos destacados." };
    prefix = `[${formatOrderNumber(order.number)}] `;
  }

  const ticket = await prisma.ticket.create({
    data: {
      type: "SUPPORT",
      subject: `${prefix}${subject}`.slice(0, 160),
      userId: user.id,
      messages: { create: { authorId: user.id, body } },
    },
  });
  void notifyStaff(ticket.id, "new");
  revalidatePath("/conta/atendimento");
  redirect(`/conta/atendimento/${ticket.number}`);
}

/** Cliente envia mensagem em um ticket próprio (reabre se estiver encerrado). */
export async function sendCustomerMessageAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!rateLimit(`ticket-msg:${user.id}`, 20, 5 * 60 * 1000).ok) return { ok: false, error: "Muitas mensagens seguidas. Aguarde um instante." };
  const parsed = ticketMessageSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);

  const ticket = await prisma.ticket.findFirst({ where: { id: String(formData.get("ticketId") ?? ""), userId: user.id } });
  if (!ticket) return { ok: false, error: "Atendimento não encontrado." };

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "OPEN",
      lastMessageAt: new Date(),
      messages: { create: { authorId: user.id, body: parsed.data.body } },
    },
  });
  void notifyStaff(ticket.id, "message");
  revalidatePath(`/conta/atendimento/${ticket.number}`);
  return { ok: true };
}

/** Cliente encerra um ticket de atendimento (chats de entrega são encerrados pela equipe). */
export async function closeMyTicketAction(formData: FormData) {
  const user = await requireUser();
  const ticket = await prisma.ticket.findFirst({ where: { id: String(formData.get("ticketId") ?? ""), userId: user.id, type: "SUPPORT" } });
  if (!ticket || ticket.status === "CLOSED") return;
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "CLOSED", messages: { create: { system: true, body: "Atendimento encerrado pelo cliente." } } },
  });
  revalidatePath(`/conta/atendimento/${ticket.number}`);
  revalidatePath("/conta/atendimento");
}
