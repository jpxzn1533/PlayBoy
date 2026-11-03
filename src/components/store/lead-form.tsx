"use client";

import { useActionState } from "react";
import { captureLeadAction } from "@/app/actions/store";
import { Form, Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";

/** Formulário de captura de leads (newsletter, contato, interesse em produto). */
export function LeadForm({
  source,
  compact = false,
  interestLabel = "Mensagem",
  defaultInterest,
}: {
  source: "Newsletter" | "Contato" | "Produto" | "Pop-up";
  compact?: boolean;
  interestLabel?: string;
  defaultInterest?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(captureLeadAction, {});
  const fe = state.fieldErrors ?? {};

  if (state.ok)
    return <FormMessage state={state} />;

  // Campo "website" é uma armadilha para bots (fica oculto para pessoas).
  const honeypot = (
    <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
  );

  if (compact)
    return (
      <Form action={action} className="space-y-2" noValidate>
        <input type="hidden" name="source" value={source} />
        {defaultInterest && <input type="hidden" name="interest" value={defaultInterest} />}
        {honeypot}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input name="name" placeholder="Seu nome" required maxLength={80} invalid={!!fe.name} aria-label="Nome" />
          <Input name="email" type="email" placeholder="seu@email.com" required maxLength={160} invalid={!!fe.email} aria-label="E-mail" />
          <SubmitButton pendingText="Enviando..." className="h-[42px] shrink-0">Inscrever</SubmitButton>
        </div>
        {(fe.name || fe.email) && <p className="text-xs text-danger">{fe.name?.[0] ?? fe.email?.[0]}</p>}
        {state.error && !state.fieldErrors && <FormMessage state={state} />}
      </Form>
    );

  return (
    <Form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="source" value={source} />
      {honeypot}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" name="name" error={fe.name}>
          <Input name="name" required maxLength={80} invalid={!!fe.name} />
        </Field>
        <Field label="E-mail" name="email" error={fe.email}>
          <Input name="email" type="email" required maxLength={160} invalid={!!fe.email} />
        </Field>
      </div>
      <Field label={interestLabel} name="interest" error={fe.interest}>
        <Textarea name="interest" maxLength={300} defaultValue={defaultInterest} invalid={!!fe.interest} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Enviando...">Enviar</SubmitButton>
    </Form>
  );
}
