import { requireAdminPage } from "@/lib/auth/guards";
import { AdminHeader } from "@/components/admin/ui";
import { TicketList } from "@/components/admin/ticket-list";

export const metadata = { title: "Entrega de contas" };

export default async function DeliveryTicketsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("support");
  return (
    <div>
      <AdminHeader
        title="Entrega de contas"
        description="Pedidos pagos de produtos com entrega manual. Envie os dados pelo chat e marque como entregue (prazo: 24h a 48h)."
      />
      <TicketList type="DELIVERY" basePath="/admin/entregas" searchParams={await searchParams} />
    </div>
  );
}
