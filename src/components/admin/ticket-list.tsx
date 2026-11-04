import Link from "next/link";
import type { Prisma, TicketType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatTicketNumber } from "@/lib/tickets";
import { formatOrderNumber, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyRow, FilterBar, Table, Td, Th } from "@/components/admin/ui";
import { Input } from "@/components/ui/form";
import { Pagination } from "@/components/ui/misc";
import { TicketStatusBadge } from "@/components/tickets/badges";

const PER_PAGE = 25;

/** Abas de status. "pendentes" = o que exige ação da equipe. */
const TABS = {
  pendentes: "Pendentes",
  respondidos: "Respondidos",
  encerrados: "Encerrados",
  todos: "Todos",
} as const;
type Tab = keyof typeof TABS;
const TAB_KEYS = Object.keys(TABS) as Tab[];

export async function TicketList({
  type,
  basePath,
  searchParams,
}: {
  type: TicketType;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const tab = (first(searchParams.aba) as Tab) in TABS ? (first(searchParams.aba) as Tab) : "pendentes";
  const q = first(searchParams.q)?.trim() ?? "";
  const page = Math.max(1, Number(first(searchParams.page)) || 1);
  const isDelivery = type === "DELIVERY";

  const statusFilter: Record<Tab, Prisma.TicketWhereInput> = {
    // Entrega: pendente até ser marcada como entregue. Atendimento: aguardando a equipe.
    pendentes: isDelivery ? { status: { not: "CLOSED" } } : { status: "OPEN" },
    respondidos: { status: "WAITING_CUSTOMER" },
    encerrados: { status: "CLOSED" },
    todos: {},
  };
  const numberQuery = Number(q.replace(/^#|^PB-?/i, ""));
  const where: Prisma.TicketWhereInput = {
    type,
    ...statusFilter[tab],
    ...(q && {
      OR: [
        ...(Number.isInteger(numberQuery) && numberQuery > 0 ? [{ number: numberQuery }, { order: { number: numberQuery } }] : []),
        { subject: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };

  const [tickets, total, counts] = await Promise.all([
    prisma.ticket.findMany({
      where,
      // Mais antigos primeiro nas pendências (fila de atendimento); recentes nas demais abas.
      orderBy: tab === "pendentes" ? { lastMessageAt: "asc" } : { lastMessageAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { number: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromStaff: true } },
      },
    }),
    prisma.ticket.count({ where }),
    Promise.all((Object.keys(TABS) as Tab[]).map((t) => prisma.ticket.count({ where: { type, ...statusFilter[t] } }))),
  ]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
        {(Object.keys(TABS) as Tab[])
          .filter((t) => !(isDelivery && t === "respondidos"))
          .map((t) => (
            <Link
              key={t}
              href={`${basePath}?aba=${t}`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors",
                tab === t ? "bg-white/10 font-medium text-fg" : "text-muted hover:text-fg",
              )}
            >
              {TABS[t]}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] tabular-nums",
                  t === "pendentes" && counts[TAB_KEYS.indexOf(t)] > 0 ? "bg-warning/20 text-warning" : "bg-surface-3 text-subtle",
                )}
              >
                {counts[TAB_KEYS.indexOf(t)]}
              </span>
            </Link>
          ))}
      </div>

      <FilterBar action={basePath} resetHref={`${basePath}?aba=${tab}`}>
        <input type="hidden" name="aba" value={tab} />
        <Input name="q" defaultValue={q} placeholder="Nº do ticket, pedido, cliente ou e-mail" className="w-72" aria-label="Buscar" />
      </FilterBar>

      <Table minWidth={860}>
        <thead>
          <tr>
            <Th>Ticket</Th>
            <Th>Cliente</Th>
            <Th>{isDelivery ? "Pedido / produtos" : "Assunto"}</Th>
            <Th>Última mensagem</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 && <EmptyRow colSpan={5} text={tab === "pendentes" ? "Nenhuma pendência. Tudo em dia!" : "Nenhum ticket encontrado."} />}
          {tickets.map((t) => {
            const last = t.messages[0];
            const awaitingStaff = last && !last.fromStaff && t.status !== "CLOSED";
            return (
              <tr key={t.id} className={cn("transition-colors hover:bg-white/[0.02]", awaitingStaff && "bg-warning/[0.03]")}>
                <Td>
                  <Link href={`/admin/atendimento/${t.number}`} className="font-mono text-xs font-semibold hover:underline">
                    {formatTicketNumber(t.number)}
                  </Link>
                </Td>
                <Td>
                  <p className="max-w-[180px] truncate">{t.user.name}</p>
                  <p className="max-w-[180px] truncate text-xs text-subtle">{t.user.email}</p>
                </Td>
                <Td>
                  <Link href={`/admin/atendimento/${t.number}`} className="block max-w-[300px] truncate hover:underline">
                    {t.subject}
                  </Link>
                  {isDelivery && t.order && <p className="text-xs text-subtle">{formatOrderNumber(t.order.number)}</p>}
                </Td>
                <Td>
                  <p className="max-w-[220px] truncate text-xs text-muted">
                    {last ? `${last.fromStaff ? "Equipe: " : "Cliente: "}${last.body}` : "—"}
                  </p>
                  <p className={cn("text-xs", awaitingStaff ? "font-medium text-warning" : "text-subtle")}>
                    {relativeTime(t.lastMessageAt)}
                    {awaitingStaff && " · aguardando resposta"}
                  </p>
                </Td>
                <Td>
                  <TicketStatusBadge status={t.status} type={t.type} delivered={!!t.deliveredAt} />
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div className="mt-6">
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath={basePath} params={{ aba: tab, q: q || undefined }} />
      </div>
    </div>
  );
}
