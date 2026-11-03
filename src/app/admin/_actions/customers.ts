"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { adminGuard, DENIED } from "./guard";
import type { ActionState } from "@/lib/validation";

export async function setCustomerStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionState> {
  const admin = await adminGuard("customers");
  if (!admin) return DENIED;
  if (userId === admin.id) return { ok: false, error: "Você não pode suspender a própria conta." };
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (!target) return { ok: false, error: "Cliente não encontrado." };
  if (target.role === "ADMIN") return { ok: false, error: "Administradores são gerenciados em Permissões." };
  await prisma.user.update({ where: { id: userId }, data: { status } });
  // Suspensão encerra imediatamente todas as sessões do cliente.
  if (status === "SUSPENDED") await prisma.session.deleteMany({ where: { userId } });
  await audit(admin.id, status === "SUSPENDED" ? "suspend" : "reactivate", "Cliente", userId, { email: target.email });
  revalidatePath(`/admin/clientes/${userId}`);
  revalidatePath("/admin/clientes");
  return { ok: true, message: status === "SUSPENDED" ? "Conta suspensa e sessões encerradas." : "Conta reativada." };
}

export async function verifyCustomerEmailAction(userId: string): Promise<ActionState> {
  const admin = await adminGuard("customers");
  if (!admin) return DENIED;
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  await audit(admin.id, "verify_email", "Cliente", userId);
  revalidatePath(`/admin/clientes/${userId}`);
  return { ok: true, message: "E-mail marcado como verificado." };
}
