import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatDate, formatMoney } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import { VerifyEmailNotice } from "@/components/store/verify-email-notice";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUserPage("/conta");
  const welcome = firstParam((await searchParams).bemvindo) === "1";
  const [orders, paid, favorites] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.order.aggregate({ where: { userId: user.id, paymentStatus: "PAID" }, _sum: { totalCents: true } }),
    prisma.favorite.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      {welcome && (
        <div className="flex items-center gap-3 rounded-xl border border-line-strong bg-surface-2 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-success" />
          Conta criada com sucesso. Bem-vindo à PLAYBOY STORE!
        </div>
      )}
      {!user.emailVerifiedAt && <VerifyEmailNotice email={user.email} />}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Pedidos", value: String(orders), href: "/conta/pedidos" },
          { label: "Total investido", value: formatMoney(paid._sum.totalCents ?? 0), href: "/conta/pagamentos" },
          { label: "Favoritos", value: String(favorites), href: "/conta/favoritos" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition-colors hover:border-line-strong">
            <p className="text-xs text-subtle">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{s.value}</p>
          </Link>
        ))}
      </div>

      <section className="card p-6">
        <h2 className="heading-md">Dados pessoais</h2>
        <p className="mt-1 mb-6 text-sm text-muted">Cliente desde {formatDate(user.createdAt)}</p>
        <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone, verified: !!user.emailVerifiedAt }} />
      </section>
    </div>
  );
}
