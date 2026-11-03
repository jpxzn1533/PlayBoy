"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/auth";
import { Form, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import type { ActionState } from "@/lib/validation";

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string | null; verified: boolean } }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfileAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" name="name" error={fe.name}>
          <Input name="name" defaultValue={user.name} required maxLength={80} invalid={!!fe.name} />
        </Field>
        <Field label="Telefone (opcional)" name="phone" error={fe.phone}>
          <Input name="phone" defaultValue={user.phone ?? ""} inputMode="tel" maxLength={20} placeholder="(11) 99999-9999" invalid={!!fe.phone} />
        </Field>
      </div>
      <Field label="E-mail" hint="Para alterar o e-mail, fale com o suporte.">
        <div className="flex items-center gap-2">
          <Input value={user.email} disabled readOnly aria-label="E-mail" />
          <Badge tone={user.verified ? "success" : "warning"}>{user.verified ? "Verificado" : "Pendente"}</Badge>
        </div>
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando...">Salvar alterações</SubmitButton>
    </Form>
  );
}
