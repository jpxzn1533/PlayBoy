import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { randomToken } from "@/lib/auth/crypto";
import { audit } from "@/lib/audit";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, StorageError, sniffImage, storeUpload } from "@/lib/uploads";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const allowed = user && (["products", "categories", "settings"] as const).some((p) => hasPermission(user, p));
  if (!user || !allowed) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

  // Proteção CSRF: a requisição deve partir da própria origem.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Arquivo maior que 4 MB." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffImage(buf);
  if (!mime || !ALLOWED_TYPES[mime]) return NextResponse.json({ error: "Formato não suportado. Use PNG, JPG, WEBP, GIF ou AVIF." }, { status: 400 });

  const name = `${randomToken(12)}.${ALLOWED_TYPES[mime]}`;
  let url: string;
  try {
    url = await storeUpload(name, buf, mime);
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json({ error: e instanceof StorageError ? e.message : "Falha ao salvar a imagem." }, { status: 500 });
  }
  await audit(user.id, "upload", "Arquivo", name, { size: file.size, type: mime });
  return NextResponse.json({ url });
}
