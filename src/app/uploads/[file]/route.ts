import { readFile } from "node:fs/promises";
import path from "node:path";
import { MIME_BY_EXT, SAFE_NAME, UPLOAD_DIR } from "@/lib/uploads";

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  // Nome estrito: impede path traversal e qualquer arquivo que não tenha sido gerado pelo upload.
  if (!SAFE_NAME.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(UPLOAD_DIR, file));
    const ext = file.split(".").pop()!;
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
