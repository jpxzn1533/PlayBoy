import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

export function StatCard({
  label,
  value,
  change,
  hint,
  href,
  icon,
}: {
  label: string;
  value: string;
  change?: number | null;
  hint?: string;
  href?: string;
  icon?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && <span className="text-subtle">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {change !== undefined && <Delta value={change} />}
        {hint && <span className="text-subtle">{hint}</span>}
      </div>
    </>
  );
  const cls = "card block p-5 transition-colors";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-line-strong")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Variação vs. período anterior. Ícone + sinal, nunca só cor. */
export function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-subtle">novo</span>;
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", rounded > 0 ? "text-success" : rounded < 0 ? "text-danger" : "text-subtle")}>
      <Icon className="h-3.5 w-3.5" />
      {rounded > 0 ? "+" : ""}
      {formatPercent(rounded)}
    </span>
  );
}

export function AdminHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8">
      {back && (
        <Link href={back.href} className="mb-3 inline-block text-sm text-muted hover:text-fg">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, description, actions, children, className, bodyClassName }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("card", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-subtle">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Table({ children, minWidth = 720 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cn("border-b border-line px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-subtle", className)}>{children}</th>
);

export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn("border-b border-line/70 px-4 py-3 align-middle", className)}>{children}</td>
);

export function EmptyRow({ colSpan, text = "Nenhum registro encontrado." }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-subtle">
        {text}
      </td>
    </tr>
  );
}

/** Barra de filtros: formulário GET, funciona sem JavaScript. */
export function FilterBar({ action, children, resetHref }: { action: string; children: ReactNode; resetHref?: string }) {
  return (
    <form action={action} className="mb-5 flex flex-wrap items-end gap-3">
      {children}
      <button type="submit" className="h-[42px] rounded-lg bg-surface-3 px-4 text-sm font-medium transition-colors hover:bg-[#262626] border border-line">
        Filtrar
      </button>
      {resetHref && (
        <Link href={resetHref} className="flex h-[42px] items-center px-2 text-sm text-muted hover:text-fg">
          Limpar
        </Link>
      )}
    </form>
  );
}
