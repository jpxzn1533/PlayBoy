"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CreditCard, Heart, LayoutDashboard, LogOut, Package, Shield, User } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export function UserMenu({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const items = [
    { href: "/conta", label: "Minha conta", icon: User },
    { href: "/conta/pedidos", label: "Meus pedidos", icon: Package },
    { href: "/conta/pagamentos", label: "Pagamentos", icon: CreditCard },
    { href: "/conta/favoritos", label: "Favoritos", icon: Heart },
    { href: "/conta/seguranca", label: "Segurança", icon: Shield },
  ];

  return (
    <div ref={ref} className="relative ml-1">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2 rounded-xl pr-2 pl-1 transition-colors hover:bg-white/[0.07]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-xs font-semibold">
          {initials}
        </span>
        <ChevronDown className={`hidden h-3.5 w-3.5 text-muted transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 animate-fade-in overflow-hidden glass-strong rounded-2xl">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-subtle">{email}</p>
          </div>
          <div className="p-1.5">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="mb-1 flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-3 py-2 text-sm font-medium text-fg hover:bg-white/[0.08]"
              >
                <LayoutDashboard className="h-4 w-4" /> Painel administrativo
              </Link>
            )}
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg"
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </div>
          <form action={logoutAction} className="border-t border-line p-1.5">
            <button type="submit" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
