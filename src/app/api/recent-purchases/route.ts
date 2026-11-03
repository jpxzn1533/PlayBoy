import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Compras recentes REAIS (pedidos pagos nos últimos 7 dias) para o aviso na loja.
 * Expõe apenas o primeiro nome e a inicial do sobrenome — nunca e-mail ou dados do pedido.
 */
export async function GET() {
  const settings = await getSettings();
  if (!settings.purchasePopupEnabled) return NextResponse.json({ enabled: false, intervalMinutes: 0, purchases: [] });

  const orders = await prisma.order.findMany({
    where: { paymentStatus: "PAID", paidAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    orderBy: { paidAt: "desc" },
    take: 15,
    select: {
      id: true,
      customerName: true,
      paidAt: true,
      items: {
        take: 1,
        select: {
          productName: true,
          product: { select: { slug: true, active: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } },
        },
      },
    },
  });

  const purchases = orders
    .filter((o) => o.items[0])
    .map((o) => {
      const [first, ...rest] = o.customerName.trim().split(/\s+/);
      const last = rest.at(-1);
      const item = o.items[0];
      const product = item.product?.active ? item.product : null;
      return {
        id: o.id,
        buyer: last ? `${first} ${last[0].toUpperCase()}.` : first,
        product: item.productName,
        slug: product?.slug ?? null,
        image: product?.images[0]?.url ?? null,
        paidAt: o.paidAt!.toISOString(),
      };
    });

  return NextResponse.json(
    { enabled: true, intervalMinutes: settings.purchasePopupMinutes, purchases },
    { headers: { "Cache-Control": "no-store" } },
  );
}
