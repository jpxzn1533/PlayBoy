"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form";
import { toast } from "@/components/store/toaster";
import { cn } from "@/lib/utils";

async function uploadFile(file: File): Promise<string | null> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    toast(data.error ?? "Falha no envio da imagem.", "error");
    return null;
  }
  return data.url;
}

function useUploader(onUrl: (url: string) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
      multiple
      className="hidden"
      onChange={async (e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        setBusy(true);
        for (const f of files) {
          const url = await uploadFile(f);
          if (url) onUrl(url);
        }
        setBusy(false);
      }}
    />
  );
  return { input, busy, open: () => inputRef.current?.click() };
}

/** Galeria de imagens do produto: envio, URL externa, reordenação e remoção. */
export function ImageListField({ name, initial, error }: { name: string; initial: string[]; error?: string[] }) {
  const [images, setImages] = useState<string[]>(initial);
  const [url, setUrl] = useState("");
  const uploader = useUploader((u) => setImages((prev) => (prev.length >= 10 ? prev : [...prev, u])));
  const move = (i: number, d: number) =>
    setImages((prev) => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="space-y-3">
      {images.map((src) => (
        <input key={src} type="hidden" name={name} value={src} />
      ))}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((src, i) => (
          <div key={src + i} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold">CAPA</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} className="rounded bg-black/60 p-1 hover:bg-black" aria-label="Mover para a esquerda"><ArrowLeft className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => move(i, 1)} className="rounded bg-black/60 p-1 hover:bg-black" aria-label="Mover para a direita"><ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
              <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="rounded bg-black/60 p-1 text-danger hover:bg-black" aria-label="Remover imagem"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
        {images.length < 10 && (
          <button
            type="button"
            onClick={uploader.open}
            disabled={uploader.busy}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-xs text-muted transition-colors hover:border-fg/50 hover:text-fg"
          >
            {uploader.busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            {uploader.busy ? "Enviando..." : "Enviar imagens"}
          </button>
        )}
      </div>
      {uploader.input}
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Ou cole uma URL https://..." className={inputClass} aria-label="URL da imagem" />
        <button
          type="button"
          className={buttonClass("outline")}
          onClick={() => {
            const v = url.trim();
            if (!/^https:\/\//.test(v) && !v.startsWith("/")) return toast("Informe uma URL https válida.", "error");
            setImages((p) => [...p, v].slice(0, 10));
            setUrl("");
          }}
        >
          <Link2 className="h-4 w-4" /> Adicionar
        </button>
      </div>
      <p className="text-xs text-subtle">PNG, JPG, WEBP, GIF ou AVIF até 4 MB. A primeira imagem é a capa. Máximo de 10.</p>
      {error?.[0] && <p className="text-xs text-danger">{error[0]}</p>}
    </div>
  );
}

/** Campo de imagem única (categoria, banner, logotipo). */
export function SingleImageField({ name, initial, error, aspect = "aspect-[16/9]" }: { name: string; initial?: string | null; error?: string[]; aspect?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const uploader = useUploader((u) => setValue(u));
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <div className={cn("relative w-full max-w-sm overflow-hidden rounded-lg border border-line bg-surface-2", aspect)}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid-bg flex h-full items-center justify-center text-xs text-subtle">Sem imagem</div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={uploader.open} disabled={uploader.busy} className={buttonClass("outline", "sm")}>
          {uploader.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Enviar imagem
        </button>
        {value && (
          <button type="button" onClick={() => setValue("")} className={buttonClass("ghost", "sm")}>Remover</button>
        )}
      </div>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="ou URL https://..." className={cn(inputClass, "max-w-sm")} aria-label="URL da imagem" />
      {uploader.input}
      {error?.[0] && <p className="text-xs text-danger">{error[0]}</p>}
    </div>
  );
}
