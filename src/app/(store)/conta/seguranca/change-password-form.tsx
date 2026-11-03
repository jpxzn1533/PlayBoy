"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { Form, Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { PasswordInput } from "@/components/store/password-input";
import type { ActionState } from "@/lib/validation";

export function ChangePasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changePasswordAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const fe = state.fieldErrors ?? {};
  return (
    <Form ref={ref} action={action} className="max-w-md space-y-4" noValidate>
      <Field label="Senha atual" name="currentPassword" error={fe.currentPassword}>
        <PasswordInput name="currentPassword" autoComplete="current-password" invalid={!!fe.currentPassword} />
      </Field>
      <Field label="Nova senha" name="password" error={fe.password} hint="Mínimo de 8 caracteres, com letras e números.">
        <PasswordInput name="password" autoComplete="new-password" invalid={!!fe.password} />
      </Field>
      <Field label="Confirmar nova senha" name="confirmPassword" error={fe.confirmPassword}>
        <PasswordInput name="confirmPassword" autoComplete="new-password" invalid={!!fe.confirmPassword} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando...">Alterar senha</SubmitButton>
    </Form>
  );
}
