import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatMoney, formatNumber } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import { AdminHeader } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { ProductForm } from "../product-form";

export const metadata = { title: "Editar produto" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("products");
  const { id } = await params;
  const [product, categories, revenue] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } } } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.orderItem.aggregate({ where: { productId: id, order: { paymentStatus: "PAID" } }, _sum: { totalCents: true } }),
  ]);
  if (!product) notFound();
  const created = firstParam((await searchParams).criado) === "1";

  return (
    <div>
      <AdminHeader
        title={product.name}
        description={`${formatNumber(product.salesCount)} unidade(s) vendidas · ${formatMoney(revenue._sum.totalCents ?? 0)} em receita`}
        back={{ href: "/admin/produtos", label: "Produtos" }}
        actions={
          <Link href={`/produto/${product.slug}`} target="_blank" className={buttonClass("outline")}>
            <ExternalLink className="h-4 w-4" /> Ver na loja
          </Link>
        }
      />
      {created && <FormMessage state={{ ok: true, message: "Produto cadastrado com sucesso." }} className="mb-6" />}
      <ProductForm
        categories={categories}
        product={{
          ...product,
          specs: (Array.isArray(product.specs) ? product.specs : []) as { label: string; value: string }[],
          images: product.images.map((i) => i.url),
        }}
      />
    </div>
  );
}
