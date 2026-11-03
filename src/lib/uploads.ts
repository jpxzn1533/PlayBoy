import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Destino dos uploads do painel:
//  • Supabase Storage, quando SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidos (produção/Vercel);
//  • disco local em storage/uploads, servido pela rota /uploads/[file] (desenvolvimento).
// Na Vercel o disco não é persistente, por isso o Supabase é obrigatório lá.
export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
// Funções da Vercel aceitam corpo de até 4,5 MB.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(ALLOWED_TYPES).map(([mime, ext]) => [ext, mime]),
);

export const SAFE_NAME = /^[a-zA-Z0-9_-]{8,64}\.(png|jpg|webp|gif|avif)$/;

/** Confere a assinatura binária do arquivo (não confia apenas no tipo informado pelo navegador). */
export function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  if (buf.toString("ascii", 4, 12) === "ftypavif") return "image/avif";
  return null;
}

export class StorageError extends Error {}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
  return url && key ? { url, key, bucket } : null;
}

let bucketReady = false;

/** Cria o bucket público na primeira utilização (ignora se já existir). */
async function ensureBucket(cfg: NonNullable<ReturnType<typeof supabaseConfig>>) {
  if (bucketReady) return;
  const res = await fetch(`${cfg.url}/storage/v1/bucket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}`, apikey: cfg.key, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: cfg.bucket,
      name: cfg.bucket,
      public: true,
      file_size_limit: MAX_UPLOAD_BYTES,
      allowed_mime_types: Object.keys(ALLOWED_TYPES),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (!/already exists|Duplicate/i.test(body)) throw new StorageError(`Não foi possível criar o bucket "${cfg.bucket}": ${body}`);
  }
  bucketReady = true;
}

/** Salva o arquivo e devolve a URL pública. */
export async function storeUpload(name: string, data: Buffer, mime: string): Promise<string> {
  const cfg = supabaseConfig();
  if (cfg) {
    await ensureBucket(cfg);
    const res = await fetch(`${cfg.url}/storage/v1/object/${cfg.bucket}/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
        "Content-Type": mime,
        "Cache-Control": "31536000",
        "x-upsert": "false",
      },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new StorageError(`Falha no envio para o Supabase Storage: ${await res.text()}`);
    return `${cfg.url}/storage/v1/object/public/${cfg.bucket}/${name}`;
  }

  if (process.env.VERCEL) throw new StorageError("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para enviar imagens na Vercel.");
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), data);
  return `/uploads/${name}`;
}
