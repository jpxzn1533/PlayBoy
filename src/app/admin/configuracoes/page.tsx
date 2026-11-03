import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { getPaymentProvider } from "@/lib/payments";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { NotificationsForm, StoreInfoForm, ThemeForm } from "./forms";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  await requireAdminPage("settings");
  const s = await getSettings();
  const provider = getPaymentProvider();
  return (
    <div>
      <AdminHeader title="Configurações da loja" description="Identidade, informações comerciais e notificações da PLAYBOY STORE." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Informações da loja e comerciais">
            <StoreInfoForm settings={s} />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Aparência" description="Logotipo e cores aplicados em toda a loja e no painel.">
            <ThemeForm settings={s} />
          </Panel>
          <Panel title="Notificações" description="Alertas enviados por e-mail para a equipe.">
            <NotificationsForm settings={s} />
          </Panel>
          <Panel title="Pagamentos">
            <p className="text-sm">Provedor ativo: <strong>{provider.label}</strong></p>
            <p className="mt-2 text-xs leading-relaxed text-subtle">
              Para integrar um provedor autorizado (Mercado Pago, Stripe, Pagar.me), implemente a interface em
              <code className="mx-1 rounded bg-surface-3 px-1">src/lib/payments</code> e defina <code className="rounded bg-surface-3 px-1">PAYMENT_PROVIDER</code> no ambiente.
              Webhook: <code className="rounded bg-surface-3 px-1">/api/payments/webhook/&lt;provedor&gt;</code>
            </p>
          </Panel>
          <Panel title="Mais configurações" bodyClassName="p-0">
            <ul className="divide-y divide-line text-sm">
              {[
                ["/admin/banners", "Banners da página inicial"],
                ["/admin/cupons", "Cupons de desconto"],
                ["/admin/permissoes", "Permissões administrativas"],
                ["/admin/emails", "E-mails enviados"],
                ["/admin/atividades", "Registro de atividades"],
              ].map(([href, label]) => (
                <li key={href}><Link href={href} className="block px-5 py-3 text-muted hover:bg-white/[0.02] hover:text-fg">{label} →</Link></li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
