"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { SearchBar } from "./search-bar";
import { logoutAction } from "@/app/actions/auth";

export function MobileMenu({
  categories,
  user,
}: {
  categories: { name: string; slug: string }[];
  user: { name: string; role: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const linkClass = "block rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg";

  return (
    <>
      <button onClick={() => setOpen(true)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:text-fg md:hidden" aria-label="Abrir menu">
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 glass-strong flex w-[84%] max-w-sm animate-fade-in flex-col overflow-y-auto rounded-r-2xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-sm font-bold tracking-[0.2em]">MENU</span>
              <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-fg" aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SearchBar onDone={() => setOpen(false)} />
            <p className="eyebrow mt-6 mb-2 px-3">Loja</p>
            <Link href="/produtos" className={linkClass}>Todos os produtos</Link>
            <Link href="/produtos?ofertas=1" className={linkClass}>Ofertas</Link>
            {categories.map((c) => (
              <Link key={c.slug} href={`/produtos?categoria=${c.slug}`} className={linkClass}>
                {c.name}
              </Link>
            ))}
            <p className="eyebrow mt-6 mb-2 px-3">Conta</p>
            {user ? (
              <>
                {user.role === "ADMIN" && <Link href="/admin" className={linkClass}>Painel administrativo</Link>}
                <Link href="/conta" className={linkClass}>Minha conta</Link>
                <Link href="/conta/pedidos" className={linkClass}>Meus pedidos</Link>
                <Link href="/conta/favoritos" className={linkClass}>Favoritos</Link>
                <form action={logoutAction}>
                  <button className={`${linkClass} w-full text-left`}>Sair</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/entrar" className={linkClass}>Entrar</Link>
                <Link href="/cadastro" className={linkClass}>Criar conta</Link>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
