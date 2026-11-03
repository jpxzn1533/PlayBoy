import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDate, formatMoney, formatNumber, relativeTime } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import { AdminHeader, EmptyRow, FilterBar, StatCard, Table, Td, Th } from "@/components/admin/ui";
import { Input, Select } from "@/components/ui/form";
import { Badge, Pagination } from "@/components/ui/misc";

export const metadata = { title: "Clientes" };
const PER_PAGE = 20;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("customers");
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim().slice(0, 80) ?? "";
  const status = firstParam(sp.status) ?? "";
  const ordem = firstParam(sp.ordem) ?? "recentes";
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);
  const offset = (page - 1) * PER_PAGE;

  // Consulta parametrizada (Prisma.sql): ordenar por total gasto exige agregação em SQL.
  const conditions: Prisma.Sql[] = [Prisma.sql`u."role" = 'CUSTOMER'`];
  if (q) {
    const term = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(Prisma.sql`(u."name" ILIKE ${term} OR u."email" ILIKE ${term})`);
  }
  if (status === "ACTIVE" || status === "SUSPENDED") conditions.push(Prisma.sql`u."status" = ${status}::"AccountStatus"`);
  if (status === "unverified") conditions.push(Prisma.sql`u."emailVerifiedAt" IS NULL`);
  const where = Prisma.join(conditions, " AND ");
  const orderBy = {
    recentes: Prisma.sql`u."createdAt" DESC`,
    atividade: Prisma.sql`u."lastActiveAt" DESC NULLS LAST`,
    nome: Prisma.sql`u."name" ASC`,
    gasto: Prisma.sql`spent DESC, u."createdAt" DESC`,
    compras: Prisma.sql`purchases DESC, u."createdAt" DESC`,
  }[ordem] ?? Prisma.sql`u."createdAt" DESC`;

  const [rows, countRows, totals] = await Promise.all([
    prisma.$queryRaw<{ id: string; name: string; email: string; createdAt: Date; lastActiveAt: Date | null; status: string; emailVerifiedAt: Date | null; purchases: bigint; spent: bigint }[]>`
      SELECT u."id", u."name", u."email", u."createdAt", u."lastActiveAt", u."status", u."emailVerifiedAt",
             COUNT(o."id") FILTER (WHERE o."paymentStatus" = 'PAID') AS purchases,
             COALESCE(SUM(o."totalCents") FILTER (WHERE o."paymentStatus" = 'PAID'), 0)::bigint AS spent
      FROM "User" u LEFT JOIN "Order" o ON o."userId" = u."id"
      WHERE ${where}
      GROUP BY u."id" ORDER BY ${orderBy} LIMIT ${PER_PAGE} OFFSET ${offset}`,
    prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "User" u WHERE ${where}`,
    Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
      prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(DISTINCT "userId")::bigint AS n FROM "Order" WHERE "paymentStatus" = 'PAID'`,
    ]),
  ]);
  const total = Number(countRows[0]?.n ?? 0);
  const [allCustomers, new30, buyers] = totals;

  return (
    <div>
      <AdminHeader title="Clientes" description="Base de clientes da PLAYBOY STORE." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total de clientes" value={formatNumber(allCustomers)} />
        <StatCard label="Novos (30 dias)" value={formatNumber(new30)} />
        <StatCard label="Clientes compradores" value={formatNumber(Number(buyers[0]?.n ?? 0))} hint={allCustomers ? `${((Number(buyers[0]?.n ?? 0) / allCustomers) * 100).toFixed(1).replace(".", ",")}% da base` : undefined} />
      </div>
      <FilterBar action="/admin/clientes" resetHref="/admin/clientes">
        <Input name="q" defaultValue={q} placeholder="Nome ou e-mail" className="w-64" aria-label="Buscar" />
        <Select name="status" defaultValue={status} className="w-48" aria-label="Status">
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="SUSPENDED">Suspensos</option>
          <option value="unverified">E-mail não verificado</option>
        </Select>
        <Select name="ordem" defaultValue={ordem} className="w-48" aria-label="Ordenar">
          <option value="recentes">Cadastro mais recente</option>
          <option value="atividade">Última atividade</option>
          <option value="gasto">Maior gasto</option>
          <option value="compras">Mais compras</option>
          <option value="nome">Nome (A–Z)</option>
        </Select>
      </FilterBar>
      <Table minWidth={900}>
        <thead>
          <tr><Th>Cliente</Th><Th>Cadastro</Th><Th>Compras</Th><Th>Total gasto</Th><Th>Última atividade</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={6} />}
          {rows.map((c) => (
            <tr key={c.id} className="transition-colors hover:bg-white/[0.02]">
              <Td>
                <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                <p className="text-xs text-subtle">{c.email}</p>
              </Td>
              <Td className="text-muted">{formatDate(c.createdAt)}</Td>
              <Td className="tabular-nums">{Number(c.purchases)}</Td>
              <Td className="font-medium tabular-nums">{formatMoney(Number(c.spent))}</Td>
              <Td className="text-muted">{c.lastActiveAt ? relativeTime(c.lastActiveAt) : "—"}</Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={c.status === "ACTIVE" ? "success" : "danger"}>{c.status === "ACTIVE" ? "Ativa" : "Suspensa"}</Badge>
                  {!c.emailVerifiedAt && <Badge tone="warning">Não verificado</Badge>}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-6">
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/clientes" params={{ q, status, ordem }} />
      </div>
    </div>
  );
}
