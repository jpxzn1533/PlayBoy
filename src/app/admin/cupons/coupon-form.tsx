"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveCouponAction } from "../_actions/coupons";
import { Form, Checkbox, Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui/form";
import { centsToInput } from "@/lib/format";
import type { ActionState } from "@/lib/validation";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderCents: number;
  maxUses: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  active: boolean;
};

const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function CouponForm({ coupon }: { coupon?: Coupon }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCouponAction, {});
  const [type, setType] = useState(coupon?.type ?? "PERCENT");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && !coupon) ref.current?.reset();
  }, [state, coupon]);
  const fe = state.fieldErrors ?? {};

  return (
    <Form
      ref={ref}
      action={(fd) => {
        // Converte datas locais para ISO (com fuso) antes de enviar.
        for (const k of ["startsAt", "expiresAt"]) {
          const v = fd.get(k);
          if (typeof v === "string" && v) fd.set(k, new Date(v).toISOString());
        }
        action(fd);
      }}
      className="space-y-4"
      noValidate
    >
      {coupon && <input type="hidden" name="id" value={coupon.id} />}
      <Field label="Código" name="code" error={fe.code}>
        <Input name="code" defaultValue={coupon?.code} className="font-mono uppercase" maxLength={30} invalid={!!fe.code} />
      </Field>
      <Field label="Descrição interna" name="description" error={fe.description}>
        <Input name="description" defaultValue={coupon?.description ?? ""} maxLength={200} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" name="type">
          <Select name="type" value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}>
            <option value="PERCENT">Percentual</option>
            <option value="FIXED">Valor fixo</option>
          </Select>
        </Field>
        <Field label={type === "PERCENT" ? "Desconto (%)" : "Desconto (R$)"} name="value" error={fe.value}>
          <Input name="value" defaultValue={coupon ? (coupon.type === "PERCENT" ? String(coupon.value) : centsToInput(coupon.value)) : ""} inputMode="decimal" invalid={!!fe.value} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pedido mínimo (R$)" name="minOrder" error={fe.minOrder}>
          <Input name="minOrder" defaultValue={coupon ? centsToInput(coupon.minOrderCents) : "0"} inputMode="decimal" invalid={!!fe.minOrder} />
        </Field>
        <Field label="Limite de usos" name="maxUses" error={fe.maxUses} hint="Vazio = ilimitado">
          <Input name="maxUses" type="number" min={1} defaultValue={coupon?.maxUses ?? ""} invalid={!!fe.maxUses} />
        </Field>
      </div>
      <Field label="Início (opcional)" name="startsAt" error={fe.startsAt}>
        <Input name="startsAt" type="datetime-local" defaultValue={toLocalInput(coupon?.startsAt ?? null)} />
      </Field>
      <Field label="Expiração (opcional)" name="expiresAt" error={fe.expiresAt}>
        <Input name="expiresAt" type="datetime-local" defaultValue={toLocalInput(coupon?.expiresAt ?? null)} invalid={!!fe.expiresAt} />
      </Field>
      <Checkbox name="active" defaultChecked={coupon?.active ?? true} label="Cupom ativo" />
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Salvando...">{coupon ? "Salvar cupom" : "Criar cupom"}</SubmitButton>
    </Form>
  );
}
