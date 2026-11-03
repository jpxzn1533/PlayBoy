import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { withRatings, productCardSelect } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { EmptyState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Favoritos" };

export default async function FavoritesPage() {
  const user = await requireUserPage("/conta/favoritos");
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id, product: { active: true } },
    orderBy: { createdAt: "desc" },
    select: { product: { select: productCardSelect } },
  });
  const products = await withRatings(favorites.map((f) => f.product));

  if (products.length === 0)
    return (
      <EmptyState
        icon={<Heart className="h-5 w-5" />}
        title="Sua lista de favoritos está vazia"
        description="Toque no coração dos produtos para salvá-los aqui."
        action={<LinkButton href="/produtos">Explorar produtos</LinkButton>}
      />
    );

  return (
    <div className="space-y-6">
      <h2 className="heading-md text-xl">Favoritos ({products.length})</h2>
      <ProductGrid products={products} favoriteIds={new Set(products.map((p) => p.id))} />
    </div>
  );
}
