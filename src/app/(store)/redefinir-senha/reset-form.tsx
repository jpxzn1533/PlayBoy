"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { Form, Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { PasswordInput } from "@/components/store/password-input";
import type { ActionState } from "@/lib/validation";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<ActionState, FormData>(resetPasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha" name="password" error={fe.password} hint="Mínimo de 8 caracteres, com letras e números.">
        <PasswordInput name="password" autoComplete="new-password" required invalid={!!fe.password} autoFocus />
      </Field>
      <Field label="Confirmar nova senha" name="confirmPassword" error={fe.confirmPassword}>
        <PasswordInput name="confirmPassword" autoComplete="new-password" required invalid={!!fe.confirmPassword} />
      </Field>
      <FormMessage state={state.fieldErrors ? undefined : state} />
      <SubmitButton size="lg" className="w-full" pendingText="Salvando...">Salvar nova senha</SubmitButton>
    </Form>
  );
}
