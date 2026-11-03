import Link from "next/link";
import { cn } from "@/lib/utils";

/** Monograma + nome da marca. Quando há logotipo configurado, ele é usado no lugar do monograma. */
export function Logo({
  name = "PLAYBOY STORE",
  logoUrl,
  href = "/",
  compact = false,
  suffix,
  className,
}: {
  name?: string;
  logoUrl?: string | null;
  href?: string;
  compact?: boolean;
  suffix?: string;
  className?: string;
}) {
  const [first, ...rest] = name.split(" ");
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${name} — início`}>
      {logoUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={first} className="h-[52px] w-auto object-contain transition-transform duration-300 group-hover:scale-[1.04]" />
          {!compact && suffix && (
            <span className="rounded border border-line-strong px-1.5 py-0.5 text-[9px] leading-none font-semibold tracking-[0.15em] text-muted">{suffix}</span>
          )}
        </>
      ) : (
        <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-fg transition-transform duration-300 group-hover:rotate-[-6deg]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M6 3h8.5a5.5 5.5 0 0 1 0 11H10v7H6V3zm4 4v3h4.3a1.5 1.5 0 0 0 0-3H10z" />
          </svg>
        </span>
      )}
      {!compact && !logoUrl && (
        <span className="font-display text-[15px] leading-none font-bold tracking-[0.18em] text-fg">
          {first}
          {rest.length > 0 && <span className="font-light text-muted"> {rest.join(" ")}</span>}
          {suffix && <span className="ml-2 rounded border border-line-strong px-1.5 py-0.5 align-middle text-[9px] tracking-[0.15em] text-muted">{suffix}</span>}
        </span>
      )}
    </Link>
  );
}
