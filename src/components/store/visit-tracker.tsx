"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Registra a visita (anônima) a cada navegação na loja pública. */
export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const body = JSON.stringify({ path: pathname });
    fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [pathname]);
  return null;
}
