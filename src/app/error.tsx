"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow mb-4">PLAYBOY STORE</p>
      <h1 className="heading-lg">Algo deu errado</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">Ocorreu um erro inesperado. Tente novamente em instantes.</p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className={buttonClass("primary")}>Tentar novamente</button>
        <Link href="/" className={buttonClass("outline")}>Ir para o início</Link>
      </div>
    </div>
  );
}
