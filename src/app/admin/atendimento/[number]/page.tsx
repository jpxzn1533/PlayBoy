import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatTicketNumber, TICKET_TYPE_LABEL } from "@/lib/tickets";
import { formatDate, formatDateTime, formatMoney, formatOrderNumber } from "@/lib/format";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/confirm-button";
import { AutoRefresh, Composer, MessageList } from "@/components/tickets/chat";
import { TicketStatusBadge } from "@/components/tickets/badges";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/status-badges";
import { markDeliveredAction, setTicketStatusAction, staffReplyAction } from "../../_actions/tickets";

export const metadata = { title: "Ticket" };

const DELIVERY_TEMPLATE = `Olá! Sua conta foi entregue. Seguem os dados de acesso:

Login:
Senha:
E-mail da conta:
Senha do e-mail:

Recomendamos trocar a senha e o e-mail de recuperação assim que acessar. Qualquer dúvida, é só chamar aqui. Obrigado pela compra!`;

export default async function AdminTicketPage({ params }: { params: Promise<{ number: string }> }) {
  await requireAdminPage("support");
  const n = Number((await params).number);
  if (!Number.isInteger(n) || n <= 0) notFound();

  const ticket = await prisma.ticket.findUnique({
    where: { number: n },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      order: { include: { items: { include: { product: { select: { manualDelivery: true } } } } } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!ticket) notFound();

  const isDelivery = ticket.type === "DELIVERY";
  const delivered = !!ticket.deliveredAt;
  const canDeliver = isDelivery && !!ticket.order && ticket.order.paymentStatus === "PAID" && ticket.order.status === "PROCESSING";
  const staffReplied = ticket.messages.some((m) => m.fromStaff && !m.system);
  const back = isDelivery ? { href: "/admin/entregas", label: "Entrega de contas" } : { href: "/admin/atendimento", label: "Atendimento" };

  return (
    <div>
      <AdminHeader
        title={`${TICKET_TYPE_LABEL[ticket.type]} ${formatTicketNumber(ticket.number)}`}
        description={ticket.subject}
        back={back}
        actions={<TicketStatusBadge status={ticket.status} type={ticket.type} delivered={delivered} />}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="card overflow-hidden">
          <MessageList
            viewer="staff"
            messages={ticket.messages.map((m) => ({
              id: m.id,
              body: m.body,
              fromStaff: m.fromStaff,
              system: m.system,
              authorName: m.author?.name ?? (m.fromStaff ? "Equipe" : ticket.user.name),
              createdAt: m.createdAt.toISOString(),
            }))}
          />
          <Composer
            ticketId={ticket.id}
            action={staffReplyAction}
            placeholder={isDelivery ? "Envie os dados da conta ou atualize o cliente..." : "Responder ao cliente..."}
            hint="O cliente recebe um e-mail avisando da resposta (sem o conteúdo da mensagem)."
            templates={isDelivery ? [{ label: "Modelo de entrega", text: DELIVERY_TEMPLATE }] : []}
          />
        </section>

        <div className="space-y-6">
          {isDelivery && (
            <Panel title="Entrega">
              {delivered ? (
                <p className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> Entregue em {formatDateTime(ticket.deliveredAt!)}
                </p>
              ) : canDeliver ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Envie os dados da conta pelo chat e depois conclua a entrega. O pedido passa para "Concluído" e o cliente é avisado.</p>
                  {!staffReplied && <p className="text-xs text-warning">Nenhuma mensagem da equipe enviada ainda neste chat.</p>}
                  <ActionButton
                    action={markDeliveredAction.bind(null, ticket.id)}
                    confirm={staffReplied ? "Confirmar que a conta foi entregue ao cliente?" : "Nenhuma mensagem foi enviada neste chat. Marcar como entregue mesmo assim?"}
                    variant="primary"
                    size="md"
                    className="w-full"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Marcar como entregue
                  </ActionButton>
                </div>
              ) : (
                <p className="text-sm text-muted">Este pedido não está aguardando entrega.</p>
              )}
            </Panel>
          )}

          <Panel title="Cliente">
            <p className="font-medium">{ticket.user.name}</p>
            <p className="text-sm text-muted">{ticket.user.email}</p>
            {ticket.user.phone && <p className="text-sm text-muted">{ticket.user.phone}</p>}
            <p className="mt-1 text-xs text-subtle">Cliente desde {formatDate(ticket.user.createdAt)}</p>
            <Link href={`/admin/clientes/${ticket.user.id}`} className="mt-3 inline-block text-sm underline underline-offset-4">Ver histórico do cliente</Link>
          </Panel>

          {ticket.order && (
            <Panel title={`Pedido ${formatOrderNumber(ticket.order.number)}`}>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <OrderStatusBadge status={ticket.order.status} />
                <PaymentStatusBadge status={ticket.order.paymentStatus} />
              </div>
              <ul className="space-y-1.5 text-sm">
                {ticket.order.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {i.quantity}× {i.productName}
                      {i.product?.manualDelivery && <span className="ml-1.5 text-xs text-warning">(manual)</span>}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">{formatMoney(i.totalCents)}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/admin/pedidos/${ticket.order.id}`} className="mt-3 inline-block text-sm underline underline-offset-4">Abrir pedido</Link>
            </Panel>
          )}

          {!isDelivery && (
            <Panel title="Ações">
              {ticket.status === "CLOSED" ? (
                <ActionButton action={setTicketStatusAction.bind(null, ticket.id, "OPEN")} variant="outline" size="md" className="w-full">
                  <RotateCcw className="h-4 w-4" /> Reabrir ticket
                </ActionButton>
              ) : (
                <ActionButton action={setTicketStatusAction.bind(null, ticket.id, "CLOSED")} confirm="Encerrar este atendimento?" variant="outline" size="md" className="w-full">
                  <Lock className="h-4 w-4" /> Encerrar ticket
                </ActionButton>
              )}
            </Panel>
          )}
        </div>
      </div>
      <AutoRefresh />
    </div>
  );
}
