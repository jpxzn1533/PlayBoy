import Link from "next/link";
import { ArrowRight, Headphones, ShieldCheck, Star, Zap } from "lucide-react";
import { prisma } from "@/lib/db";
import { getActiveCategories, getProductCards, type ProductCardData } from "@/lib/catalog";
import { getFavoriteIds } from "@/lib/favorites";
import { getSettings } from "@/lib/settings";
import { relativeTime } from "@/lib/format";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { BrandHero } from "@/components/store/brand-hero";
import { LeadForm } from "@/components/store/lead-form";
import { ProductGrid } from "@/components/store/product-card";
import { Stars } from "@/components/ui/misc";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const visible = { active: true };
  const [settings, banners, categories, featured, offers, bestSellers, newest, reviews, favoriteIds] = await Promise.all([
    getSettings(),
    prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getActiveCategories(),
    getProductCards({ where: { ...visible, featured: true }, orderBy: { salesCount: "desc" }, take: 8 }),
    getProductCards({ where: { ...visible, discountPercent: { gt: 0 } }, orderBy: { discountPercent: "desc" }, take: 4 }),
    getProductCards({ where: visible, orderBy: { salesCount: "desc" }, take: 8 }),
    getProductCards({ where: visible, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.review.findMany({
      where: { approved: true, rating: { gte: 4 } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
    }),
    getFavoriteIds(),
  ]);
  const productCount = await prisma.product.count({ where: visible });

  return (
    <div className="container-pb space-y-20 pt-6">
      {banners.length > 0 ? (
        <HeroCarousel slides={banners} />
      ) : (
        <BrandHero storeName={settings.storeName} tagline={settings.tagline} logoUrl={settings.logoUrl} hasProducts={productCount > 0} />
      )}

      {productCount === 0 && (
        <section id="novidades" className="card relative scroll-mt-32 overflow-hidden p-8 text-center sm:p-12">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <p className="eyebrow mb-3">Em breve</p>
          <h2 className="heading-lg">O catálogo está sendo preparado.</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
            Novos produtos e serviços chegam em breve. Deixe seu e-mail e seja o primeiro a saber dos lançamentos.
          </p>
          <div className="mx-auto mt-8 max-w-xl text-left">
            <LeadForm source="Newsletter" compact />
          </div>
        </section>
      )}

      <section className={banners.length > 0 ? "grid gap-3 sm:grid-cols-3" : "hidden"}>
        {[
          { icon: Zap, title: "Entrega imediata", text: "Produtos digitais liberados assim que o pagamento é aprovado." },
          { icon: ShieldCheck, title: "Compra protegida", text: "Pagamentos seguros e dados pessoais protegidos." },
          { icon: Headphones, title: "Suporte dedicado", text: "Time especializado pronto para ajudar você." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="card flex items-start gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {categories.length > 0 && (
        <section>
          <SectionHeader eyebrow="Navegue" title="Categorias" href="/produtos" linkLabel={`Ver todos (${productCount})`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/produtos?categoria=${c.slug}`}
                className="group card relative flex aspect-[5/4] flex-col justify-end overflow-hidden p-4 transition-all duration-300 hover:border-line-strong"
              >
                {c.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 transition-all duration-500 group-hover:scale-105 group-hover:opacity-80" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <span className="relative font-display text-sm font-semibold">{c.name}</span>
                <span className="relative mt-0.5 flex items-center gap-1 text-xs text-muted transition-colors group-hover:text-fg">
                  Explorar <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ProductSection eyebrow="Seleção" title="Produtos em destaque" href="/produtos" products={featured} favoriteIds={favoriteIds} />

      {offers.length > 0 && (
        <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-10">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative">
            <SectionHeader eyebrow="Por tempo limitado" title="Ofertas especiais" href="/produtos?ofertas=1" linkLabel="Ver todas as ofertas" />
            <ProductGrid products={offers} favoriteIds={favoriteIds} />
          </div>
        </section>
      )}

      <ProductSection eyebrow="Top vendas" title="Mais vendidos" href="/produtos?ordem=popular" products={bestSellers} favoriteIds={favoriteIds} />
      <ProductSection eyebrow="Novidades" title="Recém-adicionados" href="/produtos?ordem=recentes" products={newest} favoriteIds={favoriteIds} />

      {reviews.length > 0 && (
        <section>
          <SectionHeader eyebrow="Quem comprou, recomenda" title="Avaliações de clientes" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="card flex flex-col p-6">
                <Stars value={r.rating} />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-fg/90">“{r.comment}”</blockquote>
                <figcaption className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs">
                  <span className="font-medium">{r.user.name.split(" ")[0]}</span>
                  <Link href={`/produto/${r.product.slug}`} className="truncate text-subtle hover:text-fg">
                    {r.product.name}
                  </Link>
                </figcaption>
                <span className="sr-only">{relativeTime(r.createdAt)}</span>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="card flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center sm:p-10">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-1.5"><Star className="h-3 w-3" /> {settings.storeName}</p>
          <h2 className="heading-lg">Crie sua conta e acompanhe tudo em um só lugar.</h2>
          <p className="mt-2 text-sm text-muted">Histórico de compras, favoritos, pagamentos e acesso imediato aos seus produtos.</p>
        </div>
        <Link href="/cadastro" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-accent px-6 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90">
          Criar conta grátis <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, href, linkLabel = "Ver todos" }: { eyebrow: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow mb-1.5">{eyebrow}</p>
        <h2 className="heading-lg">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group flex shrink-0 items-center gap-1 text-sm text-muted transition-colors hover:text-fg">
          {linkLabel} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function ProductSection(props: { eyebrow: string; title: string; href: string; products: ProductCardData[]; favoriteIds: Set<string> }) {
  if (props.products.length === 0) return null;
  return (
    <section>
      <SectionHeader eyebrow={props.eyebrow} title={props.title} href={props.href} />
      <ProductGrid products={props.products} favoriteIds={props.favoriteIds} />
    </section>
  );
}
