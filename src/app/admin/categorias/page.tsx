import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { firstParam } from "@/lib/utils";
import { AdminHeader, EmptyRow, Panel, Table, Td, Th } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/confirm-button";
import { Badge } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { deleteCategoryAction, moveCategoryAction } from "../_actions/categories";
import { CategoryForm } from "./category-form";

export const metadata = { title: "Categorias" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("categories");
  const editId = firstParam((await searchParams).editar);
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  const editing = editId ? categories.find((c) => c.id === editId) : undefined;

  return (
    <div>
      <AdminHeader
        title="Categorias"
        description="Organize o catálogo e a ordem de exibição na loja."
        actions={editing && <LinkButton href="/admin/categorias" variant="outline"><Plus className="h-4 w-4" /> Nova categoria</LinkButton>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Table minWidth={620}>
          <thead>
            <tr><Th>Ordem</Th><Th>Categoria</Th><Th>Produtos</Th><Th>Status</Th><Th className="text-right">Ações</Th></tr>
          </thead>
          <tbody>
            {categories.length === 0 && <EmptyRow colSpan={5} text="Nenhuma categoria cadastrada." />}
            {categories.map((c, i) => (
              <tr key={c.id} className={editing?.id === c.id ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}>
                <Td>
                  <div className="flex gap-0.5">
                    <ActionButton action={moveCategoryAction.bind(null, c.id, "up")} size="icon" title="Mover para cima" className={i === 0 ? "invisible" : ""}><ArrowUp className="h-3.5 w-3.5" /></ActionButton>
                    <ActionButton action={moveCategoryAction.bind(null, c.id, "down")} size="icon" title="Mover para baixo" className={i === categories.length - 1 ? "invisible" : ""}><ArrowDown className="h-3.5 w-3.5" /></ActionButton>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-12 shrink-0 overflow-hidden rounded-md bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.imageUrl && <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-subtle">/{c.slug}</p>
                    </div>
                  </div>
                </Td>
                <Td><Link href={`/admin/produtos?categoria=${c.id}`} className="tabular-nums hover:underline">{c._count.products}</Link></Td>
                <Td><Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Ativa" : "Oculta"}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/categorias?editar=${c.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-fg" aria-label="Editar"><Pencil className="h-4 w-4" /></Link>
                    <ActionButton
                      action={deleteCategoryAction.bind(null, c.id)}
                      confirm={`Excluir a categoria "${c.name}"?${c._count.products ? ` ${c._count.products} produto(s) ficarão sem categoria.` : ""}`}
                      size="icon"
                      title="Excluir"
                      className="hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ActionButton>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Panel title={editing ? `Editar “${editing.name}”` : "Nova categoria"} className="h-fit">
          <CategoryForm key={editing?.id ?? "new"} category={editing} nextOrder={categories.length} />
        </Panel>
      </div>
    </div>
  );
}
