"use client";

import { useActionState } from "react";
import { saveLeadAction } from "../_actions/leads";
import { Form, Field, FormMessage, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { LEAD_STATUS_LABEL, LEAD_STATUSES } from "@/lib/leads";
import type { ActionState } from "@/lib/validation";

type Lead = { id: string; name: string; email: string; source: string; interest: string | null; status: string; notes: string | null };

export function LeadForm({ lead }: { lead?: Lead }) {
  const [state, action] = useActionState<ActionState, FormData>(saveLeadAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Form action={action} className="space-y-4" noValidate>
      {lead && <input type="hidden" name="id" value={lead.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" name="name" error={fe.name}><Input name="name" defaultValue={lead?.name} maxLength={80} invalid={!!fe.name} /></Field>
        <Field label="E-mail" name="email" error={fe.email}><Input name="email" type="email" defaultValue={lead?.email} maxLength={160} invalid={!!fe.email} /></Field>
        <Field label="Origem" name="source" error={fe.source}>
          <Input name="source" defaultValue={lead?.source ?? "Manual"} list="lead-sources" maxLength={60} invalid={!!fe.source} />
          <datalist id="lead-sources">
            {["Newsletter", "Contato", "Instagram", "Discord", "Indicação", "Evento", "Manual"].map((s) => (<option key={s} value={s} />))}
          </datalist>
        </Field>
        <Field label="Etapa" name="status" error={fe.status}>
          <Select name="status" defaultValue={lead?.status ?? "NEW"}>
            {LEAD_STATUSES.map((s) => (<option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>))}
          </Select>
        </Field>
      </div>
      <Field label="Interesse" name="interest" error={fe.interest}><Textarea name="interest" defaultValue={lead?.interest ?? ""} rows={2} maxLength={300} /></Field>
      <Field label="Anotações internas" name="notes" error={fe.notes}><Textarea name="notes" defaultValue={lead?.notes ?? ""} rows={4} maxLength={2000} /></Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando...">{lead ? "Salvar lead" : "Cadastrar lead"}</SubmitButton>
    </Form>
  );
}
