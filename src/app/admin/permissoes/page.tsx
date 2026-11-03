import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { ADMIN_PERMISSIONS, SUPER } from "@/lib/permissions";
import { formatDate, relativeTime } from "@/lib/format";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/confirm-button";
import { Badge } from "@/components/ui/misc";
import { revokeAdminAction } from "../_actions/settings";
import { GrantAdminForm, PermissionsEditor } from "./forms";

export const metadata = { title: "Permissões administrativas" };

export default async function PermissionsPage() {
  const me = await requireAdminPage("admins");
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  const iAmSuper = me.permissions.includes(SUPER);

  return (
    <div>
      <AdminHeader title="Permissões administrativas" description="Defina quem acessa o painel e quais áreas cada administrador pode gerenciar." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {admins.map((a) => {
            const isSuper = a.permissions.includes(SUPER);
            const self = a.id === me.id;
            const canEdit = !self && (iAmSuper || !isSuper);
            return (
              <div key={a.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {a.name} {self && <Badge>Você</Badge>} {isSuper && <Badge tone="solid">Super admin</Badge>}
                    </p>
                    <p className="text-sm text-muted">{a.email}</p>
                    <p className="mt-1 text-xs text-subtle">Desde {formatDate(a.createdAt)} · ativo {a.lastActiveAt ? relativeTime(a.lastActiveAt) : "nunca"}</p>
                  </div>
                  {canEdit && (
                    <ActionButton action={revokeAdminAction.bind(null, a.id)} variant="danger" confirm={`Revogar o acesso administrativo de ${a.name}?`}>
                      Revogar acesso
                    </ActionButton>
                  )}
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  {canEdit ? (
                    <PermissionsEditor userId={a.id} current={a.permissions} canGrantSuper={iAmSuper} />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {isSuper ? <span className="text-sm text-muted">Acesso total a todas as áreas.</span> : a.permissions.map((p) => <Badge key={p}>{ADMIN_PERMISSIONS[p as keyof typeof ADMIN_PERMISSIONS] ?? p}</Badge>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Panel title="Adicionar administrador" description="A pessoa precisa ter uma conta na loja." className="h-fit">
          <GrantAdminForm canGrantSuper={iAmSuper} />
        </Panel>
      </div>
    </div>
  );
}
