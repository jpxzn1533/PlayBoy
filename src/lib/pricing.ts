export function finalPrice(p: { priceCents: number; discountPercent: number }) {
  if (!p.discountPercent) return p.priceCents;
  return Math.round(p.priceCents * (1 - p.discountPercent / 100));
}

export type CouponLike = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderCents: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  active: boolean;
};

/** Valida um cupom para um subtotal. Retorna o desconto em centavos ou uma mensagem de erro. */
export function evaluateCoupon(coupon: CouponLike | null, subtotalCents: number, now = new Date()):
  | { ok: true; discountCents: number }
  | { ok: false; error: string } {
  if (!coupon || !coupon.active) return { ok: false, error: "Cupom inválido ou inativo." };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: "Este cupom ainda não está válido." };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, error: "Este cupom expirou." };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    return { ok: false, error: "Este cupom atingiu o limite de usos." };
  if (subtotalCents < coupon.minOrderCents)
    return { ok: false, error: `Pedido mínimo de R$ ${(coupon.minOrderCents / 100).toFixed(2).replace(".", ",")} para este cupom.` };
  const raw = coupon.type === "PERCENT" ? Math.round((subtotalCents * coupon.value) / 100) : coupon.value;
  return { ok: true, discountCents: Math.min(raw, subtotalCents) };
}
