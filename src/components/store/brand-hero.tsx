import Link from "next/link";
import { ArrowRight, Headphones, ShieldCheck, Zap } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/** Hero principal da marca, usado quando não há banners cadastrados no painel. */
export function BrandHero({
  storeName,
  tagline,
  logoUrl,
  hasProducts,
}: {
  storeName: string;
  tagline: string;
  logoUrl: string | null;
  hasProducts: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] px-6 pt-16 pb-14 text-center sm:pt-20 sm:pb-16">
      {/* Fundo: grade com máscara radial + brilho atrás da logo */}
      <div className="grid-bg absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="absolute top-[30%] left-1/2 -z-10 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.07] blur-[90px]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={storeName}
          className="mx-auto h-36 w-auto animate-fade-up drop-shadow-[0_0_36px_rgba(255,255,255,0.22)] sm:h-48"
        />
      ) : (
        <p className="animate-fade-up font-display text-4xl font-bold tracking-[0.2em]">{storeName}</p>
      )}

      <p className="eyebrow mt-8 animate-fade-up" style={{ animationDelay: "80ms" }}>
        Produtos digitais & serviços para gamers
      </p>
      <h1
        className="text-gradient mx-auto mt-4 max-w-3xl animate-fade-up font-display text-4xl font-bold tracking-tight text-balance sm:text-6xl"
        style={{ animationDelay: "140ms" }}
      >
        {tagline}
      </h1>
      <p className="mx-auto mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "200ms" }}>
        Curadoria premium, entrega imediata e suporte de verdade. Tudo o que você precisa para subir de nível.
      </p>

      <div className="mt-9 flex animate-fade-up flex-wrap items-center justify-center gap-3" style={{ animationDelay: "260ms" }}>
        <Link href={hasProducts ? "/produtos" : "#novidades"} className={buttonClass("primary", "lg", "rounded-xl px-7")}>
          {hasProducts ? "Explorar catálogo" : "Receber novidades"} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/cadastro" className={buttonClass("outline", "lg", "rounded-xl border-white/15 bg-white/[0.03] px-7 backdrop-blur")}>
          Criar conta
        </Link>
      </div>

      <ul className="mx-auto mt-12 flex max-w-2xl animate-fade-up flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted" style={{ animationDelay: "320ms" }}>
        <li className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-fg" /> Entrega digital imediata</li>
        <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-fg" /> Pagamento 100% seguro</li>
        <li className="flex items-center gap-2"><Headphones className="h-3.5 w-3.5 text-fg" /> Suporte dedicado</li>
      </ul>
    </section>
  );
}
