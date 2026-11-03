"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { adminGuard, DENIED } from "./guard";
import type { ActionState } from "@/lib/validation";

export async function toggleReviewAction(id: string): Promise<ActionState> {
  const user = await adminGuard("reviews");
  if (!user) return DENIED;
  const r = await prisma.review.findUnique({ where: { id }, include: { product: { select: { slug: true } } } });
  if (!r) return { ok: false, error: "Avaliação não encontrada." };
  await prisma.review.update({ where: { id }, data: { approved: !r.approved } });
  await audit(user.id, r.approved ? "hide" : "approve", "Avaliação", id);
  revalidatePath("/admin/avaliacoes");
  revalidatePath(`/produto/${r.product.slug}`);
  return { ok: true, message: r.approved ? "Avaliação ocultada da loja." : "Avaliação publicada." };
}

export async function deleteReviewAction(id: string): Promise<ActionState> {
  const user = await adminGuard("reviews");
  if (!user) return DENIED;
  const r = await prisma.review.delete({ where: { id }, include: { product: { select: { slug: true } } } }).catch(() => null);
  if (!r) return { ok: false, error: "Avaliação não encontrada." };
  await audit(user.id, "delete", "Avaliação", id, { rating: r.rating });
  revalidatePath("/admin/avaliacoes");
  revalidatePath(`/produto/${r.product.slug}`);
  return { ok: true, message: "Avaliação excluída." };
}
