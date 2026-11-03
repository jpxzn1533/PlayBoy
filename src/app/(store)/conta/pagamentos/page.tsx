import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatDateTime, formatMoney, formatOrderNumber } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/payments";
import { EmptyState } from "@/components/ui/misc";
import { PaymentStatusBadge } from "@/components/store/status-badges";

export const metadata: Metadata = { title: "Histórico de pagamentos" };

export default async function PaymentsPage() {
  const user = await requireUserPage("/conta/pagamentos");
  const payments = await prisma.payment.findMany({
    where: { order: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { order: { select: { number: true } } },
  });

  if (payments.length === 0)
    return <EmptyState icon={<CreditCard className="h-5 w-5" />} title="Nenhum pagamento registrado" description="Seus pagamentos aparecerão aqui após a primeira compra." />;

  return (
    <div className="space-y-6">
      <h2 className="heading-md text-xl">Histórico de pagamentos</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-line text-left text-xs text-subtle">
            <tr>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium">Pedido</th>
              <th className="px-5 py-3 font-medium">Método</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-5 py-3.5 text-muted">{formatDateTime(p.createdAt)}</td>
                <td className="px-5 py-3.5">
                  <Link href={`/conta/pedidos/${p.order.number}`} className="font-mono hover:underline">{formatOrderNumber(p.order.number)}</Link>
                </td>
                <td className="px-5 py-3.5">{PAYMENT_METHOD_LABEL[p.method]}</td>
                <td className="px-5 py-3.5"><PaymentStatusBadge status={p.status} /></td>
                <td className="px-5 py-3.5 text-right font-medium">{formatMoney(p.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
