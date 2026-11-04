import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatTicketNumber, TICKET_TYPE_LABEL } from "@/lib/tickets";
import { formatDateTime, formatOrderNumber } from "@/lib/format";
import { closeMyTicketAction, sendCustomerMessageAction } from "@/app/actions/tickets";
import { AutoRefresh, Composer, MessageList } from "@/components/tickets/chat";
import { TicketStatusBadge } from "@/components/tickets/badges";
import { buttonClass } from "@/components/ui/button";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Atendimento ${formatTicketNumber(Number((await params).number) || 0)}` };
}

export default async function TicketPage({ params }: Props) {
  const { number } = await params;
  const user = await requireUserPage(`/conta/atendimento/${number}`);
  const n = Number(number);
  if (!Number.isInteger(n) || n <= 0) notFound();

  // Só o dono do ticket acessa.
  const ticket = await prisma.ticket.findFirst({
    where: { number: n, userId: user.id },
    include: {
      order: { select: { number: true, status: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!ticket) notFound();
  if (ticket.customerUnread) await prisma.ticket.update({ where: { id: ticket.id }, data: { customerUnread: false } });

  const isDelivery = ticket.type === "DELIVERY";
  const delivered = !!ticket.deliveredAt;

  return (
    <div className="space-y-4">
      <Link href="/conta/atendimento" className="text-sm text-muted hover:text-fg">← Voltar ao atendimento</Link>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-subtle">
              {TICKET_TYPE_LABEL[ticket.type]} · <span className="font-mono">{formatTicketNumber(ticket.number)}</span> · aberto em {formatDateTime(ticket.createdAt)}
            </p>
            <h2 className="mt-1 font-semibold">{ticket.subject}</h2>
            {ticket.order && (
              <Link href={`/conta/pedidos/${ticket.order.number}`} className="mt-1 inline-block text-xs text-muted underline underline-offset-4 hover:text-fg">
                Ver pedido {formatOrderNumber(ticket.order.number)}
              </Link>
            )}
          </div>
          <TicketStatusBadge status={ticket.status} type={ticket.type} delivered={delivered} />
        </div>
        {isDelivery && !delivered && ticket.status !== "CLOSED" && (
          <p className="mt-4 rounded-lg border border-warning/25 bg-warning/[0.07] px-3 py-2.5 text-xs text-warning">
            Entrega manual em andamento · prazo de 24h a 48h. Você recebe um e-mail quando a equipe responder.
          </p>
        )}
      </div>

      <section className="card overflow-hidden">
        <MessageList
          viewer="customer"
          messages={ticket.messages.map((m) => ({
            id: m.id,
            body: m.body,
            fromStaff: m.fromStaff,
            system: m.system,
            authorName: m.fromStaff ? (m.author?.name.split(" ")[0] ?? null) : (m.author?.name ?? user.name),
            createdAt: m.createdAt.toISOString(),
          }))}
        />
        <Composer
          ticketId={ticket.id}
          action={sendCustomerMessageAction}
          placeholder={ticket.status === "CLOSED" ? "Escreva para reabrir o atendimento..." : "Escreva sua mensagem..."}
        />
      </section>

      {ticket.type === "SUPPORT" && ticket.status !== "CLOSED" && (
        <form action={closeMyTicketAction} className="flex justify-end">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <button className={buttonClass("ghost", "sm")}>Encerrar atendimento</button>
        </form>
      )}
      <AutoRefresh />
    </div>
  );
}
