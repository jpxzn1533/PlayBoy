"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/app/actions/auth";
import { Form, Checkbox, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { PasswordInput } from "@/components/store/password-input";
import type { ActionState } from "@/lib/validation";

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState<ActionState, FormData>(registerAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="Nome completo" name="name" error={fe.name}>
        <Input name="name" autoComplete="name" required maxLength={80} invalid={!!fe.name} autoFocus />
      </Field>
      <Field label="E-mail" name="email" error={fe.email}>
        <Input name="email" type="email" autoComplete="email" required maxLength={160} invalid={!!fe.email} />
      </Field>
      <Field label="Senha" name="password" error={fe.password} hint="Mínimo de 8 caracteres, com letras e números.">
        <PasswordInput name="password" autoComplete="new-password" required invalid={!!fe.password} />
      </Field>
      <Field label="Confirmar senha" name="confirmPassword" error={fe.confirmPassword}>
        <PasswordInput name="confirmPassword" autoComplete="new-password" required invalid={!!fe.confirmPassword} />
      </Field>
      <div>
        <Checkbox
          name="acceptTerms"
          label={
            <>
              Concordo com os <Link href="/institucional/termos" target="_blank" className="link-underline text-fg">termos de uso</Link> e a{" "}
              <Link href="/institucional/privacidade" target="_blank" className="link-underline text-fg">política de privacidade</Link>.
            </>
          }
        />
        {fe.acceptTerms && <p className="mt-1 text-xs text-danger">{fe.acceptTerms[0]}</p>}
      </div>
      <FormMessage state={state.fieldErrors ? undefined : state} />
      <SubmitButton size="lg" className="w-full" pendingText="Criando conta...">Criar conta</SubmitButton>
    </Form>
  );
}
