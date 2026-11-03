import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-pb flex justify-center py-16">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-3">PLAYBOY STORE</p>
          <h1 className="heading-lg">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}
