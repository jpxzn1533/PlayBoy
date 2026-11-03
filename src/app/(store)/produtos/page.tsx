import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal, SearchX, X } from "lucide-react";
import { getActiveCategories, searchCatalog, type SortKey } from "@/lib/catalog";
import { getFavoriteIds } from "@/lib/favorites";
import { parseMoneyToCents } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import { ProductGrid } from "@/components/store/product-card";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form";
import { SortSelect } from "./sort-select";

export const metadata: Metadata = { title: "Catálogo de produtos" };

const ORDER_PARAM: Record<string, SortKey> = {
  relevancia: "relevance",
  popular: "popular",
  "menor-preco": "price-asc",
  "maior-preco": "price-desc",
  recentes: "newest",
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function CatalogPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim().slice(0, 80) || undefined;
  const categoria = firstParam(sp.categoria) || undefined;
  const ordem = firstParam(sp.ordem) ?? "relevancia";
  const ofertas = firstParam(sp.ofertas) === "1";
  const minRaw = firstParam(sp.min) ?? "";
  const maxRaw = firstParam(sp.max) ?? "";
  const min = minRaw ? parseMoneyToCents(minRaw) : NaN;
  const max = maxRaw ? parseMoneyToCents(maxRaw) : NaN;
  const page = Math.max(1, Math.min(500, Number(firstParam(sp.page)) || 1));

  const [categories, result, favoriteIds] = await Promise.all([
    getActiveCategories(),
    searchCatalog({
      q,
      category: categoria,
      min: Number.isFinite(min) ? min : undefined,
      max: Number.isFinite(max) ? max : undefined,
      sort: ORDER_PARAM[ordem] ?? "relevance",
      onSale: ofertas,
      page,
      perPage: 12,
    }),
    getFavoriteIds(),
  ]);

  const activeCategory = categories.find((c) => c.slug === categoria);
  const params = { q, categoria, ordem: ordem === "relevancia" ? undefined : ordem, min: minRaw || undefined, max: maxRaw || undefined, ofertas: ofertas ? "1" : undefined };
  const hasFilters = !!(q || categoria || minRaw || maxRaw || ofertas);
  const title = q ? `Resultados para “${q}”` : ofertas ? "Ofertas especiais" : activeCategory?.name ?? "Todos os produtos";

  const filters = (
    <form action="/produtos" className="space-y-7">
      {q && <input type="hidden" name="q" value={q} />}
      {ordem !== "relevancia" && <input type="hidden" name="ordem" value={ordem} />}
      <div>
        <p className="eyebrow mb-3">Categorias</p>
        <div className="space-y-1">
          <CategoryOption label="Todas" value="" checked={!categoria} />
          {categories.map((c) => (
            <CategoryOption key={c.id} label={c.name} value={c.slug} checked={categoria === c.slug} />
          ))}
        </div>
      </div>
      <div>
        <p className="eyebrow mb-3">Faixa de preço (R$)</p>
        <div className="flex items-center gap-2">
          <input name="min" defaultValue={minRaw} inputMode="decimal" placeholder="Mín." aria-label="Preço mínimo" className={inputClass} maxLength={10} />
          <span className="text-subtle">–</span>
          <input name="max" defaultValue={maxRaw} inputMode="decimal" placeholder="Máx." aria-label="Preço máximo" className={inputClass} maxLength={10} />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
        <input type="checkbox" name="ofertas" value="1" defaultChecked={ofertas} className="h-4 w-4 accent-white" />
        Somente ofertas
      </label>
      <div className="flex gap-2">
        <button type="submit" className={buttonClass("primary", "md", "flex-1")}>Aplicar filtros</button>
        {hasFilters && (
          <Link href="/produtos" className={buttonClass("outline", "md")}>Limpar</Link>
        )}
      </div>
    </form>
  );

  return (
    <div className="container-pb pt-10">
      <nav className="mb-4 text-xs text-subtle" aria-label="Trilha">
        <Link href="/" className="hover:text-fg">Início</Link> <span className="mx-1.5">/</span>
        <Link href="/produtos" className="hover:text-fg">Produtos</Link>
        {activeCategory && (<><span className="mx-1.5">/</span><span className="text-muted">{activeCategory.name}</span></>)}
      </nav>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-lg">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {result.total} {result.total === 1 ? "produto encontrado" : "produtos encontrados"}
            {activeCategory?.description && ` · ${activeCategory.description}`}
          </p>
        </div>
        <SortSelect value={ordem} />
      </div>

      {hasFilters && (
        <div className="mb-6 flex flex-wrap gap-2">
          {q && <FilterChip label={`Busca: ${q}`} href={hrefWithout(params, "q")} />}
          {activeCategory && <FilterChip label={activeCategory.name} href={hrefWithout(params, "categoria")} />}
          {(minRaw || maxRaw) && <FilterChip label={`R$ ${minRaw || "0"} – ${maxRaw || "∞"}`} href={hrefWithout(params, "min", "max")} />}
          {ofertas && <FilterChip label="Ofertas" href={hrefWithout(params, "ofertas")} />}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-36">{filters}</div>
        </aside>
        <details className="card group lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </summary>
          <div className="border-t border-line p-4">{filters}</div>
        </details>

        <div className="space-y-10">
          {result.products.length > 0 ? (
            <ProductGrid products={result.products} favoriteIds={favoriteIds} />
          ) : (
            <EmptyState
              icon={<SearchX className="h-5 w-5" />}
              title="Nenhum produto encontrado"
              description="Tente outros termos de busca ou remova alguns filtros."
              action={<Link href="/produtos" className={buttonClass("outline")}>Ver todos os produtos</Link>}
            />
          )}
          <Pagination page={page} totalPages={result.totalPages} basePath="/produtos" params={params} />
        </div>
      </div>
    </div>
  );
}

function hrefWithout(params: Record<string, string | undefined>, ...keys: string[]) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && !keys.includes(k)) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `/produtos?${qs}` : "/produtos";
}

function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 px-3 py-1 text-xs text-fg transition-colors hover:border-fg/40">
      {label} <X className="h-3 w-3 text-muted" />
    </Link>
  );
}

function CategoryOption({ label, value, checked }: { label: string; value: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg has-[:checked]:text-fg">
      <input type="radio" name="categoria" value={value} defaultChecked={checked} className="h-3.5 w-3.5 accent-white" />
      {label}
    </label>
  );
}
