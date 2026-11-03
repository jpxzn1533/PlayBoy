import { cn } from "@/lib/utils";

/** Imagem de produto com fallback de marca quando não há imagem cadastrada. */
export function ProductImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  if (!src)
    return (
      <div className={cn("grid-bg flex h-full w-full items-center justify-center bg-surface-2", className)}>
        <span className="font-display text-xs font-bold tracking-[0.3em] text-subtle">PLAYBOY STORE</span>
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={cn("h-full w-full object-cover", className)} />;
}
