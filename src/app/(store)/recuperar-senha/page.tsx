"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";
import { Form, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { AuthShell } from "@/components/store/auth-shell";
import type { ActionState } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<ActionState, FormData>(forgotPasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Informe seu e-mail e enviaremos um link para criar uma nova senha."
      footer={<Link href="/entrar" className="link-underline text-fg">Voltar para o login</Link>}
    >
      {state.ok ? (
        <FormMessage state={state} />
      ) : (
        <Form action={action} className="space-y-4" noValidate>
          <Field label="E-mail" name="email" error={fe.email}>
            <Input name="email" type="email" autoComplete="email" required maxLength={160} invalid={!!fe.email} autoFocus />
          </Field>
          <FormMessage state={state.fieldErrors ? undefined : state} />
          <SubmitButton size="lg" className="w-full" pendingText="Enviando...">Enviar link de recuperação</SubmitButton>
        </Form>
      )}
    </AuthShell>
  );
}
