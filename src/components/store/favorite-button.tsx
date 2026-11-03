"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/store";
import { cn } from "@/lib/utils";
import { toast } from "./toaster";

export function FavoriteButton({ productId, initial, withLabel = false }: { productId: string; initial: boolean; withLabel?: boolean }) {
  const [favorited, setFavorited] = useState(initial);
  const [pending, start] = useTransition();

  const onClick = () =>
    start(async () => {
      const res = await toggleFavoriteAction(productId);
      if (res.ok) {
        setFavorited(!!res.favorited);
        toast(res.favorited ? "Adicionado aos favoritos." : "Removido dos favoritos.", "success");
      } else {
        toast(res.error ?? "Erro ao atualizar favoritos.", "error", res.needsLogin ? { label: "Entrar", href: "/entrar" } : undefined);
      }
    });

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border backdrop-blur transition-all duration-200",
        withLabel ? "h-12 px-5 text-sm font-medium" : "h-9 w-9",
        favorited ? "border-fg/30 bg-black/70 text-fg" : "border-line bg-black/50 text-muted hover:border-line-strong hover:text-fg",
      )}
    >
      <Heart className={cn("h-4 w-4 transition-transform", favorited && "scale-110 fill-current")} />
      {withLabel && (favorited ? "Favoritado" : "Favoritar")}
    </button>
  );
}
