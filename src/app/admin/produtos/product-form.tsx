"use client";

import { useActionState, useState } from "react";
import { saveProductAction } from "../_actions/products";
import { Form, Checkbox, Field, FormMessage, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { ImageListField } from "@/components/admin/image-fields";
import { Panel } from "@/components/admin/ui";
import { centsToInput, formatMoney, parseMoneyToCents } from "@/lib/format";
import { slugify } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";

export type ProductFormData = {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  discountPercent: number;
  sku: string | null;
  stock: number;
  categoryId: string | null;
  platform: string | null;
  deliveryType: string;
  specs: { label: string; value: string }[];
  active: boolean;
  featured: boolean;
  images: string[];
};

export function ProductForm({ product, categories }: { product?: ProductFormData; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProductAction, {});
  const fe = state.fieldErrors ?? {};
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [price, setPrice] = useState(product ? centsToInput(product.priceCents) : "");
  const [discount, setDiscount] = useState(String(product?.discountPercent ?? 0));
  const cents = parseMoneyToCents(price);
  const final = Number.isFinite(cents) ? Math.round(cents * (1 - (Number(discount) || 0) / 100)) : null;

  return (
    <Form action={action} className="grid gap-6 xl:grid-cols-[1fr_360px]" noValidate>
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <div className="space-y-6">
        <Panel title="Informações básicas">
          <div className="space-y-4">
            <Field label="Nome do produto" name="name" error={fe.name}>
              <Input
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                maxLength={120}
                invalid={!!fe.name}
                required
              />
            </Field>
            <Field label="Slug (URL)" name="slug" error={fe.slug} hint={`/produto/${slug || "..."}`}>
              <Input name="slug" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} maxLength={80} invalid={!!fe.slug} />
            </Field>
            <Field label="Descrição curta" name="shortDescription" error={fe.shortDescription} hint="Exibida nos cards do catálogo (até 200 caracteres).">
              <Input name="shortDescription" defaultValue={product?.shortDescription} maxLength={200} invalid={!!fe.shortDescription} required />
            </Field>
            <Field label="Descrição completa" name="description" error={fe.description} hint="Separe parágrafos com uma linha em branco.">
              <Textarea name="description" defaultValue={product?.description} rows={8} maxLength={8000} invalid={!!fe.description} required />
            </Field>
          </div>
        </Panel>

        <Panel title="Imagens">
          <ImageListField name="images" initial={product?.images ?? []} error={fe.images} />
        </Panel>

        <Panel title="Informações detalhadas" description="Uma especificação por linha, no formato Rótulo: Valor">
          <Field name="specs" error={fe.specs}>
            <Textarea
              name="specs"
              rows={5}
              defaultValue={product?.specs.map((s) => `${s.label}: ${s.value}`).join("\n")}
              placeholder={"Formato: PSD + PNG\nResolução: 1920x1080\nLicença: Uso pessoal"}
              className="font-mono text-xs"
            />
          </Field>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Publicação">
          <div className="space-y-3">
            <Checkbox name="active" defaultChecked={product?.active ?? true} label="Produto ativo (visível na loja)" />
            <Checkbox name="featured" defaultChecked={product?.featured ?? false} label="Destacar na página inicial" />
          </div>
        </Panel>

        <Panel title="Preço e desconto">
          <div className="space-y-4">
            <Field label="Preço (R$)" name="price" error={fe.price}>
              <Input name="price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0,00" invalid={!!fe.price} required />
            </Field>
            <Field label="Desconto (%)" name="discountPercent" error={fe.discountPercent}>
              <Input name="discountPercent" type="number" min={0} max={90} value={discount} onChange={(e) => setDiscount(e.target.value)} invalid={!!fe.discountPercent} />
            </Field>
            {final !== null && (
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                Preço final: <strong>{formatMoney(final)}</strong>
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Organização e estoque">
          <div className="space-y-4">
            <Field label="Categoria" name="categoryId" error={fe.categoryId}>
              <Select name="categoryId" defaultValue={product?.categoryId ?? ""}>
                <option value="">Sem categoria</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </Select>
            </Field>
            <Field label="Plataforma" name="platform" error={fe.platform}>
              <Input name="platform" defaultValue={product?.platform ?? ""} maxLength={60} placeholder="PC, Console, Multiplataforma..." />
            </Field>
            <Field label="Tipo de entrega" name="deliveryType" error={fe.deliveryType}>
              <Input name="deliveryType" defaultValue={product?.deliveryType ?? "Entrega digital imediata"} maxLength={80} invalid={!!fe.deliveryType} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estoque" name="stock" error={fe.stock}>
                <Input name="stock" type="number" min={0} defaultValue={product?.stock ?? 0} invalid={!!fe.stock} required />
              </Field>
              <Field label="SKU" name="sku" error={fe.sku}>
                <Input name="sku" defaultValue={product?.sku ?? ""} maxLength={40} invalid={!!fe.sku} />
              </Field>
            </div>
          </div>
        </Panel>

        <div className="space-y-3 xl:sticky xl:top-6">
          <FormMessage state={state} />
          <SubmitButton size="lg" className="w-full" pendingText="Salvando...">
            {product?.id ? "Salvar alterações" : "Cadastrar produto"}
          </SubmitButton>
        </div>
      </div>
    </Form>
  );
}
