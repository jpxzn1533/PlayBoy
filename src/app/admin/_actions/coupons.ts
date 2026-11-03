"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { couponSchema, formToObject, zodErrors, type ActionState } from "@/lib/validation";
import { adminGuard, DENIED, isUniqueViolation } from "./guard";

export async function saveCouponAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await adminGuard("coupons");
  if (!user) return DENIED;
  const id = String(formData.get("id") ?? "") || null;
  const parsed = couponSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { minOrder, ...rest } = parsed.data;
  const data = { ...rest, minOrderCents: minOrder };
  try {
    if (id) {
      await prisma.coupon.update({ where: { id }, data });
      await audit(user.id, "update", "Cupom", id, { code: data.code });
    } else {
      const c = await prisma.coupon.create({ data });
      await audit(user.id, "create", "Cupom", c.id, { code: data.code });
    }
  } catch (e) {
    if (isUniqueViolation(e, "code")) return { ok: false, fieldErrors: { code: ["Já existe um cupom com este código."] }, error: "Revise os campos destacados." };
    throw e;
  }
  revalidatePath("/admin/cupons");
  return { ok: true, message: id ? "Cupom atualizado." : "Cupom criado." };
}

export async function toggleCouponAction(id: string): Promise<ActionState> {
  const user = await adminGuard("coupons");
  if (!user) return DENIED;
  const c = await prisma.coupon.findUnique({ where: { id } });
  if (!c) return { ok: false, error: "Cupom não encontrado." };
  await prisma.coupon.update({ where: { id }, data: { active: !c.active } });
  await audit(user.id, c.active ? "deactivate" : "activate", "Cupom", id, { code: c.code });
  revalidatePath("/admin/cupons");
  return { ok: true, message: c.active ? "Cupom desativado." : "Cupom ativado." };
}

export async function deleteCouponAction(id: string): Promise<ActionState> {
  const user = await adminGuard("coupons");
  if (!user) return DENIED;
  const c = await prisma.coupon.delete({ where: { id } }).catch(() => null);
  if (!c) return { ok: false, error: "Cupom não encontrado." };
  await audit(user.id, "delete", "Cupom", id, { code: c.code });
  revalidatePath("/admin/cupons");
  return { ok: true, message: "Cupom excluído." };
}
