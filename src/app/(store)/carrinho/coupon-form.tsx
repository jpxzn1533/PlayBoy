"use client";

import { useActionState, useTransition } from "react";
import { Tag, X } from "lucide-react";
import { applyCouponAction, removeCouponAction } from "@/app/actions/store";
import { Form, Input, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";

export function CouponForm({ applied, error }: { applied: string | null; error: string | null }) {
  const [state, action] = useActionState<ActionState, FormData>(applyCouponAction, {});
  const [removing, start] = useTransition();

  if (applied)
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 font-medium"><Tag className="h-3.5 w-3.5" /> {applied}</span>
          <button onClick={() => start(() => removeCouponAction())} disabled={removing} className="text-subtle hover:text-fg" aria-label="Remover cupom">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="text-xs text-warning">{error}</p>}
      </div>
    );

  return (
    <Form action={action} className="space-y-1.5">
      <div className="flex gap-2">
        <Input name="code" placeholder="Cupom de desconto" aria-label="Cupom de desconto" maxLength={30} className="uppercase placeholder:normal-case" />
        <SubmitButton variant="outline" className="h-[42px]">Aplicar</SubmitButton>
      </div>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </Form>
  );
}
