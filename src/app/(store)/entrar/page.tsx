import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { firstParam, safeRedirectPath } from "@/lib/utils";
import { AuthShell } from "@/components/store/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeRedirectPath(firstParam(sp.next), "");
  const user = await getCurrentUser();
  if (user) redirect(next || (user.role === "ADMIN" ? "/admin" : "/conta"));
  const notice = firstParam(sp.senha) === "redefinida" ? "Senha redefinida com sucesso. Entre com a nova senha." : undefined;

  return (
    <AuthShell
      title="Entrar na sua conta"
      subtitle="Acesse pedidos, favoritos e seus produtos digitais."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href={`/cadastro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link-underline text-fg">Criar conta</Link>
        </>
      }
    >
      <LoginForm next={next} notice={notice} />
    </AuthShell>
  );
}
