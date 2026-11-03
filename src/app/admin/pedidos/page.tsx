import Link from "next/link";
import type { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDateTime, formatMoney, formatNumber, formatOrderNumber } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/payments";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { firstParam } from "@/lib/utils";
import { startOfLocalDay } from "@/lib/analytics";
import { AdminHeader, EmptyRow, FilterBar, StatCard, Table, Td, Th } from "@/components/admin/ui";
import { Input, Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/misc";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/status-badges";

export const metadata = { title: "Vendas e pedidos" };
const PER_PAGE = 20;

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];
const PAYMENTS = Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[];
const METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("orders");
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() ?? "";
  const status = firstParam(sp.status) ?? "";
  const pagamento = firstParam(sp.pagamento) ?? "";
  const metodo = firstParam(sp.metodo) ?? "";
  const de = firstParam(sp.de) ?? "";
  const ate = firstParam(sp.ate) ?? "";
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);

  const numberQuery = Number(q.replace(/^PB-?/i, ""));
  const fromDate = de ? new Date(`${de}T00:00:00-03:00`) : null;
  const toDate = ate ? new Date(new Date(`${ate}T00:00:00-03:00`).getTime() + 86400000) : null;

  const where: Prisma.OrderWhereInput = {
    ...(q && {
      OR: [
        ...(Number.isInteger(numberQuery) && numberQuery > 0 ? [{ number: numberQuery }] : []),
        { customerName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { items: { some: { productName: { contains: q, mode: "insensitive" } } } },
      ],
    }),
    ...(STATUSES.includes(status as OrderStatus) && { status: status as OrderStatus }),
    ...(PAYMENTS.includes(pagamento as PaymentStatus) && { paymentStatus: pagamento as PaymentStatus }),
    ...(METHODS.includes(metodo as PaymentMethod) && { paymentMethod: metodo as PaymentMethod }),
    ...((fromDate && !Number.isNaN(fromDate.getTime())) || (toDate && !Number.isNaN(toDate.getTime()))
      ? { createdAt: { ...(fromDate && !Number.isNaN(fromDate.getTime()) && { gte: fromDate }), ...(toDate && !Number.isNaN(toDate.getTime()) && { lt: toDate }) } }
      : {}),
  };

  const today = startOfLocalDay(new Date());
  const [orders, total, sums, pending, todayPaid] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { items: { select: { productName: true, quantity: true } } },
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({ where: { ...where, paymentStatus: "PAID" }, _sum: { totalCents: true }, _count: true }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.aggregate({ where: { paymentStatus: "PAID", paidAt: { gte: today } }, _sum: { totalCents: true }, _count: true }),
  ]);

  return (
    <div>
      <AdminHeader title="Vendas e pedidos" description="Acompanhe, pesquise e gerencie todos os pedidos da loja." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pedidos (filtro atual)" value={formatNumber(total)} />
        <StatCard label="Receita paga (filtro atual)" value={formatMoney(sums._sum.totalCents ?? 0)} hint={`${sums._count} pedidos pagos`} />
        <StatCard label="Vendas hoje" value={formatMoney(todayPaid._sum.totalCents ?? 0)} hint={`${todayPaid._count} pedidos`} />
        <StatCard label="Aguardando pagamento" value={formatNumber(pending)} href="/admin/pedidos?status=PENDING" />
      </div>

      <FilterBar action="/admin/pedidos" resetHref="/admin/pedidos">
        <Input name="q" defaultValue={q} placeholder="Nº, cliente, e-mail ou produto" className="w-64" aria-label="Buscar" />
        <Select name="status" defaultValue={status} className="w-48" aria-label="Status do pedido">
          <option value="">Status do pedido</option>
          {STATUSES.map((s) => (<option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>))}
        </Select>
        <Select name="pagamento" defaultValue={pagamento} className="w-44" aria-label="Status do pagamento">
          <option value="">Pagamento</option>
          {PAYMENTS.map((s) => (<option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>))}
        </Select>
        <Select name="metodo" defaultValue={metodo} className="w-44" aria-label="Método">
          <option value="">Método</option>
          {METHODS.map((s) => (<option key={s} value={s}>{PAYMENT_METHOD_LABEL[s]}</option>))}
        </Select>
        <Input name="de" type="date" defaultValue={de} className="w-auto" aria-label="De" />
        <Input name="ate" type="date" defaultValue={ate} className="w-auto" aria-label="Até" />
      </FilterBar>

      <Table minWidth={1060}>
        <thead>
          <tr>
            <Th>Pedido</Th><Th>Cliente</Th><Th>Produtos</Th><Th>Valor</Th><Th>Data</Th><Th>Método</Th><Th>Pagamento</Th><Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && <EmptyRow colSpan={8} />}
          {orders.map((o) => (
            <tr key={o.id} className="transition-colors hover:bg-white/[0.02]">
              <Td><Link href={`/admin/pedidos/${o.id}`} className="font-mono text-xs font-semibold hover:underline">{formatOrderNumber(o.number)}</Link></Td>
              <Td>
                <p className="max-w-[180px] truncate">{o.customerName}</p>
                <p className="max-w-[180px] truncate text-xs text-subtle">{o.customerEmail}</p>
              </Td>
              <Td><p className="max-w-[220px] truncate text-muted">{o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}</p></Td>
              <Td className="font-medium tabular-nums">{formatMoney(o.totalCents)}</Td>
              <Td className="whitespace-nowrap text-muted">{formatDateTime(o.createdAt)}</Td>
              <Td className="whitespace-nowrap text-muted">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</Td>
              <Td><PaymentStatusBadge status={o.paymentStatus} /></Td>
              <Td><OrderStatusBadge status={o.status} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-6">
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/pedidos" params={{ q, status, pagamento, metodo, de, ate }} />
      </div>
    </div>
  );
}
