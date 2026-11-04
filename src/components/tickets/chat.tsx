"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Bot, Headphones, Send } from "lucide-react";
import { Form, FormMessage, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  body: string;
  fromStaff: boolean;
  system: boolean;
  authorName: string | null;
  createdAt: string;
};

const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Atualiza a conversa periodicamente enquanto a aba está visível. */
export function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}

/**
 * Lista de mensagens. `viewer` define o lado: mensagens do próprio leitor ficam à direita.
 * O texto é renderizado como texto puro (sem HTML), preservando quebras de linha.
 */
export function MessageList({ messages, viewer }: { messages: ChatMessage[]; viewer: "customer" | "staff" }) {
  const endRef = useRef<HTMLDivElement>(null);
  const count = messages.length;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count]);

  return (
    <div className="max-h-[60vh] min-h-64 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
      {messages.map((m) => {
        const mine = viewer === "staff" ? m.fromStaff && !m.system : !m.fromStaff && !m.system;
        if (m.system && !m.fromStaff)
          return (
            <p key={m.id} className="text-center text-xs text-subtle">
              {m.body} · {timeFmt.format(new Date(m.createdAt))}
            </p>
          );
        return (
          <div key={m.id} className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "flex-row")}>
            <span
              className={cn(
                "mt-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                m.fromStaff ? "border-fg/20 bg-accent text-accent-fg" : "border-line-strong bg-surface-3",
              )}
              aria-hidden
            >
              {m.system ? <Bot className="h-3.5 w-3.5" /> : m.fromStaff ? <Headphones className="h-3.5 w-3.5" /> : (m.authorName?.[0] ?? "C").toUpperCase()}
            </span>
            <div className={cn("max-w-[85%] sm:max-w-[75%]", mine && "text-right")}>
              <p className="mb-1 text-[11px] text-subtle">
                {m.system ? "Mensagem automática · PLAYBOY STORE" : m.fromStaff ? `${m.authorName ?? "Equipe"} · Atendimento` : (m.authorName ?? "Cliente")}
                {" · "}
                {timeFmt.format(new Date(m.createdAt))}
              </p>
              <div
                className={cn(
                  "inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed break-words whitespace-pre-wrap",
                  m.fromStaff ? "rounded-tl-sm border border-white/10 bg-white/[0.07] text-fg" : "rounded-tr-sm bg-accent text-accent-fg",
                  mine && m.fromStaff && "rounded-tl-2xl rounded-tr-sm",
                  !mine && !m.fromStaff && "rounded-tl-sm rounded-tr-2xl",
                )}
              >
                {m.body}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

/** Caixa de envio. Ctrl/⌘ + Enter envia. Limpa o texto após enviar com sucesso. */
export function Composer({
  ticketId,
  action,
  placeholder = "Escreva sua mensagem...",
  hint,
  templates = [],
}: {
  ticketId: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  placeholder?: string;
  hint?: string;
  templates?: { label: string; text: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) setText("");
  }, [state]);

  return (
    <Form ref={formRef} action={formAction} className="space-y-2 border-t border-line p-4 sm:p-5" noValidate>
      <input type="hidden" name="ticketId" value={ticketId} />
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setText((cur) => (cur.trim() ? `${cur}\n\n${t.text}` : t.text))}
              className="rounded-md border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              + {t.label}
            </button>
          ))}
        </div>
      )}
      <textarea
        name="body"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        maxLength={4000}
        rows={3}
        placeholder={placeholder}
        aria-label="Mensagem"
        className="w-full resize-y rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm text-fg placeholder:text-subtle focus:border-fg/40 focus:outline-none"
      />
      {state.error && <FormMessage state={state} />}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-subtle">{hint ?? "Ctrl + Enter para enviar"}</p>
        <SubmitButton size="sm" pendingText="Enviando..." disabled={!text.trim()}>
          <Send className="h-3.5 w-3.5" /> Enviar
        </SubmitButton>
      </div>
    </Form>
  );
}
