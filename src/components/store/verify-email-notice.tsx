"use client";

import { useActionState } from "react";
import { MailWarning } from "lucide-react";
import { resendVerificationAction } from "@/app/actions/auth";
import { Form, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";

export function VerifyEmailNotice({ email }: { email: string }) {
  const [state, action] = useActionState<ActionState, FormData>(async () => resendVerificationAction(), {});
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/[0.07] p-4 sm:flex-row sm:items-center">
      <MailWarning className="h-5 w-5 shrink-0 text-warning" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-warning">Confirme seu e-mail</p>
        <p className="text-muted">
          {state.message ?? state.error ?? `Enviamos um link de confirmação para ${email}. A verificação é necessária para finalizar compras.`}
        </p>
      </div>
      <Form action={action}>
        <SubmitButton variant="outline" size="sm" pendingText="Enviando...">Reenviar link</SubmitButton>
      </Form>
    </div>
  );
}
