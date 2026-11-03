"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { productSchema, formToObject, zodErrors, type ActionState } from "@/lib/validation";
import { adminGuard, DENIED, isUniqueViolation } from "./guard";

const refresh = () => {
  revalidatePath("/admin/produtos");
  revalidatePath("/", "layout");
};

export async function saveProductAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await adminGuard("products");
  if (!user) return DENIED;
  const id = String(formData.get("id") ?? "") || null;
  const raw = { ...formToObject(formData), images: formData.getAll("images").map(String).filter(Boolean) };
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return zodErrors(parsed.error);
  const { images, price, slug, ...d } = parsed.data;

  if (d.categoryId && !(await prisma.category.findUnique({ where: { id: d.categoryId }, select: { id: true } })))
    return { ok: false, fieldErrors: { categoryId: ["Categoria inválida."] }, error: "Revise os campos destacados." };

  const data = {
    ...d,
    slug: slug || slugify(d.name),
    priceCents: price,
    specs: d.specs,
  };

  try {
    let productId: string;
    if (id) {
      await prisma.$transaction([
        prisma.product.update({ where: { id }, data }),
        prisma.productImage.deleteMany({ where: { productId: id } }),
        prisma.productImage.createMany({ data: images.map((url, i) => ({ productId: id, url, sortOrder: i })) }),
      ]);
      productId = id;
      await audit(user.id, "update", "Produto", id, { name: data.name, priceCents: data.priceCents, stock: data.stock, active: data.active });
    } else {
      const created = await prisma.product.create({
        data: { ...data, images: { create: images.map((url, i) => ({ url, sortOrder: i })) } },
      });
      productId = created.id;
      await audit(user.id, "create", "Produto", created.id, { name: data.name });
    }
    refresh();
    if (!id) redirect(`/admin/produtos/${productId}?criado=1`);
    return { ok: true, message: "Produto salvo com sucesso." };
  } catch (e) {
    if (isUniqueViolation(e, "slug")) return { ok: false, fieldErrors: { slug: ["Já existe um produto com este slug."] }, error: "Revise os campos destacados." };
    if (isUniqueViolation(e, "sku")) return { ok: false, fieldErrors: { sku: ["Já existe um produto com este SKU."] }, error: "Revise os campos destacados." };
    throw e;
  }
}

export async function toggleProductAction(id: string, field: "active" | "featured"): Promise<ActionState> {
  const user = await adminGuard("products");
  if (!user) return DENIED;
  const product = await prisma.product.findUnique({ where: { id }, select: { active: true, featured: true, name: true } });
  if (!product) return { ok: false, error: "Produto não encontrado." };
  const value = !product[field];
  await prisma.product.update({ where: { id }, data: { [field]: value } });
  await audit(user.id, field === "active" ? (value ? "activate" : "deactivate") : value ? "feature" : "unfeature", "Produto", id, { name: product.name });
  refresh();
  const labels = { active: value ? "ativado" : "desativado", featured: value ? "destacado na página inicial" : "removido dos destaques" };
  return { ok: true, message: `Produto ${labels[field]}.` };
}

export async function deleteProductAction(id: string): Promise<ActionState> {
  const user = await adminGuard("products");
  if (!user) return DENIED;
  const product = await prisma.product.findUnique({ where: { id }, select: { name: true } });
  if (!product) return { ok: false, error: "Produto não encontrado." };
  // Itens de pedidos antigos mantêm nome e preço (productId vira null), preservando o histórico.
  await prisma.product.delete({ where: { id } });
  await audit(user.id, "delete", "Produto", id, { name: product.name });
  refresh();
  return { ok: true, message: "Produto excluído." };
}

export async function adjustStockAction(id: string, delta: number): Promise<ActionState> {
  const user = await adminGuard("products");
  if (!user) return DENIED;
  const d = Math.trunc(delta);
  if (!d || Math.abs(d) > 100000) return { ok: false, error: "Quantidade inválida." };
  const updated = await prisma.product.updateMany({ where: { id, stock: { gte: Math.max(0, -d) } }, data: { stock: { increment: d } } });
  if (updated.count === 0) return { ok: false, error: "O estoque não pode ficar negativo." };
  await audit(user.id, "stock", "Produto", id, { delta: d });
  refresh();
  return { ok: true, message: "Estoque atualizado." };
}
