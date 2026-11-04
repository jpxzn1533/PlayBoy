import Link from "next/link";
import { Pencil, Plus, Star, Trash2, ExternalLink } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatMoney, formatNumber } from "@/lib/format";
import { finalPrice } from "@/lib/pricing";
import { firstParam } from "@/lib/utils";
import { AdminHeader, EmptyRow, FilterBar, Table, Td, Th } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/confirm-button";
import { LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Badge, Pagination } from "@/components/ui/misc";
import { ProductImage } from "@/components/store/product-image";
import { deleteProductAction, toggleProductAction } from "../_actions/products";
import { StockAdjuster } from "./stock-adjuster";

export const metadata = { title: "Produtos" };
const PER_PAGE = 15;

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("products");
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() ?? "";
  const categoria = firstParam(sp.categoria) ?? "";
  const status = firstParam(sp.status) ?? "";
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);

  const where: Prisma.ProductWhereInput = {
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }),
    ...(categoria && { categoryId: categoria === "none" ? null : categoria }),
    ...(status === "active" && { active: true }),
    ...(status === "inactive" && { active: false }),
    ...(status === "featured" && { featured: true }),
    ...(status === "soldout" && { stock: 0 }),
    ...(status === "discount" && { discountPercent: { gt: 0 } }),
  };

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: { select: { name: true } }, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <AdminHeader
        title="Produtos"
        description={`${formatNumber(total)} produto(s) encontrados`}
        actions={<LinkButton href="/admin/produtos/novo"><Plus className="h-4 w-4" /> Novo produto</LinkButton>}
      />
      <FilterBar action="/admin/produtos" resetHref="/admin/produtos">
        <Input name="q" defaultValue={q} placeholder="Buscar por nome ou SKU" className="w-64" aria-label="Buscar" />
        <Select name="categoria" defaultValue={categoria} className="w-48" aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          <option value="none">Sem categoria</option>
        </Select>
        <Select name="status" defaultValue={status} className="w-44" aria-label="Status">
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="featured">Em destaque</option>
          <option value="discount">Com desconto</option>
          <option value="soldout">Esgotados</option>
        </Select>
      </FilterBar>

      <Table minWidth={980}>
        <thead>
          <tr>
            <Th>Produto</Th>
            <Th>Categoria</Th>
            <Th>Preço</Th>
            <Th>Estoque</Th>
            <Th>Vendas</Th>
            <Th>Status</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && <EmptyRow colSpan={7} />}
          {products.map((p) => (
            <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
              <Td>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-surface-2"><ProductImage src={p.images[0]?.url} alt="" /></div>
                  <div className="min-w-0">
                    <Link href={`/admin/produtos/${p.id}`} className="block max-w-[260px] truncate font-medium hover:underline">{p.name}</Link>
                    <p className="text-xs text-subtle">{p.sku ?? "sem SKU"}{p.platform && ` · ${p.platform}`}</p>
                  </div>
                </div>
              </Td>
              <Td className="text-muted">{p.category?.name ?? "—"}</Td>
              <Td>
                <p className="font-medium tabular-nums">{formatMoney(finalPrice(p))}</p>
                {p.discountPercent > 0 && <p className="text-xs text-subtle"><span className="line-through">{formatMoney(p.priceCents)}</span> · -{p.discountPercent}%</p>}
              </Td>
              <Td><StockAdjuster id={p.id} stock={p.stock} /></Td>
              <Td className="tabular-nums text-muted">{formatNumber(p.salesCount)}</Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  <ActionButton action={toggleProductAction.bind(null, p.id, "active")} variant="ghost" className="h-auto px-0 hover:bg-transparent" title={p.active ? "Desativar" : "Ativar"}>
                    <Badge tone={p.active ? "success" : "neutral"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                  </ActionButton>
                  {p.featured && <Badge tone="solid">Destaque</Badge>}
                  {p.manualDelivery && <Badge tone="warning">Entrega manual</Badge>}
                </div>
              </Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <ActionButton action={toggleProductAction.bind(null, p.id, "featured")} size="icon" title={p.featured ? "Remover dos destaques" : "Destacar na página inicial"}>
                    <Star className={p.featured ? "h-4 w-4 fill-fg text-fg" : "h-4 w-4"} />
                  </ActionButton>
                  <Link href={`/produto/${p.slug}`} target="_blank" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-fg" title="Ver na loja" aria-label="Ver na loja"><ExternalLink className="h-4 w-4" /></Link>
                  <Link href={`/admin/produtos/${p.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-fg" title="Editar" aria-label="Editar"><Pencil className="h-4 w-4" /></Link>
                  <ActionButton action={deleteProductAction.bind(null, p.id)} confirm={`Excluir "${p.name}"? Esta ação não pode ser desfeita.`} size="icon" title="Excluir" className="hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </ActionButton>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-6">
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/produtos" params={{ q, categoria, status }} />
      </div>
    </div>
  );
}
