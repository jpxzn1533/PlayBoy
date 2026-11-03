import Link from "next/link";
import { Suspense } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartCount } from "@/lib/cart";
import { getActiveCategories } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { UserMenu } from "./user-menu";
import { MobileMenu } from "./mobile-menu";
import { HeaderShell } from "./header-shell";

const iconLink =
  "relative flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-all duration-200 hover:bg-white/[0.07] hover:text-fg";

export async function Header() {
  const [settings, user, cartCount, categories] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    getCartCount(),
    getActiveCategories(),
  ]);
  const cats = categories.map((c) => ({ name: c.name, slug: c.slug }));

  return (
    <HeaderShell>
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:gap-8">
        <Suspense fallback={null}>
          <MobileMenu categories={cats} user={user ? { name: user.name, role: user.role } : null} />
        </Suspense>
        <Logo name={settings.storeName} logoUrl={settings.logoUrl} />
        <div className="hidden flex-1 justify-center md:flex">
          <Suspense fallback={<div className="h-10 w-full max-w-xl rounded-xl border border-white/[0.08] bg-white/[0.04]" />}>
            <SearchBar />
          </Suspense>
        </div>
        <nav className="ml-auto flex items-center gap-1 md:ml-0">
          {user && (
            <Link href="/conta/favoritos" className={`${iconLink} hidden sm:flex`} aria-label="Favoritos">
              <Heart className="h-[18px] w-[18px]" />
            </Link>
          )}
          <Link href="/carrinho" className={iconLink} aria-label={`Carrinho (${cartCount} itens)`}>
            <ShoppingBag className="h-[18px] w-[18px]" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-fg shadow-[0_0_0_2px_rgba(12,12,12,0.9)]">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <UserMenu name={user.name} email={user.email} isAdmin={user.role === "ADMIN"} />
          ) : (
            <div className="ml-1 hidden items-center gap-1.5 sm:flex">
              <LinkButton href="/entrar" variant="ghost" size="sm" className="h-9 rounded-xl">
                Entrar
              </LinkButton>
              <LinkButton href="/cadastro" size="sm" className="h-9 rounded-xl px-4">
                Criar conta
              </LinkButton>
            </div>
          )}
        </nav>
      </div>
      <div className="hidden border-t border-white/[0.06] md:block">
        <nav className="no-scrollbar flex h-11 items-center gap-1 overflow-x-auto px-3 text-[13px] sm:px-5" aria-label="Categorias">
          <Link href="/produtos" className="whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-fg transition-colors hover:bg-white/[0.07]">
            Todos os produtos
          </Link>
          {cats.map((c) => (
            <Link
              key={c.slug}
              href={`/produtos?categoria=${c.slug}`}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-white/[0.07] hover:text-fg"
            >
              {c.name}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Link href="/produtos?ofertas=1" className="whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-fg transition-colors hover:bg-white/[0.07]">
              Ofertas
            </Link>
            <Link href="/institucional/ajuda" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-white/[0.07] hover:text-fg">
              Ajuda
            </Link>
          </div>
        </nav>
      </div>
    </HeaderShell>
  );
}
