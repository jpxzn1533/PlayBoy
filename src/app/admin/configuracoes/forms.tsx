"use client";

import { useActionState, useState } from "react";
import { saveNotificationsAction, saveStoreInfoAction, saveThemeAction } from "../_actions/settings";
import { Form, Checkbox, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { SingleImageField } from "@/components/admin/image-fields";
import type { ActionState } from "@/lib/validation";
import type { StoreSettings } from "@prisma/client";

export function StoreInfoForm({ settings: s }: { settings: StoreSettings }) {
  const [state, action] = useActionState<ActionState, FormData>(saveStoreInfoAction, {});
  const fe = state.fieldErrors ?? {};
  const text = (name: keyof StoreSettings, label: string, props: { hint?: string; type?: string; placeholder?: string; max?: number } = {}) => (
    <Field label={label} name={name} error={fe[name]} hint={props.hint}>
      <Input name={name} type={props.type} defaultValue={(s[name] as string | null) ?? ""} placeholder={props.placeholder} maxLength={props.max ?? 200} invalid={!!fe[name]} />
    </Field>
  );
  return (
    <Form action={action} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {text("storeName", "Nome da loja", { max: 60 })}
        {text("tagline", "Slogan", { max: 140 })}
      </div>
      <div>
        <p className="eyebrow mb-3">Contato</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("contactEmail", "E-mail de contato", { type: "email" })}
          {text("contactPhone", "Telefone", { max: 30 })}
          {text("whatsapp", "WhatsApp", { max: 30 })}
          {text("businessHours", "Horário de atendimento", { placeholder: "Seg. a sex., 9h às 18h", max: 120 })}
        </div>
      </div>
      <div>
        <p className="eyebrow mb-3">Dados comerciais</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("companyName", "Razão social", { max: 120 })}
          {text("companyDocument", "CNPJ", { max: 30 })}
        </div>
        <div className="mt-4">{text("address", "Endereço")}</div>
      </div>
      <div>
        <p className="eyebrow mb-3">Redes sociais</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {text("instagramUrl", "Instagram", { placeholder: "https://..." })}
          {text("discordUrl", "Discord", { placeholder: "https://..." })}
          {text("youtubeUrl", "YouTube", { placeholder: "https://..." })}
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando...">Salvar informações</SubmitButton>
    </Form>
  );
}

export function ThemeForm({ settings: s }: { settings: StoreSettings }) {
  const [state, action] = useActionState<ActionState, FormData>(saveThemeAction, {});
  const fe = state.fieldErrors ?? {};
  const [accent, setAccent] = useState(s.accentColor);
  const [bg, setBg] = useState(s.backgroundColor);

  return (
    <Form action={action} className="space-y-5" noValidate>
      <Field label="Logotipo" error={fe.logoUrl} hint="Imagem quadrada. Sem logotipo, o monograma padrão é usado.">
        <SingleImageField name="logoUrl" initial={s.logoUrl} aspect="aspect-square max-w-24" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cor de destaque" name="accentColor" error={fe.accentColor}>
          <div className="flex items-center gap-2">
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-10 shrink-0 cursor-pointer rounded border border-line bg-transparent" aria-label="Seletor de cor de destaque" />
            <Input name="accentColor" value={accent} onChange={(e) => setAccent(e.target.value)} maxLength={7} className="font-mono" />
          </div>
        </Field>
        <Field label="Cor de fundo" name="backgroundColor" error={fe.backgroundColor}>
          <div className="flex items-center gap-2">
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-10 w-10 shrink-0 cursor-pointer rounded border border-line bg-transparent" aria-label="Seletor de cor de fundo" />
            <Input name="backgroundColor" value={bg} onChange={(e) => setBg(e.target.value)} maxLength={7} className="font-mono" />
          </div>
        </Field>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-line p-3" style={{ background: bg }}>
        <span className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: accent, color: bg }}>Botão</span>
        <span className="text-xs text-muted">Pré-visualização</span>
      </div>
      <button type="button" onClick={() => { setAccent("#ffffff"); setBg("#080808"); }} className="text-xs text-muted underline underline-offset-4 hover:text-fg">
        Restaurar identidade padrão (preto e branco)
      </button>
      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando...">Salvar aparência</SubmitButton>
    </Form>
  );
}

export function NotificationsForm({ settings: s }: { settings: StoreSettings }) {
  const [state, action] = useActionState<ActionState, FormData>(saveNotificationsAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Form action={action} className="space-y-4" noValidate>
      <Field label="E-mail para notificações" name="notificationEmail" error={fe.notificationEmail}>
        <Input name="notificationEmail" type="email" defaultValue={s.notificationEmail ?? ""} placeholder="equipe@playboystore.com.br" invalid={!!fe.notificationEmail} />
      </Field>
      <div className="space-y-2.5">
        <Checkbox name="notifyNewOrder" defaultChecked={s.notifyNewOrder} label="Novo pedido realizado" />
        <Checkbox name="notifyNewLead" defaultChecked={s.notifyNewLead} label="Novo lead capturado" />
        <Checkbox name="notifyLowStock" defaultChecked={s.notifyLowStock} label="Estoque baixo após venda" />
      </div>
      <Field label="Limite de estoque baixo" name="lowStockThreshold" error={fe.lowStockThreshold}>
        <Input name="lowStockThreshold" type="number" min={0} defaultValue={s.lowStockThreshold} className="w-28" invalid={!!fe.lowStockThreshold} />
      </Field>
      <div className="space-y-3 border-t border-line pt-4">
        <p className="eyebrow">Aviso de compras na loja</p>
        <Checkbox name="purchasePopupEnabled" defaultChecked={s.purchasePopupEnabled} label="Mostrar compras recentes no canto da tela" />
        <Field
          label="Intervalo entre avisos (minutos)"
          name="purchasePopupMinutes"
          error={fe.purchasePopupMinutes}
          hint="Mostra apenas pedidos pagos reais dos últimos 7 dias, com primeiro nome e inicial do sobrenome."
        >
          <Input name="purchasePopupMinutes" type="number" min={1} max={1440} defaultValue={s.purchasePopupMinutes} className="w-28" invalid={!!fe.purchasePopupMinutes} />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando...">Salvar notificações</SubmitButton>
    </Form>
  );
}
