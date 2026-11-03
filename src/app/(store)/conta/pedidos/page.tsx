import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatDateTime, formatMoney, formatOrderNumber } from "@/lib/format";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/store/status-badges";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Histórico de compras" };
const PER_PAGE = 10;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUserPage("/conta/pedidos");
  const page = Math.max(1, Number(firstParam((await searchParams).page)) || 1);
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { items: { select: { productName: true, quantity: true } } },
    }),
    prisma.order.count({ where: { userId: user.id } }),
  ]);

  if (total === 0)
    return (
      <EmptyState
        icon={<Package className="h-5 w-5" />}
        title="Nenhuma compra ainda"
        description="Quando você fizer um pedido na PLAYBOY STORE, ele aparecerá aqui."
        action={<LinkButton href="/produtos">Explorar produtos</LinkButton>}
      />
    );

  return (
    <div className="space-y-6">
      <h2 className="heading-md text-xl">Histórico de compras</h2>
      <div className="space-y-3">
        {orders.map((o) => (
          <Link key={o.id} href={`/conta/pedidos/${o.number}`} className="card group flex items-center gap-4 p-5 transition-colors hover:border-line-strong">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">{formatOrderNumber(o.number)}</span>
                <OrderStatusBadge status={o.status} />
              </div>
              <p className="mt-1.5 truncate text-sm text-muted">
                {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(" · ")}
              </p>
              <p className="mt-1 text-xs text-subtle">{formatDateTime(o.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="font-display font-semibold">{formatMoney(o.totalCents)}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
      <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/conta/pedidos" params={{}} />
    </div>
  );
}
