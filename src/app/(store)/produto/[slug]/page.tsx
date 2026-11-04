import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, MessageSquare, PackageCheck, ShieldCheck, XCircle, Zap } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getProductCards } from "@/lib/catalog";
import { getFavoriteIds } from "@/lib/favorites";
import { finalPrice } from "@/lib/pricing";
import { formatDate, formatMoney } from "@/lib/format";
import { ProductGrid } from "@/components/store/product-card";
import { FavoriteButton } from "@/components/store/favorite-button";
import { Badge, Stars } from "@/components/ui/misc";
import { ProductGallery } from "./gallery";
import { PurchaseBox } from "./purchase-box";
import { ReviewForm } from "./review-form";

type Props = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: { slug, active: true },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return product ? { title: product.name, description: product.shortDescription } : { title: "Produto não encontrado" };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const user = await getCurrentUser();
  const [reviews, ratingAgg, distribution, related, favoriteIds, purchased, myReview] = await Promise.all([
    prisma.review.findMany({
      where: { productId: product.id, approved: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
    prisma.review.aggregate({ where: { productId: product.id, approved: true }, _avg: { rating: true }, _count: true }),
    prisma.review.groupBy({ by: ["rating"], where: { productId: product.id, approved: true }, _count: true }),
    getProductCards({
      where: { active: true, id: { not: product.id }, ...(product.categoryId ? { categoryId: product.categoryId } : {}) },
      orderBy: { salesCount: "desc" },
      take: 4,
    }),
    getFavoriteIds(),
    user
      ? prisma.orderItem.findFirst({ where: { productId: product.id, order: { userId: user.id, paymentStatus: "PAID" } }, select: { id: true } })
      : null,
    user ? prisma.review.findUnique({ where: { productId_userId: { productId: product.id, userId: user.id } } }) : null,
  ]);

  const price = finalPrice(product);
  const avg = ratingAgg._avg.rating ?? 0;
  const specs = (Array.isArray(product.specs) ? product.specs : []) as { label: string; value: string }[];
  const inStock = product.stock > 0;
  const lowStock = inStock && product.stock <= 5;

  return (
    <div className="container-pb pt-8">
      <nav className="mb-6 text-xs text-subtle" aria-label="Trilha">
        <Link href="/" className="hover:text-fg">Início</Link>
        <span className="mx-1.5">/</span>
        <Link href="/produtos" className="hover:text-fg">Produtos</Link>
        {product.category && (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/produtos?categoria=${product.category.slug}`} className="hover:text-fg">{product.category.name}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
        <ProductGallery images={product.images.map((i) => i.url)} name={product.name} />

        <div className="lg:sticky lg:top-36 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            {product.category && <Badge>{product.category.name}</Badge>}
            {product.platform && <Badge>{product.platform}</Badge>}
            {product.discountPercent > 0 && <Badge tone="solid">-{product.discountPercent}% OFF</Badge>}
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-3 leading-relaxed text-muted">{product.shortDescription}</p>
          <a href="#avaliacoes" className="mt-4 inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
            <Stars value={avg} />
            {ratingAgg._count > 0 ? `${avg.toFixed(1).replace(".", ",")} · ${ratingAgg._count} avaliação(ões)` : "Sem avaliações ainda"}
          </a>

          <div className="card mt-6 p-6">
            {product.discountPercent > 0 && (
              <p className="text-sm text-subtle">
                De <span className="line-through">{formatMoney(product.priceCents)}</span> por
              </p>
            )}
            <p className="font-display text-4xl font-bold tracking-tight">{formatMoney(price)}</p>
            <p className="mt-1 text-xs text-subtle">
              À vista no Pix ou em até 12x no cartão
              {product.discountPercent > 0 && ` · economia de ${formatMoney(product.priceCents - price)}`}
            </p>

            <div className="mt-5 flex items-center gap-2 text-sm">
              {inStock ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-success">Disponível</span>
                  {lowStock && <span className="text-warning">· últimas {product.stock} unidades</span>}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-danger" />
                  <span className="text-danger">Indisponível no momento</span>
                </>
              )}
            </div>

            <div className="mt-5">
              <PurchaseBox productId={product.id} stock={product.stock} />
            </div>
            <div className="mt-3">
              <FavoriteButton productId={product.id} initial={favoriteIds.has(product.id)} withLabel />
            </div>

            <ul className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm text-muted">
              <li className="flex items-center gap-2.5"><Zap className="h-4 w-4 text-fg" /> {product.deliveryType}</li>
              {product.manualDelivery && (
                <li className="flex items-start gap-2.5"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-fg" /> Entrega manual pelo chat de atendimento, em até 24h a 48h após o pagamento</li>
              )}
              <li className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 text-fg" /> Pagamento seguro e garantia PLAYBOY STORE</li>
              <li className="flex items-center gap-2.5"><PackageCheck className="h-4 w-4 text-fg" /> Acesso pela sua conta, a qualquer momento</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
        <section>
          <h2 className="heading-md mb-4 text-xl">Descrição</h2>
          <div className="prose-pb">
            {product.description.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </div>
        </section>
        <section>
          <h2 className="heading-md mb-4 text-xl">Informações detalhadas</h2>
          <dl className="card divide-y divide-line">
            {[
              { label: "Categoria", value: product.category?.name ?? "—" },
              { label: "Plataforma", value: product.platform ?? "Multiplataforma" },
              { label: "Entrega", value: product.deliveryType },
              ...(product.sku ? [{ label: "SKU", value: product.sku }] : []),
              ...specs,
            ].map((s) => (
              <div key={s.label} className="flex justify-between gap-4 px-5 py-3 text-sm">
                <dt className="text-muted">{s.label}</dt>
                <dd className="text-right font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section id="avaliacoes" className="mt-16 scroll-mt-36">
        <h2 className="heading-md mb-6 text-xl">Avaliações</h2>
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <div className="card h-fit p-6">
            <p className="font-display text-5xl font-bold">{avg ? avg.toFixed(1).replace(".", ",") : "—"}</p>
            <Stars value={avg} className="mt-2" />
            <p className="mt-1 text-sm text-muted">{ratingAgg._count} avaliação(ões)</p>
            <div className="mt-5 space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = distribution.find((d) => d.rating === n)?._count ?? 0;
                const pct = ratingAgg._count ? (count / ratingAgg._count) * 100 : 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-xs text-muted">
                    <span className="w-3">{n}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-fg" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 border-t border-line pt-5">
              {!user ? (
                <p className="text-sm text-muted">
                  <Link href={`/entrar?next=/produto/${product.slug}`} className="link-underline text-fg">Entre</Link> para avaliar este produto.
                </p>
              ) : purchased ? (
                <ReviewForm productId={product.id} existing={myReview ? { rating: myReview.rating, comment: myReview.comment } : null} />
              ) : (
                <p className="flex items-start gap-2 text-sm text-muted">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" /> Apenas clientes que compraram este produto podem avaliá-lo.
                </p>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="card p-6 text-sm text-muted">Este produto ainda não recebeu avaliações. Seja o primeiro!</p>
            ) : (
              reviews.map((r) => (
                <article key={r.id} className="card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold">{r.user.name[0]}</span>
                      <div>
                        <p className="text-sm font-medium">{r.user.name.split(" ")[0]}</p>
                        <p className="text-xs text-subtle">{formatDate(r.createdAt)} · Compra verificada</p>
                      </div>
                    </div>
                    <Stars value={r.rating} size={13} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-fg/90">{r.comment}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="heading-lg mb-6">Produtos relacionados</h2>
          <ProductGrid products={related} favoriteIds={favoriteIds} />
        </section>
      )}
    </div>
  );
}
