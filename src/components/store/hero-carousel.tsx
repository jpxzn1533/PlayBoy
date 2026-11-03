"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Slide = { id: string; title: string; subtitle: string | null; imageUrl: string | null; ctaLabel: string | null; ctaUrl: string | null };

export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  if (slides.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-line bg-surface"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrossel"
    >
      <div className="relative h-[440px] sm:h-[480px]">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={cn("absolute inset-0 transition-opacity duration-700", i === index ? "opacity-100" : "pointer-events-none opacity-0")}
            aria-hidden={i !== index}
          >
            {s.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="grid-bg absolute inset-0" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/10" />
            <div className="relative flex h-full max-w-2xl flex-col justify-center px-6 sm:px-12">
              <p className={cn("eyebrow mb-4", i === index && "animate-fade-up")}>PLAYBOY STORE</p>
              <h1 className={cn("heading-xl text-balance", i === index && "animate-fade-up")}>{s.title}</h1>
              {s.subtitle && (
                <p className={cn("mt-4 max-w-lg text-base leading-relaxed text-muted sm:text-lg", i === index && "animate-fade-up")} style={{ animationDelay: "80ms" }}>
                  {s.subtitle}
                </p>
              )}
              {s.ctaUrl && (
                <div className={cn("mt-8 flex gap-3", i === index && "animate-fade-up")} style={{ animationDelay: "160ms" }}>
                  <Link href={s.ctaUrl} className={buttonClass("primary", "lg")} tabIndex={i === index ? 0 : -1}>
                    {s.ctaLabel || "Ver mais"} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/produtos" className={buttonClass("outline", "lg", "hidden sm:inline-flex")} tabIndex={i === index ? 0 : -1}>
                    Explorar catálogo
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-6 flex gap-2 sm:left-12">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`Ir para o banner ${i + 1}`}
              aria-current={i === index}
              className={cn("h-1 rounded-full transition-all duration-500", i === index ? "w-10 bg-fg" : "w-5 bg-white/25 hover:bg-white/50")}
            />
          ))}
        </div>
      )}
    </section>
  );
}
