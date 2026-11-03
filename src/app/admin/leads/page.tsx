import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { LEAD_STATUS_LABEL, LEAD_STATUSES } from "@/lib/leads";
import { firstParam } from "@/lib/utils";
import { AdminHeader, EmptyRow, FilterBar, Table, Td, Th } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/confirm-button";
import { LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { deleteLeadAction } from "../_actions/leads";
import { LeadStatusSelect } from "./lead-status-select";

export const metadata = { title: "Leads" };
const PER_PAGE = 20;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("leads");
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() ?? "";
  const status = firstParam(sp.status) ?? "";
  const origem = firstParam(sp.origem) ?? "";
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);

  const where: Prisma.LeadWhereInput = {
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { interest: { contains: q, mode: "insensitive" } }] }),
    ...(LEAD_STATUSES.includes(status as LeadStatus) && { status: status as LeadStatus }),
    ...(origem && { source: origem }),
  };

  const [leads, total, byStatus, bySource] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.lead.groupBy({ by: ["source"], _count: true, orderBy: { _count: { source: "desc" } } }),
  ]);

  const count = (s: LeadStatus) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const all = byStatus.reduce((s, b) => s + b._count, 0);
  const converted = count("CONVERTED");
  const closed = converted + count("LOST");
  const convRate = all ? (converted / all) * 100 : 0;
  const winRate = closed ? (converted / closed) * 100 : 0;

  return (
    <div>
      <AdminHeader
        title="Leads"
        description="Contatos capturados pela newsletter, formulário de contato e cadastros manuais."
        actions={<LinkButton href="/admin/leads/novo"><Plus className="h-4 w-4" /> Novo lead</LinkButton>}
      />

      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {LEAD_STATUSES.map((s) => (
          <Link
            key={s}
            href={status === s ? "/admin/leads" : `/admin/leads?status=${s}`}
            className={cn("card p-4 transition-colors hover:border-line-strong", status === s && "border-fg/50")}
          >
            <p className="text-xs text-muted">{LEAD_STATUS_LABEL[s]}</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{formatNumber(count(s))}</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-fg/80" style={{ width: `${all ? (count(s) / all) * 100 : 0}%` }} />
            </div>
          </Link>
        ))}
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-muted">Taxa de conversão</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatPercent(convRate)}</p>
          <p className="text-xs text-subtle">{converted} convertidos de {all} leads</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Taxa de ganho (negociações encerradas)</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatPercent(winRate)}</p>
          <p className="text-xs text-subtle">{converted} ganhos · {count("LOST")} perdidos</p>
        </div>
        <div className="card p-4">
          <p className="mb-2 text-xs text-muted">Leads por origem</p>
          <ul className="space-y-1 text-sm">
            {bySource.slice(0, 4).map((s) => (
              <li key={s.source} className="flex justify-between"><span className="text-muted">{s.source}</span><span className="tabular-nums">{s._count}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <FilterBar action="/admin/leads" resetHref="/admin/leads">
        <Input name="q" defaultValue={q} placeholder="Nome, e-mail ou interesse" className="w-64" aria-label="Buscar" />
        <Select name="status" defaultValue={status} className="w-44" aria-label="Etapa">
          <option value="">Todas as etapas</option>
          {LEAD_STATUSES.map((s) => (<option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>))}
        </Select>
        <Select name="origem" defaultValue={origem} className="w-44" aria-label="Origem">
          <option value="">Todas as origens</option>
          {bySource.map((s) => (<option key={s.source} value={s.source}>{s.source}</option>))}
        </Select>
      </FilterBar>

      <Table minWidth={960}>
        <thead><tr><Th>Lead</Th><Th>Origem</Th><Th>Interesse</Th><Th>Entrada</Th><Th>Etapa</Th><Th className="text-right">Ações</Th></tr></thead>
        <tbody>
          {leads.length === 0 && <EmptyRow colSpan={6} />}
          {leads.map((l) => (
            <tr key={l.id} className="hover:bg-white/[0.02]">
              <Td>
                <Link href={`/admin/leads/${l.id}`} className="font-medium hover:underline">{l.name}</Link>
                <p className="text-xs text-subtle">{l.email}</p>
              </Td>
              <Td className="text-muted">{l.source}</Td>
              <Td><p className="max-w-[260px] truncate text-muted">{l.interest ?? "—"}</p></Td>
              <Td className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</Td>
              <Td><LeadStatusSelect id={l.id} status={l.status} /></Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <Link href={`/admin/leads/${l.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-fg" aria-label="Editar"><Pencil className="h-4 w-4" /></Link>
                  <ActionButton action={deleteLeadAction.bind(null, l.id)} confirm={`Excluir o lead ${l.name}?`} size="icon" title="Excluir" className="hover:text-danger"><Trash2 className="h-4 w-4" /></ActionButton>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-6">
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/leads" params={{ q, status, origem }} />
      </div>
    </div>
  );
}
