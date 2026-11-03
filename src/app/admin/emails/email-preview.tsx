"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export function EmailPreview({ subject, html }: { subject: string; html: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("outline", "sm")}>Visualizar</button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={subject}>
          <div className="absolute inset-0 bg-black/80" onClick={() => setOpen(false)} />
          <div className="relative flex h-[85vh] w-full max-w-2xl animate-fade-in flex-col overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="truncate text-sm font-medium">{subject}</p>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-fg" aria-label="Fechar"><X className="h-4 w-4" /></button>
            </div>
            {/* sandbox sem scripts: o HTML é exibido isolado. Links abrem em nova aba. */}
            <iframe title={subject} srcDoc={html.replace("<head>", '<head><base target="_blank">')} sandbox="allow-popups allow-popups-to-escape-sandbox" className="flex-1 bg-[#080808]" />
          </div>
        </div>
      )}
    </>
  );
}
