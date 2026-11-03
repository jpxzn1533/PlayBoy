"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { categorySchema, formToObject, zodErrors, type ActionState } from "@/lib/validation";
import { adminGuard, DENIED, isUniqueViolation } from "./guard";

const refresh = () => {
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
};

export async function saveCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await adminGuard("categories");
  if (!user) return DENIED;
  const id = String(formData.get("id") ?? "") || null;
  const parsed = categorySchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const data = { ...parsed.data, slug: parsed.data.slug || slugify(parsed.data.name) };
  try {
    if (id) {
      await prisma.category.update({ where: { id }, data });
      await audit(user.id, "update", "Categoria", id, { name: data.name });
    } else {
      const c = await prisma.category.create({ data });
      await audit(user.id, "create", "Categoria", c.id, { name: data.name });
    }
  } catch (e) {
    if (isUniqueViolation(e, "slug")) return { ok: false, fieldErrors: { slug: ["Slug já utilizado por outra categoria."] }, error: "Revise os campos destacados." };
    throw e;
  }
  refresh();
  return { ok: true, message: id ? "Categoria atualizada." : "Categoria criada." };
}

export async function deleteCategoryAction(id: string): Promise<ActionState> {
  const user = await adminGuard("categories");
  if (!user) return DENIED;
  const cat = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!cat) return { ok: false, error: "Categoria não encontrada." };
  await prisma.category.delete({ where: { id } });
  await audit(user.id, "delete", "Categoria", id, { name: cat.name, produtosDesvinculados: cat._count.products });
  refresh();
  return { ok: true, message: cat._count.products ? `Categoria excluída. ${cat._count.products} produto(s) ficaram sem categoria.` : "Categoria excluída." };
}

/** Move a categoria uma posição para cima/baixo, normalizando a ordem de exibição. */
export async function moveCategoryAction(id: string, direction: "up" | "down"): Promise<ActionState> {
  const user = await adminGuard("categories");
  if (!user) return DENIED;
  const all = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
  const idx = all.findIndex((c) => c.id === id);
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || target < 0 || target >= all.length) return { ok: true };
  [all[idx], all[target]] = [all[target], all[idx]];
  await prisma.$transaction(all.map((c, i) => prisma.category.update({ where: { id: c.id }, data: { sortOrder: i } })));
  await audit(user.id, "reorder", "Categoria", id, { direction });
  refresh();
  return { ok: true };
}
