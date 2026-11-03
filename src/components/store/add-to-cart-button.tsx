"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, ShoppingBag } from "lucide-react";
import { addToCartAction } from "@/app/actions/store";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "./toaster";

export function AddToCartButton({
  productId,
  disabled,
  compact = false,
  quantity = 1,
  className,
}: {
  productId: string;
  disabled?: boolean;
  compact?: boolean;
  quantity?: number;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  const onClick = () =>
    start(async () => {
      const res = await addToCartAction(productId, quantity);
      if (res.ok) {
        setDone(true);
        toast(res.message ?? "Adicionado ao carrinho.", "success", { label: "Ver carrinho", href: "/carrinho" });
        setTimeout(() => setDone(false), 1600);
      } else {
        toast(res.error ?? "Não foi possível adicionar.", "error");
      }
    });

  const Icon = pending ? Loader2 : done ? Check : ShoppingBag;
  if (compact)
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        aria-label={disabled ? "Produto esgotado" : "Adicionar ao carrinho"}
        className={cn(buttonClass("primary", "icon"), "h-10 w-10 rounded-lg", className)}
      >
        <Icon className={cn("h-4 w-4", pending && "animate-spin")} />
      </button>
    );
  return (
    <button type="button" onClick={onClick} disabled={disabled || pending} className={buttonClass("primary", "lg", cn("w-full", className))}>
      <Icon className={cn("h-4 w-4", pending && "animate-spin")} />
      {disabled ? "Produto esgotado" : done ? "Adicionado!" : "Adicionar ao carrinho"}
    </button>
  );
}
