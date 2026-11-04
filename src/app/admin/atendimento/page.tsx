import { requireAdminPage } from "@/lib/auth/guards";
import { AdminHeader } from "@/components/admin/ui";
import { TicketList } from "@/components/admin/ticket-list";

export const metadata = { title: "Atendimento" };

export default async function SupportTicketsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("support");
  return (
    <div>
      <AdminHeader title="Atendimento" description="Tickets abertos pelos clientes na área de atendimento da loja." />
      <TicketList type="SUPPORT" basePath="/admin/atendimento" searchParams={await searchParams} />
    </div>
  );
}
