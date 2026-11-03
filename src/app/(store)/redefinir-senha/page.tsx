import type { Metadata } from "next";
import Link from "next/link";
import { isTokenValid } from "@/lib/auth/tokens";
import { firstParam } from "@/lib/utils";
import { AuthShell } from "@/components/store/auth-shell";
import { LinkButton } from "@/components/ui/button";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = firstParam((await searchParams).token) ?? "";
  const valid = token.length > 10 && (await isTokenValid(token, "PASSWORD_RESET"));
  return (
    <AuthShell title="Criar nova senha" footer={<Link href="/entrar" className="link-underline text-fg">Voltar para o login</Link>}>
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted">Este link é inválido ou expirou. Solicite uma nova redefinição de senha.</p>
          <LinkButton href="/recuperar-senha" className="w-full">Solicitar novo link</LinkButton>
        </div>
      )}
    </AuthShell>
  );
}
