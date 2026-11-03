import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { isTokenValid } from "@/lib/auth/tokens";
import { firstParam } from "@/lib/utils";
import { AuthShell } from "@/components/store/auth-shell";
import { LinkButton } from "@/components/ui/button";
import { ConfirmEmailButton } from "./confirm-button";

export const metadata: Metadata = { title: "Verificar e-mail" };

/**
 * A confirmação exige um clique (POST via server action) em vez de acontecer no GET:
 * assim, scanners de link de provedores de e-mail não consomem o token sozinhos.
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = firstParam(sp.token) ?? "";
  const done = firstParam(sp.status) === "ok";
  const user = await getCurrentUser();

  if (done)
    return (
      <AuthShell title="E-mail confirmado">
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <p className="text-sm text-muted">Tudo certo! Sua conta PLAYBOY STORE está verificada e pronta para compras.</p>
          <LinkButton href={user ? "/conta" : "/entrar"} className="w-full">{user ? "Ir para minha conta" : "Entrar"}</LinkButton>
        </div>
      </AuthShell>
    );

  const valid = token.length > 10 && (await isTokenValid(token, "EMAIL_VERIFY"));
  return (
    <AuthShell title="Verificar e-mail">
      {valid ? (
        <div className="space-y-5 text-center">
          <p className="text-sm text-muted">Clique abaixo para confirmar seu endereço de e-mail.</p>
          <ConfirmEmailButton token={token} />
        </div>
      ) : (
        <div className="space-y-5 text-center">
          <XCircle className="mx-auto h-10 w-10 text-danger" />
          <p className="text-sm text-muted">Este link é inválido, já foi utilizado ou expirou. Você pode solicitar um novo na sua conta.</p>
          <LinkButton href="/conta" variant="outline" className="w-full">Ir para minha conta</LinkButton>
        </div>
      )}
    </AuthShell>
  );
}
