import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { hasPermission, ALL_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { Toaster } from "@/components/store/toaster";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata: Metadata = { title: { default: "Painel administrativo", template: "%s · Admin PLAYBOY STORE" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  const [settings, pendingOrders, newLeads] = await Promise.all([
    getSettings(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.lead.count({ where: { status: "NEW" } }),
  ]);
  const allowed = ALL_PERMISSIONS.filter((p) => hasPermission(user, p));

  return (
    <div className="min-h-dvh lg:pl-64">
      <AdminSidebar
        storeName={settings.storeName}
        logoUrl={settings.logoUrl}
        allowed={allowed}
        user={{ name: user.name, email: user.email }}
        badges={{ orders: pendingOrders, leads: newLeads }}
      />
      <main className="px-4 pt-20 pb-16 sm:px-6 lg:px-10 lg:pt-10">{children}</main>
      <Toaster />
    </div>
  );
}
