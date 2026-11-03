import { requireAdminPage } from "@/lib/auth/guards";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { LeadForm } from "../lead-form";

export const metadata = { title: "Novo lead" };

export default async function NewLeadPage() {
  await requireAdminPage("leads");
  return (
    <div className="max-w-3xl">
      <AdminHeader title="Novo lead" back={{ href: "/admin/leads", label: "Leads" }} />
      <Panel><LeadForm /></Panel>
    </div>
  );
}
