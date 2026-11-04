"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { checkPaymentAction } from "@/app/actions/store";
import { Form, FormMessage, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";

/** "Já paguei": consulta o status no gateway sem esperar o aviso automático. */
export function CheckPaymentButton({ orderId }: { orderId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(checkPaymentAction, {});
  return (
    <Form action={action} className="flex w-full flex-col gap-3 sm:w-auto">
      <input type="hidden" name="orderId" value={orderId} />
      <SubmitButton pendingText="Verificando...">
        <RefreshCw className="h-4 w-4" /> Já paguei — verificar pagamento
      </SubmitButton>
      <FormMessage state={state} />
    </Form>
  );
}
