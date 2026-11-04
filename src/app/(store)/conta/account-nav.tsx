"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Heart, LayoutDashboard, LogOut, MessageSquare, Package, Shield, User } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/conta", label: "Perfil", icon: User },
  { href: "/conta/pedidos", label: "Histórico de compras", icon: Package },
  { href: "/conta/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/conta/favoritos", label: "Favoritos", icon: Heart },
  { href: "/conta/atendimento", label: "Atendimento", icon: MessageSquare },
  { href: "/conta/seguranca", label: "Segurança", icon: Shield },
];

export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/conta" ? pathname === href : pathname.startsWith(href));
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Conta">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
            isActive(href) ? "bg-white/[0.07] font-medium text-fg" : "text-muted hover:bg-white/5 hover:text-fg",
          )}
        >
          <Icon className="h-4 w-4" /> {label}
        </Link>
      ))}
      {isAdmin && (
        <Link href="/admin" className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-white/5 hover:text-fg">
          <LayoutDashboard className="h-4 w-4" /> Painel admin
        </Link>
      )}
      <form action={logoutAction} className="shrink-0 lg:mt-4 lg:border-t lg:border-line lg:pt-4">
        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-white/5 hover:text-fg">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </form>
    </nav>
  );
}
