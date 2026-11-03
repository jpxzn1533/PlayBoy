import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import { Stars } from "@/components/ui/misc";
import { AddToCartButton } from "./add-to-cart-button";
import { FavoriteButton } from "./favorite-button";
import { ProductImage } from "./product-image";

export function ProductCard({ product, favorited = false }: { product: ProductCardData; favorited?: boolean }) {
  const soldOut = product.stock <= 0;
  return (
    <article className="group card relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)]">
      <Link href={`/produto/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-surface-2">
        <ProductImage src={product.image} alt={product.name} className="transition-transform duration-500 group-hover:scale-[1.04]" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.discountPercent > 0 && (
            <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-fg">-{product.discountPercent}%</span>
          )}
          {soldOut && <span className="rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-muted backdrop-blur">Esgotado</span>}
        </div>
      </Link>
      <div className="absolute top-3 right-3">
        <FavoriteButton productId={product.id} initial={favorited} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-subtle">
          <span className="truncate uppercase tracking-wider">{product.category?.name ?? "PLAYBOY STORE"}</span>
          {product.platform && <span className="shrink-0 rounded border border-line px-1.5 py-px">{product.platform}</span>}
        </div>
        <Link href={`/produto/${product.slug}`} className="line-clamp-2 font-medium leading-snug text-fg transition-colors hover:text-white">
          {product.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{product.shortDescription}</p>
        {product.reviewCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
            <Stars value={product.rating} size={12} />
            <span>({product.reviewCount})</span>
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            {product.discountPercent > 0 && <p className="text-xs text-subtle line-through">{formatMoney(product.priceCents)}</p>}
            <p className="font-display text-lg font-semibold">{formatMoney(product.finalCents)}</p>
          </div>
          <AddToCartButton productId={product.id} disabled={soldOut} compact />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, favoriteIds }: { products: ProductCardData[]; favoriteIds?: Set<string> }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProductCard product={p} favorited={favoriteIds?.has(p.id)} />
        </div>
      ))}
    </div>
  );
}
