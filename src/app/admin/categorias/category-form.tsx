"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveCategoryAction } from "../_actions/categories";
import { Form, Checkbox, Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { SingleImageField } from "@/components/admin/image-fields";
import type { ActionState } from "@/lib/validation";

type Category = { id: string; name: string; slug: string; description: string | null; imageUrl: string | null; sortOrder: number; active: boolean };

export function CategoryForm({ category, nextOrder }: { category?: Category; nextOrder: number }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCategoryAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && !category) ref.current?.reset();
  }, [state, category]);
  const fe = state.fieldErrors ?? {};
  return (
    <Form ref={ref} action={action} className="space-y-4" noValidate>
      {category && <input type="hidden" name="id" value={category.id} />}
      <Field label="Nome" name="name" error={fe.name}>
        <Input name="name" defaultValue={category?.name} maxLength={60} invalid={!!fe.name} required />
      </Field>
      <Field label="Slug (opcional)" name="slug" error={fe.slug} hint="Gerado automaticamente a partir do nome.">
        <Input name="slug" defaultValue={category?.slug} maxLength={80} invalid={!!fe.slug} />
      </Field>
      <Field label="Descrição" name="description" error={fe.description}>
        <Textarea name="description" defaultValue={category?.description ?? ""} maxLength={300} rows={3} />
      </Field>
      <Field label="Imagem" error={fe.imageUrl}>
        <SingleImageField name="imageUrl" initial={category?.imageUrl} aspect="aspect-[5/4]" />
      </Field>
      <Field label="Ordem de exibição" name="sortOrder" error={fe.sortOrder}>
        <Input name="sortOrder" type="number" min={0} defaultValue={category?.sortOrder ?? nextOrder} invalid={!!fe.sortOrder} />
      </Field>
      <Checkbox name="active" defaultChecked={category?.active ?? true} label="Exibir na loja" />
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Salvando...">{category ? "Salvar categoria" : "Criar categoria"}</SubmitButton>
    </Form>
  );
}
