"use client";

import { useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { toast } from "@/components/store/toaster";
import type { ActionState } from "@/lib/validation";

/** Executa uma ação administrativa (com confirmação opcional) e mostra o resultado em um toast. */
export function ActionButton({
  action,
  confirm: confirmText,
  children,
  variant = "ghost",
  size = "sm",
  className,
  title,
}: {
  action: () => Promise<ActionState | void>;
  confirm?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "icon";
  className?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={pending}
      className={buttonClass(variant, size, className)}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const res = await action();
          if (res && res.error) toast(res.error, "error");
          else if (res && res.message) toast(res.message, "success");
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}
