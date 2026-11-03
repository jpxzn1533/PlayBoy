"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { leadAdminSchema, formToObject, zodErrors, type ActionState } from "@/lib/validation";
import { adminGuard, DENIED } from "./guard";

export async function saveLeadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await adminGuard("leads");
  if (!user) return DENIED;
  const id = String(formData.get("id") ?? "") || null;
  const parsed = leadAdminSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  if (id) {
    await prisma.lead.update({ where: { id }, data: parsed.data });
    await audit(user.id, "update", "Lead", id, { status: parsed.data.status });
  } else {
    const lead = await prisma.lead.create({ data: parsed.data });
    await audit(user.id, "create", "Lead", lead.id, { email: lead.email });
    revalidatePath("/admin/leads");
    redirect(`/admin/leads/${lead.id}`);
  }
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  return { ok: true, message: "Lead atualizado." };
}

const STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "LOST"];

export async function setLeadStatusAction(id: string, status: LeadStatus): Promise<ActionState> {
  const user = await adminGuard("leads");
  if (!user) return DENIED;
  if (!STATUSES.includes(status)) return { ok: false, error: "Status inválido." };
  await prisma.lead.update({ where: { id }, data: { status } });
  await audit(user.id, "status", "Lead", id, { status });
  revalidatePath("/admin/leads");
  return { ok: true, message: "Etapa do lead atualizada." };
}

export async function deleteLeadAction(id: string): Promise<ActionState> {
  const user = await adminGuard("leads");
  if (!user) return DENIED;
  const lead = await prisma.lead.delete({ where: { id } }).catch(() => null);
  if (!lead) return { ok: false, error: "Lead não encontrado." };
  await audit(user.id, "delete", "Lead", id, { email: lead.email });
  revalidatePath("/admin/leads");
  return { ok: true, message: "Lead excluído." };
}
