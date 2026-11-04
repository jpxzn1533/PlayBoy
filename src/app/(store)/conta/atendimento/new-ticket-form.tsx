"use client";

import { useActionState } from "react";
import { createTicketAction } from "@/app/actions/tickets";
import { Field, Form, FormMessage, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";

export function NewTicketForm({ orders }: { orders: number[] }) {
  const [state, action] = useActionState<ActionState, FormData>(createTicketAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="Assunto" name="subject" error={fe.subject}>
          <Input name="subject" maxLength={120} placeholder="Ex.: Dúvida sobre a entrega" invalid={!!fe.subject} />
        </Field>
        <Field label="Pedido relacionado (opcional)" name="orderNumber" error={fe.orderNumber}>
          <Select name="orderNumber" defaultValue="">
            <option value="">Nenhum</option>
            {orders.map((n) => (
              <option key={n} value={n}>PB-{String(n).padStart(6, "0")}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Mensagem" name="body" error={fe.body}>
        <Textarea name="body" rows={5} maxLength={4000} placeholder="Descreva como podemos ajudar..." invalid={!!fe.body} />
      </Field>
      <FormMessage state={state.fieldErrors ? undefined : state} />
      <SubmitButton pendingText="Abrindo...">Abrir atendimento</SubmitButton>
    </Form>
  );
}
