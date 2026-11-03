import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { AdminHeader } from "@/components/admin/ui";
import { ProductForm } from "../product-form";

export const metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  await requireAdminPage("products");
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return (
    <div>
      <AdminHeader title="Novo produto" back={{ href: "/admin/produtos", label: "Produtos" }} />
      <ProductForm categories={categories} />
    </div>
  );
}
