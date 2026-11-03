"use client";

import { useActionState } from "react";
import type { Banner } from "@prisma/client";
import { saveBannerAction } from "../_actions/settings";
import { Form, Checkbox, Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { SingleImageField } from "@/components/admin/image-fields";
import type { ActionState } from "@/lib/validation";

export function BannerForm({ banner, nextOrder }: { banner?: Banner; nextOrder: number }) {
  const [state, action] = useActionState<ActionState, FormData>(saveBannerAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Form action={action} className="space-y-4" noValidate>
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <Field label="Título" name="title" error={fe.title}><Input name="title" defaultValue={banner?.title} maxLength={100} invalid={!!fe.title} /></Field>
      <Field label="Subtítulo" name="subtitle" error={fe.subtitle}><Textarea name="subtitle" defaultValue={banner?.subtitle ?? ""} rows={2} maxLength={200} /></Field>
      <Field label="Imagem de fundo" error={fe.imageUrl} hint="Recomendado: 1920×800. Um degradê escuro é aplicado para legibilidade.">
        <SingleImageField name="imageUrl" initial={banner?.imageUrl} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Texto do botão" name="ctaLabel" error={fe.ctaLabel}><Input name="ctaLabel" defaultValue={banner?.ctaLabel ?? ""} maxLength={40} /></Field>
        <Field label="Link do botão" name="ctaUrl" error={fe.ctaUrl}><Input name="ctaUrl" defaultValue={banner?.ctaUrl ?? ""} placeholder="/produtos" invalid={!!fe.ctaUrl} /></Field>
      </div>
      <Field label="Ordem" name="sortOrder" error={fe.sortOrder}><Input name="sortOrder" type="number" min={0} defaultValue={banner?.sortOrder ?? nextOrder} className="w-28" /></Field>
      <Checkbox name="active" defaultChecked={banner?.active ?? true} label="Exibir na página inicial" />
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Salvando...">{banner ? "Salvar banner" : "Criar banner"}</SubmitButton>
    </Form>
  );
}
