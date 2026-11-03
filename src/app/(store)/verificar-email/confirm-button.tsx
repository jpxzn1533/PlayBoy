"use client";

import { useActionState } from "react";
import { confirmEmailAction } from "./actions";
import { Form, FormMessage, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";

export function ConfirmEmailButton({ token }: { token: string }) {
  const [state, action] = useActionState<ActionState, FormData>(confirmEmailAction, {});
  return (
    <Form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText="Confirmando...">Confirmar meu e-mail</SubmitButton>
    </Form>
  );
}
