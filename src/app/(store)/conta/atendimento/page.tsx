import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessageSquare, PackageCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatTicketNumber } from "@/lib/tickets";
import { relativeTime } from "@/lib/format";
import { TicketStatusBadge } from "@/components/tickets/badges";
import { NewTicketForm } from "./new-ticket-form";

export const metadata: Metadata = { title: "Atendimento" };

export default async function SupportPage() {
  const user = await requireUserPage("/conta/atendimento");
  const [tickets, orders] = await Promise.all([
    prisma.ticket.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
      take: 50,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true } } },
    }),
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20, select: { number: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="heading-md text-xl">Atendimento</h2>
        <p className="mt-1 text-sm text-muted">Fale com a equipe da PLAYBOY STORE. Respondemos o mais rápido possível.</p>
      </div>

      {tickets.length > 0 && (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} href={`/conta/atendimento/${t.number}`} className="card group flex items-center gap-4 p-4 transition-colors hover:border-line-strong">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-muted">
                {t.type === "DELIVERY" ? <PackageCheck className="h-[18px] w-[18px]" /> : <MessageSquare className="h-[18px] w-[18px]" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-subtle">{formatTicketNumber(t.number)}</span>
                  <TicketStatusBadge status={t.status} type={t.type} delivered={!!t.deliveredAt} />
                  {t.customerUnread && <span className="rounded-full bg-accent px-2 py-px text-[10px] font-bold text-accent-fg">NOVA RESPOSTA</span>}
                </div>
                <p className="mt-1 truncate text-sm font-medium">{t.subject}</p>
                <p className="truncate text-xs text-subtle">{t.messages[0]?.body}</p>
              </div>
              <span className="hidden shrink-0 text-xs text-subtle sm:block">{relativeTime(t.lastMessageAt)}</span>
              <ChevronRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}

      <section className="card p-6">
        <h3 className="heading-md mb-1">Abrir novo atendimento</h3>
        <p className="mb-5 text-sm text-muted">Dúvidas, problemas com um pedido ou suporte de produtos.</p>
        <NewTicketForm orders={orders.map((o) => o.number)} />
      </section>
    </div>
  );
}
