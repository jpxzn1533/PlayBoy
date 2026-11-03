import type { Metadata } from "next";
import { Monitor } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { getCurrentSessionId } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { revokeOtherSessionsAction, revokeSessionAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Segurança" };

function describeAgent(ua: string | null) {
  if (!ua) return "Dispositivo desconhecido";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser}${os ? ` · ${os}` : ""}`;
}

export default async function SecurityPage() {
  const user = await requireUserPage("/conta/seguranca");
  const [sessions, currentId] = await Promise.all([
    prisma.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    getCurrentSessionId(),
  ]);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="heading-md">Alterar senha</h2>
        <p className="mt-1 mb-6 text-sm text-muted">Ao alterar a senha, as demais sessões ativas serão encerradas.</p>
        <ChangePasswordForm />
      </section>

      <section className="card p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="heading-md">Sessões ativas</h2>
            <p className="mt-1 text-sm text-muted">Dispositivos conectados à sua conta.</p>
          </div>
          {sessions.length > 1 && (
            <form action={revokeOtherSessionsAction}>
              <button className={buttonClass("outline", "sm")}>Encerrar outras sessões</button>
            </form>
          )}
        </div>
        <ul className="divide-y divide-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-4 py-3.5">
              <Monitor className="h-5 w-5 text-subtle" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {describeAgent(s.userAgent)} {s.id === currentId && <Badge tone="success">Atual</Badge>}
                </p>
                <p className="text-xs text-subtle">Último acesso {formatDateTime(s.lastSeenAt)} · IP {s.ip ?? "—"}</p>
              </div>
              {s.id !== currentId && (
                <form action={revokeSessionAction}>
                  <input type="hidden" name="sessionId" value={s.id} />
                  <button className={buttonClass("ghost", "sm")}>Encerrar</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
