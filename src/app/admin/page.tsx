import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDashboardData, RANGE_LABEL, resolveRange } from "@/lib/analytics";
import { formatDateTime, formatMoney, formatNumber, formatOrderNumber, formatPercent } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import { AdminHeader, Panel, StatCard } from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/range-filter";
import { ConversionChart, CustomersChart, RevenueChart, SalesChart, TopProductsChart } from "@/components/admin/charts";
import { OrderStatusBadge } from "@/components/store/status-badges";

export const metadata = { title: "Visão geral" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("dashboard");
  const sp = await searchParams;
  const range = resolveRange({ range: firstParam(sp.range), from: firstParam(sp.from), to: firstParam(sp.to) });
  const [data, recentOrders, lowStock] = await Promise.all([
    getDashboardData(range),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.product.findMany({ where: { active: true, stock: { lte: 5 } }, orderBy: { stock: "asc" }, take: 5, select: { id: true, name: true, stock: true } }),
  ]);
  const k = data.kpis;
  const periodLabel = range.key === "custom" ? `${range.fromInput.split("-").reverse().join("/")} – ${range.toInput.split("-").reverse().join("/")}` : RANGE_LABEL[range.key];
  const vsLabel = "vs. período anterior";

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Visão geral"
        description={`Desempenho da PLAYBOY STORE · ${periodLabel}`}
        actions={<RangeFilter current={range.key} from={range.fromInput} to={range.toInput} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento no período" value={formatMoney(k.periodRevenue.value)} change={k.periodRevenue.change} hint={vsLabel} />
        <StatCard label="Vendas realizadas" value={formatNumber(k.sales.value)} change={k.sales.change} hint={vsLabel} href="/admin/pedidos?pagamento=PAID" />
        <StatCard label="Ticket médio" value={formatMoney(k.avgTicket.value)} change={k.avgTicket.change} hint={vsLabel} />
        <StatCard label="Conversão" value={formatPercent(k.conversion.value, 2)} change={k.conversion.change} hint={`${formatNumber(k.conversion.buyers)} de ${formatNumber(k.conversion.visitors)} visitantes`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Faturamento total" value={formatMoney(k.totalRevenue)} hint="desde o início" />
        <StatCard label="Faturamento do mês" value={formatMoney(k.monthRevenue)} hint="mês atual" />
        <StatCard label="Pedidos pendentes" value={formatNumber(k.pendingOrders)} hint="aguardando pagamento" href="/admin/pedidos?status=PENDING" />
        <StatCard label="Clientes" value={formatNumber(k.totalCustomers)} hint={`+${k.newCustomers.value} novos no período`} href="/admin/clientes" />
        <StatCard label="Produtos" value={`${k.productsAvailable}/${k.productsTotal}`} hint="disponíveis / cadastrados" href="/admin/produtos" />
        <StatCard label="Leads capturados" value={formatNumber(k.leadsTotal)} hint={`+${k.leadsPeriod} no período`} href="/admin/leads" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Faturamento por período" description="Receita de pedidos pagos, por dia">
          <RevenueChart data={data.series} />
        </Panel>
        <Panel title="Quantidade de vendas" description="Pedidos pagos por dia">
          <SalesChart data={data.series} />
        </Panel>
        <Panel title="Crescimento de clientes" description={`Total acumulado · ${k.newCustomers.value} novos no período`}>
          <CustomersChart data={data.series} />
        </Panel>
        <Panel title="Conversão de visitantes em compradores" description="Compradores únicos ÷ visitantes únicos, por dia">
          <ConversionChart data={data.series} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Produtos mais vendidos" description="Unidades vendidas no período">
          <TopProductsChart data={data.topProducts} />
        </Panel>
        <div className="space-y-6">
          <Panel title="Pedidos recentes" actions={<Link href="/admin/pedidos" className="text-xs text-muted hover:text-fg">Ver todos</Link>} bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-semibold">{formatOrderNumber(o.number)}</p>
                      <p className="truncate text-xs text-subtle">{o.customerName} · {formatDateTime(o.createdAt)}</p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                    <span className="w-24 text-right text-sm font-medium tabular-nums">{formatMoney(o.totalCents)}</span>
                  </Link>
                </li>
              ))}
              {recentOrders.length === 0 && <li className="px-5 py-8 text-center text-sm text-subtle">Nenhum pedido ainda.</li>}
            </ul>
          </Panel>
          {lowStock.length > 0 && (
            <Panel title="Estoque baixo" bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {lowStock.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/produtos/${p.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-white/[0.02]">
                      <span className="truncate">{p.name}</span>
                      <span className={p.stock === 0 ? "text-danger" : "text-warning"}>{p.stock === 0 ? "Esgotado" : `${p.stock} un.`}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
