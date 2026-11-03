import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid-bg flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow mb-4">PLAYBOY STORE</p>
      <p className="font-display text-8xl font-bold tracking-tighter">404</p>
      <h1 className="mt-3 text-xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">O conteúdo que você procura não existe ou foi removido.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className={buttonClass("primary")}>Ir para o início</Link>
        <Link href="/produtos" className={buttonClass("outline")}>Ver produtos</Link>
      </div>
    </div>
  );
}
