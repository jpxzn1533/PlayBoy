import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDate, formatDateTime, formatMoney, formatOrderNumber, relativeTime } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/payments";
import { AdminHeader, Panel, StatCard, Table, Td, Th, EmptyRow } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/confirm-button";
import { Badge, Stars } from "@/components/ui/misc";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/status-badges";
import { setCustomerStatusAction, verifyCustomerEmailAction } from "../../_actions/customers";

export const metadata = { title: "Cliente" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("customers");
  const { id } = await params;
  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { items: { select: { productName: true, quantity: true } } } },
      reviews: { orderBy: { createdAt: "desc" }, take: 10, include: { product: { select: { name: true, slug: true } } } },
      _count: { select: { favorites: true, sessions: true } },
    },
  });
  if (!customer) notFound();
  const paid = customer.orders.filter((o) => o.paymentStatus === "PAID");
  const spent = paid.reduce((s, o) => s + o.totalCents, 0);

  return (
    <div>
      <AdminHeader
        title={customer.name}
        description={`${customer.email} · cliente desde ${formatDate(customer.createdAt)}`}
        back={{ href: "/admin/clientes", label: "Clientes" }}
        actions={
          customer.role === "CUSTOMER" && (
            <>
              {!customer.emailVerifiedAt && (
                <ActionButton action={verifyCustomerEmailAction.bind(null, customer.id)} variant="outline" size="md" confirm="Marcar o e-mail deste cliente como verificado?">
                  Marcar e-mail como verificado
                </ActionButton>
              )}
              {customer.status === "ACTIVE" ? (
                <ActionButton action={setCustomerStatusAction.bind(null, customer.id, "SUSPENDED")} variant="danger" size="md" confirm="Suspender esta conta? O cliente será desconectado e não poderá entrar.">
                  Suspender conta
                </ActionButton>
              ) : (
                <ActionButton action={setCustomerStatusAction.bind(null, customer.id, "ACTIVE")} variant="primary" size="md">
                  Reativar conta
                </ActionButton>
              )}
            </>
          )
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Compras pagas" value={String(paid.length)} hint={`${customer.orders.length} pedidos no total`} />
        <StatCard label="Total gasto" value={formatMoney(spent)} />
        <StatCard label="Ticket médio" value={formatMoney(paid.length ? Math.round(spent / paid.length) : 0)} />
        <StatCard label="Última atividade" value={customer.lastActiveAt ? relativeTime(customer.lastActiveAt) : "—"} hint={`${customer._count.sessions} sessão(ões) ativa(s)`} />
        <StatCard label="Favoritos" value={String(customer._count.favorites)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <h2 className="text-sm font-semibold">Histórico de pedidos</h2>
          <Table minWidth={720}>
            <thead><tr><Th>Pedido</Th><Th>Produtos</Th><Th>Data</Th><Th>Método</Th><Th>Pagamento</Th><Th>Status</Th><Th className="text-right">Valor</Th></tr></thead>
            <tbody>
              {customer.orders.length === 0 && <EmptyRow colSpan={7} text="Este cliente ainda não fez pedidos." />}
              {customer.orders.map((o) => (
                <tr key={o.id} className="hover:bg-white/[0.02]">
                  <Td><Link href={`/admin/pedidos/${o.id}`} className="font-mono text-xs font-semibold hover:underline">{formatOrderNumber(o.number)}</Link></Td>
                  <Td><p className="max-w-[200px] truncate text-muted">{o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}</p></Td>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(o.createdAt)}</Td>
                  <Td className="text-muted">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</Td>
                  <Td><PaymentStatusBadge status={o.paymentStatus} /></Td>
                  <Td><OrderStatusBadge status={o.status} /></Td>
                  <Td className="text-right font-medium tabular-nums">{formatMoney(o.totalCents)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div className="space-y-6">
          <Panel title="Dados da conta">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Status</dt><dd><Badge tone={customer.status === "ACTIVE" ? "success" : "danger"}>{customer.status === "ACTIVE" ? "Ativa" : "Suspensa"}</Badge></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Perfil</dt><dd>{customer.role === "ADMIN" ? "Administrador" : "Cliente"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">E-mail</dt><dd>{customer.emailVerifiedAt ? `verificado em ${formatDate(customer.emailVerifiedAt)}` : "não verificado"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Telefone</dt><dd>{customer.phone ?? "—"}</dd></div>
            </dl>
          </Panel>
          <Panel title="Avaliações">
            {customer.reviews.length === 0 ? (
              <p className="text-sm text-subtle">Nenhuma avaliação.</p>
            ) : (
              <ul className="space-y-3">
                {customer.reviews.map((r) => (
                  <li key={r.id} className="text-sm">
                    <Stars value={r.rating} size={12} />
                    <p className="mt-1 line-clamp-2 text-muted">{r.comment}</p>
                    <Link href={`/produto/${r.product.slug}`} className="text-xs text-subtle hover:text-fg">{r.product.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
