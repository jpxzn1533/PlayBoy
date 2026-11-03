"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/store/product-image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const count = images.length;
  const go = (d: number) => setActive((i) => (i + d + count) % count);

  return (
    <div className="space-y-3">
      <div className="card group relative aspect-[4/3] overflow-hidden">
        <ProductImage src={images[active]} alt={`${name} — imagem ${active + 1}`} className="animate-fade-in" key={active} />
        {count > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Imagem anterior"
              className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-black/60 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Próxima imagem"
              className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-black/60 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute right-3 bottom-3 rounded-md bg-black/60 px-2 py-0.5 text-xs text-muted backdrop-blur">
              {active + 1}/{count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setActive(i)}
              aria-label={`Ver imagem ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "aspect-[4/3] overflow-hidden rounded-lg border transition-all",
                i === active ? "border-fg" : "border-line opacity-60 hover:opacity-100",
              )}
            >
              <ProductImage src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
