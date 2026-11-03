import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/auth/crypto";
import { rateLimit } from "@/lib/rate-limit";

const BOT = /bot|crawler|spider|crawling|preview|headless/i;

/** Registra uma visita anônima (sem dados pessoais) para o indicador de conversão. */
export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (BOT.test(ua)) return new NextResponse(null, { status: 204 });

  let path = "/";
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path === "string" && body.path.startsWith("/")) path = body.path.slice(0, 200);
  } catch {
    // corpo inválido: usa "/"
  }
  if (path.startsWith("/admin")) return new NextResponse(null, { status: 204 });

  let visitorId = request.cookies.get("pb_vid")?.value;
  const isNew = !visitorId || !/^[A-Za-z0-9_-]{16,40}$/.test(visitorId);
  if (isNew) visitorId = randomToken(16);
  if (!rateLimit(`track:${visitorId}`, 60, 60 * 1000).ok) return new NextResponse(null, { status: 204 });

  await prisma.visit.create({ data: { visitorId: visitorId!, path } });
  const res = new NextResponse(null, { status: 204 });
  if (isNew)
    res.cookies.set("pb_vid", visitorId!, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  return res;
}
