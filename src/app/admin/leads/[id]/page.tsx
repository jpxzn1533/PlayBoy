import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { LeadForm } from "../lead-form";

export const metadata = { title: "Lead" };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("leads");
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();
  const customer = await prisma.user.findUnique({ where: { email: lead.email }, select: { id: true, name: true } });

  return (
    <div className="max-w-3xl">
      <AdminHeader
        title={lead.name}
        description={`Entrou em ${formatDateTime(lead.createdAt)} via ${lead.source} · atualizado ${formatDateTime(lead.updatedAt)}`}
        back={{ href: "/admin/leads", label: "Leads" }}
      />
      {customer && (
        <p className="mb-4 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">
          Este lead possui conta na loja: <Link href={`/admin/clientes/${customer.id}`} className="underline">{customer.name}</Link>
        </p>
      )}
      <Panel><LeadForm lead={lead} /></Panel>
    </div>
  );
}
