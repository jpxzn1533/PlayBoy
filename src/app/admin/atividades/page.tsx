import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import { AdminHeader, EmptyRow, FilterBar, Table, Td, Th } from "@/components/admin/ui";
import { Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/misc";

export const metadata = { title: "Registro de atividades" };
const PER_PAGE = 30;

const ACTION_LABEL: Record<string, string> = {
  create: "Criou",
  update: "Atualizou",
  delete: "Excluiu",
  activate: "Ativou",
  deactivate: "Desativou",
  feature: "Destacou",
  unfeature: "Removeu destaque",
  stock: "Ajustou estoque",
  status: "Alterou status",
  confirm_payment: "Confirmou pagamento",
  suspend: "Suspendeu",
  reactivate: "Reativou",
  verify_email: "Verificou e-mail",
  grant_admin: "Concedeu acesso admin",
  revoke_admin: "Revogou acesso admin",
  update_permissions: "Alterou permissões",
  reorder: "Reordenou",
  upload: "Enviou arquivo",
  hide: "Ocultou",
  approve: "Publicou",
};

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("logs");
  const sp = await searchParams;
  const entidade = firstParam(sp.entidade) ?? "";
  const usuario = firstParam(sp.usuario) ?? "";
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);
  const where: Prisma.AuditLogWhereInput = { ...(entidade && { entity: entidade }), ...(usuario && { userId: usuario }) };

  const [logs, total, entities, admins] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { name: true, email: true } } } }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
    prisma.user.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <AdminHeader title="Registro de atividades" description="Auditoria de todas as ações administrativas realizadas no painel." />
      <FilterBar action="/admin/atividades" resetHref="/admin/atividades">
        <Select name="entidade" defaultValue={entidade} className="w-48" aria-label="Área">
          <option value="">Todas as áreas</option>
          {entities.map((e) => (<option key={e.entity} value={e.entity}>{e.entity}</option>))}
        </Select>
        <Select name="usuario" defaultValue={usuario} className="w-48" aria-label="Administrador">
          <option value="">Todos os administradores</option>
          {admins.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
        </Select>
      </FilterBar>
      <Table minWidth={860}>
        <thead><tr><Th>Data</Th><Th>Administrador</Th><Th>Ação</Th><Th>Área</Th><Th>Detalhes</Th><Th>IP</Th></tr></thead>
        <tbody>
          {logs.length === 0 && <EmptyRow colSpan={6} />}
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-white/[0.02]">
              <Td className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</Td>
              <Td>{l.user ? <><p>{l.user.name}</p><p className="text-xs text-subtle">{l.user.email}</p></> : <span className="text-subtle">Sistema</span>}</Td>
              <Td className="font-medium">{ACTION_LABEL[l.action] ?? l.action}</Td>
              <Td className="text-muted">{l.entity}</Td>
              <Td><code className="block max-w-[320px] truncate text-xs text-subtle">{l.details ? JSON.stringify(l.details) : l.entityId ?? "—"}</code></Td>
              <Td className="font-mono text-xs text-subtle">{l.ip ?? "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-6"><Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/atividades" params={{ entidade, usuario }} /></div>
    </div>
  );
}
