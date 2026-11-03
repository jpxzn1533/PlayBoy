"use client";

import { useActionState } from "react";
import type { OrderStatus } from "@prisma/client";
import { updateOrderStatusAction } from "../../_actions/orders";
import { Form, Field, FormMessage, Select, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";

const OPTIONS: [OrderStatus, string][] = [
  ["PENDING", "Aguardando pagamento"],
  ["PROCESSING", "Em processamento"],
  ["COMPLETED", "Concluído"],
  ["CANCELLED", "Cancelado (devolve estoque)"],
  ["REFUNDED", "Reembolsado (devolve estoque)"],
];

export function StatusForm({ orderId, current }: { orderId: string; current: OrderStatus }) {
  const [state, action] = useActionState<ActionState, FormData>(updateOrderStatusAction, {});
  return (
    <Form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        const status = new FormData(e.currentTarget).get("status");
        if ((status === "CANCELLED" || status === "REFUNDED") && !window.confirm("Esta ação é definitiva. Continuar?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <Field label="Novo status" name="status">
        <Select name="status" defaultValue={current}>
          {OPTIONS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
        </Select>
      </Field>
      <Field label="Observação (opcional)" name="note" error={state.fieldErrors?.note}>
        <Textarea name="note" rows={2} maxLength={300} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Atualizando...">Atualizar status</SubmitButton>
    </Form>
  );
}
