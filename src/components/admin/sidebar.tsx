"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  FolderTree,
  History,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tag,
  Target,
  Users,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { logoutAction } from "@/app/actions/auth";
import type { AdminPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof BarChart3; perm: AdminPermission; badge?: "orders" | "leads" };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Geral", items: [{ href: "/admin", label: "Visão geral", icon: BarChart3, perm: "dashboard" }] },
  {
    title: "Comercial",
    items: [
      { href: "/admin/pedidos", label: "Vendas e pedidos", icon: ShoppingCart, perm: "orders", badge: "orders" },
      { href: "/admin/clientes", label: "Clientes", icon: Users, perm: "customers" },
      { href: "/admin/leads", label: "Leads", icon: Target, perm: "leads", badge: "leads" },
      { href: "/admin/cupons", label: "Cupons", icon: Tag, perm: "coupons" },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { href: "/admin/produtos", label: "Produtos", icon: Package, perm: "products" },
      { href: "/admin/categorias", label: "Categorias", icon: FolderTree, perm: "categories" },
      { href: "/admin/avaliacoes", label: "Avaliações", icon: MessageSquareText, perm: "reviews" },
    ],
  },
  {
    title: "Loja",
    items: [
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings, perm: "settings" },
      { href: "/admin/banners", label: "Banners", icon: ImageIcon, perm: "settings" },
      { href: "/admin/emails", label: "E-mails enviados", icon: Mail, perm: "settings" },
      { href: "/admin/permissoes", label: "Permissões", icon: ShieldCheck, perm: "admins" },
      { href: "/admin/atividades", label: "Atividades", icon: History, perm: "logs" },
    ],
  },
];

export function AdminSidebar({
  storeName,
  logoUrl,
  allowed,
  user,
  badges,
}: {
  storeName: string;
  logoUrl: string | null;
  allowed: AdminPermission[];
  user: { name: string; email: string };
  badges: { orders: number; leads: number };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-line px-5">
        <Logo name={storeName} logoUrl={logoUrl} href="/admin" suffix="ADMIN" />
        <button onClick={() => setOpen(false)} className="text-muted lg:hidden" aria-label="Fechar menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Administração">
        {GROUPS.map((g) => {
          const items = g.items.filter((i) => allowed.includes(i.perm));
          if (items.length === 0) return null;
          return (
            <div key={g.title}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">{g.title}</p>
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon, badge }) => {
                  const count = badge ? badges[badge] : 0;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={isActive(href) ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(href) ? "bg-white/[0.08] font-medium text-fg" : "text-muted hover:bg-white/[0.04] hover:text-fg",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{label}</span>
                      {count > 0 && (
                        <span className="rounded-full bg-surface-3 px-1.5 py-px text-[10px] font-semibold text-fg tabular-nums">{count}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/[0.04] hover:text-fg">
          <Store className="h-4 w-4" /> Ver loja
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-xs font-semibold">
            {user.name[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-subtle">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button className="rounded-md p-1.5 text-subtle hover:bg-white/5 hover:text-fg" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="text-muted" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </button>
        <Logo name={storeName} logoUrl={logoUrl} href="/admin" suffix="ADMIN" />
      </div>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-line bg-surface lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fade-in border-r border-line bg-surface">{nav}</aside>
        </div>
      )}
    </>
  );
}
