"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Barcode, CreditCard, QrCode } from "lucide-react";
import { checkoutAction } from "@/app/actions/store";
import { Form, Checkbox, Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";
import { cn } from "@/lib/utils";

const METHODS = [
  { value: "PIX", label: "Pix", desc: "Aprovação em segundos", icon: QrCode },
  { value: "CREDIT_CARD", label: "Cartão de crédito", desc: "Em até 12x", icon: CreditCard },
  { value: "BOLETO", label: "Boleto bancário", desc: "Compensação em até 2 dias úteis", icon: Barcode },
] as const;

export function CheckoutForm({
  disabled,
  sandbox,
  manual,
  methods,
  totalLabel,
  requireDocument,
  defaultDocument,
  defaultPhone,
}: {
  disabled: boolean;
  sandbox: boolean;
  manual: boolean;
  methods: string[];
  totalLabel: string;
  requireDocument: boolean;
  defaultDocument: string | null;
  defaultPhone: string | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(checkoutAction, {});
  const available = METHODS.filter((m) => methods.includes(m.value));
  const [method, setMethod] = useState<string>(available[0]?.value ?? "PIX");
  const fe = state.fieldErrors ?? {};

  return (
    <Form action={action} className="space-y-6" noValidate>
      {requireDocument && (
        <section className="card p-6">
          <h2 className="heading-md mb-1">Dados para pagamento</h2>
          <p className="mb-4 text-xs text-subtle">Exigidos pelo processador de pagamentos. Ficam salvos na sua conta para as próximas compras.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CPF ou CNPJ" name="document" error={fe.document}>
              <Input name="document" defaultValue={defaultDocument ?? ""} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={18} invalid={!!fe.document} />
            </Field>
            <Field label="Telefone com DDD" name="phone" error={fe.phone}>
              <Input name="phone" defaultValue={defaultPhone ?? ""} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" maxLength={20} invalid={!!fe.phone} />
            </Field>
          </div>
        </section>
      )}
      <section className="card p-6">
        <h2 className="heading-md mb-4">Forma de pagamento</h2>
        <div className={cn("grid gap-3", available.length === 2 && "sm:grid-cols-2", available.length > 2 && "sm:grid-cols-3")} role="radiogroup">
          {available.map(({ value, label, desc, icon: Icon }) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-all",
                method === value ? "border-fg bg-white/[0.04]" : "border-line hover:border-line-strong",
              )}
            >
              <input type="radio" name="paymentMethod" value={value} checked={method === value} onChange={() => setMethod(value)} className="sr-only" />
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-subtle">{desc}</span>
            </label>
          ))}
        </div>
        {fe.paymentMethod && <p className="mt-2 text-xs text-danger">{fe.paymentMethod[0]}</p>}
        {sandbox && (
          <p className="mt-4 rounded-lg border border-info/25 bg-info/10 p-3 text-xs text-info">
            Ambiente de testes: nenhum valor será cobrado. Após criar o pedido, você poderá simular a aprovação do pagamento.
          </p>
        )}
        {manual && (
          <p className="mt-4 rounded-lg border border-line-strong bg-white/[0.03] p-3 text-xs text-muted">
            Após confirmar o pedido você verá a chave Pix da loja. Seus produtos são liberados assim que confirmarmos o pagamento.
          </p>
        )}
      </section>

      <section className="card space-y-4 p-6">
        <Field label="Observações (opcional)" name="notes" error={fe.notes}>
          <Textarea name="notes" maxLength={500} placeholder="Ex.: nick no jogo, horário preferido para o serviço..." invalid={!!fe.notes} />
        </Field>
        <Checkbox
          name="acceptTerms"
          label={
            <>
              Li e aceito os <Link href="/institucional/termos" target="_blank" className="link-underline text-fg">termos de compra</Link> e a{" "}
              <Link href="/institucional/reembolso" target="_blank" className="link-underline text-fg">política de reembolso</Link>.
            </>
          }
        />
        {fe.acceptTerms && <p className="text-xs text-danger">{fe.acceptTerms[0]}</p>}
      </section>

      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" disabled={disabled} pendingText="Processando pedido...">
        Confirmar pedido · {totalLabel}
      </SubmitButton>
    </Form>
  );
}
