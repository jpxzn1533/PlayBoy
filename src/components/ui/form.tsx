"use client";

import { useFormStatus } from "react-dom";
import { createContext, useContext, useTransition, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClass } from "./button";
import type { ActionState } from "@/lib/validation";

const PendingContext = createContext(false);

/**
 * Formulário para server actions. Diferente de `<form action>`, não limpa os campos
 * automaticamente após o envio — assim o usuário não perde o que digitou quando a
 * validação do servidor retorna erros.
 */
export function Form({
  action,
  onSubmit,
  ...props
}: Omit<ComponentProps<"form">, "action"> & { action: (formData: FormData) => void }) {
  const [pending, startTransition] = useTransition();
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    onSubmit?.(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(formData));
  };
  return (
    <PendingContext.Provider value={pending}>
      <form {...props} onSubmit={handleSubmit} />
    </PendingContext.Provider>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle transition-colors hover:border-line-strong focus:border-fg/50 focus:outline-none aria-[invalid=true]:border-danger/60 disabled:opacity-60";

export function Field({
  label,
  name,
  error,
  hint,
  children,
  className,
}: {
  label?: string;
  name?: string;
  error?: string[] | string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={name} className="block text-xs font-medium text-muted">
          {label}
        </label>
      )}
      {children}
      {message ? (
        <p className="text-xs text-danger" role="alert">
          {message}
        </p>
      ) : hint ? (
        <p className="text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = ComponentProps<"input"> & { invalid?: boolean };
export function Input({ className, invalid, id, name, ...props }: InputProps) {
  return <input id={id ?? name} name={name} aria-invalid={invalid || undefined} className={cn(inputClass, className)} {...props} />;
}

type TextareaProps = ComponentProps<"textarea"> & { invalid?: boolean };
export function Textarea({ className, invalid, id, name, ...props }: TextareaProps) {
  return (
    <textarea
      id={id ?? name}
      name={name}
      aria-invalid={invalid || undefined}
      className={cn(inputClass, "min-h-24 resize-y leading-relaxed", className)}
      {...props}
    />
  );
}

type SelectProps = ComponentProps<"select"> & { invalid?: boolean };
export function Select({ className, invalid, id, name, children, ...props }: SelectProps) {
  return (
    <select
      id={id ?? name}
      name={name}
      aria-invalid={invalid || undefined}
      className={cn(inputClass, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%238c8c8c%22 stroke-width=%222%22><path d=%22M2 4l4 4 4-4%22/></svg>')] bg-[right_12px_center] bg-no-repeat pr-9", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-muted select-none", className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-line-strong bg-surface-2 transition checked:border-accent checked:bg-accent checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23080808%22 stroke-width=%222.5%22><path d=%22M3.5 8.5l3 3 6-7%22/></svg>')] bg-center bg-no-repeat"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & {
  pendingText?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  const status = useFormStatus();
  const pending = useContext(PendingContext) || status.pending;
  return (
    <button type="submit" disabled={pending || props.disabled} className={buttonClass(variant, size, className)} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state, className }: { state: ActionState | undefined; className?: string }) {
  if (!state || (!state.error && !state.message)) return null;
  const ok = state.ok && !state.error;
  return (
    <div
      role={ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm animate-fade-in",
        ok ? "border-success/25 bg-success/[0.07] text-success" : "border-danger/25 bg-danger/[0.07] text-danger",
        className,
      )}
    >
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{state.error ?? state.message}</span>
    </div>
  );
}
