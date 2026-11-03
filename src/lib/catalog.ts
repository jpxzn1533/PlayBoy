import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { finalPrice } from "./pricing";

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  priceCents: true,
  discountPercent: true,
  stock: true,
  platform: true,
  featured: true,
  salesCount: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export async function withRatings(products: CardRow[]) {
  if (products.length === 0) return [];
  const ratings = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: products.map((p) => p.id) }, approved: true },
    _avg: { rating: true },
    _count: true,
  });
  const map = new Map(ratings.map((r) => [r.productId, r]));
  return products.map((p) => ({
    ...p,
    image: p.images[0]?.url ?? null,
    finalCents: finalPrice(p),
    rating: map.get(p.id)?._avg.rating ?? 0,
    reviewCount: map.get(p.id)?._count ?? 0,
  }));
}

export type ProductCardData = Awaited<ReturnType<typeof withRatings>>[number];

export async function getProductCards(args: Prisma.ProductFindManyArgs) {
  const rows = (await prisma.product.findMany({ ...args, select: productCardSelect })) as CardRow[];
  return withRatings(rows);
}

/** Categorias visíveis na loja: ativas e com ao menos um produto ativo (evita listagens vazias). */
export const getActiveCategories = () =>
  prisma.category.findMany({
    where: { active: true, products: { some: { active: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

export const SORT_OPTIONS = {
  relevance: "Relevância",
  popular: "Mais populares",
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  newest: "Mais recentes",
} as const;
export type SortKey = keyof typeof SORT_OPTIONS;

export type CatalogQuery = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  sort?: SortKey;
  page: number;
  perPage: number;
  onSale?: boolean;
};

/**
 * Busca do catálogo. O filtro e a ordenação por preço usam o preço final (com desconto),
 * por isso são feitos em SQL parametrizado (os valores nunca são concatenados na query).
 */
export async function searchCatalog(query: CatalogQuery) {
  const conditions: Prisma.Sql[] = [Prisma.sql`p."active" = true`];
  if (query.q) {
    const term = `%${query.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(Prisma.sql`(p."name" ILIKE ${term} OR p."shortDescription" ILIKE ${term} OR p."platform" ILIKE ${term})`);
  }
  if (query.category) conditions.push(Prisma.sql`c."slug" = ${query.category}`);
  const priceExpr = Prisma.sql`ROUND(p."priceCents" * (100 - p."discountPercent") / 100.0)`;
  if (query.min !== undefined) conditions.push(Prisma.sql`${priceExpr} >= ${query.min}`);
  if (query.max !== undefined) conditions.push(Prisma.sql`${priceExpr} <= ${query.max}`);
  if (query.onSale) conditions.push(Prisma.sql`p."discountPercent" > 0`);
  const where = Prisma.join(conditions, " AND ");

  const orderBy = {
    relevance: Prisma.sql`p."featured" DESC, p."salesCount" DESC, p."createdAt" DESC`,
    popular: Prisma.sql`p."salesCount" DESC, p."createdAt" DESC`,
    "price-asc": Prisma.sql`${priceExpr} ASC, p."name" ASC`,
    "price-desc": Prisma.sql`${priceExpr} DESC, p."name" ASC`,
    newest: Prisma.sql`p."createdAt" DESC`,
  }[query.sort ?? "relevance"];

  const offset = (query.page - 1) * query.perPage;
  const [idRows, countRows] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT p."id" FROM "Product" p LEFT JOIN "Category" c ON c."id" = p."categoryId"
      WHERE ${where} ORDER BY ${orderBy} LIMIT ${query.perPage} OFFSET ${offset}`,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*)::bigint AS n FROM "Product" p LEFT JOIN "Category" c ON c."id" = p."categoryId" WHERE ${where}`,
  ]);
  const ids = idRows.map((r) => r.id);
  const cards = await getProductCards({ where: { id: { in: ids } } });
  const byId = new Map(cards.map((c) => [c.id, c]));
  const total = Number(countRows[0]?.n ?? 0);
  return {
    products: ids.map((id) => byId.get(id)!).filter(Boolean),
    total,
    totalPages: Math.max(1, Math.ceil(total / query.perPage)),
  };
}
