"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Form, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { PasswordInput } from "@/components/store/password-input";
import type { ActionState } from "@/lib/validation";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(loginAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {notice && !state.error && <FormMessage state={{ ok: true, message: notice }} />}
      <Field label="E-mail" name="email" error={fe.email}>
        <Input name="email" type="email" autoComplete="email" required maxLength={160} invalid={!!fe.email} autoFocus />
      </Field>
      <Field label="Senha" name="password" error={fe.password}>
        <PasswordInput name="password" autoComplete="current-password" required invalid={!!fe.password} />
      </Field>
      <div className="flex justify-end">
        <Link href="/recuperar-senha" className="text-xs text-muted hover:text-fg">Esqueceu a senha?</Link>
      </div>
      <FormMessage state={state.fieldErrors ? undefined : state} />
      <SubmitButton size="lg" className="w-full" pendingText="Entrando...">Entrar</SubmitButton>
    </Form>
  );
}
