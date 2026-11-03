import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { firstParam, safeRedirectPath } from "@/lib/utils";
import { AuthShell } from "@/components/store/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeRedirectPath(firstParam(sp.next), "");
  if (await getCurrentUser()) redirect(next || "/conta");
  return (
    <AuthShell
      title="Criar conta"
      subtitle="Leva menos de um minuto. Bem-vindo à PLAYBOY STORE."
      footer={
        <>
          Já tem conta?{" "}
          <Link href={`/entrar${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link-underline text-fg">Entrar</Link>
        </>
      }
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
