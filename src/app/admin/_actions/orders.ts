"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { changeOrderStatus, markOrderPaid, OrderError } from "@/lib/orders";
import { orderStatusSchema, formToObject, zodErrors, type ActionState } from "@/lib/validation";
import { adminGuard, DENIED } from "./guard";

export async function updateOrderStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await adminGuard("orders");
  if (!user) return DENIED;
  const parsed = orderStatusSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { orderId, status, note } = parsed.data;
  try {
    await changeOrderStatus(orderId, status, user.email, note ?? "Status alterado pelo administrador.");
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    throw e;
  }
  await audit(user.id, "status", "Pedido", orderId, { status, note });
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  return { ok: true, message: "Status do pedido atualizado." };
}

export async function confirmPaymentAction(orderId: string): Promise<ActionState> {
  const user = await adminGuard("orders");
  if (!user) return DENIED;
  try {
    await markOrderPaid(orderId, user.email, "Pagamento confirmado manualmente pelo administrador.");
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    throw e;
  }
  await audit(user.id, "confirm_payment", "Pedido", orderId);
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  return { ok: true, message: "Pagamento confirmado e pedido concluído." };
}
