"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Cápsula de vidro do header: ganha mais opacidade e sombra quando a página rola. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("sticky top-0 z-50 px-3 transition-[padding] duration-300 sm:px-5", scrolled ? "pt-2" : "pt-4")}>
      <div
        className={cn(
          "glass mx-auto max-w-7xl rounded-2xl transition-[background-color,box-shadow] duration-300",
          scrolled && "bg-[rgba(12,12,12,0.72)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_60px_-20px_rgba(0,0,0,0.95)]",
        )}
      >
        {children}
      </div>
    </header>
  );
}
