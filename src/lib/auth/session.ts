import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "./crypto";

export const SESSION_COOKIE = "pb_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias, renovado com o uso
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export async function getRequestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return { ip, userAgent: h.get("user-agent")?.slice(0, 250) ?? null };
}

export async function createSession(userId: string) {
  const token = randomToken();
  const { ip, userAgent } = await getRequestMeta();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  // Apenas o hash do token é persistido: um vazamento do banco não expõe sessões válidas.
  await prisma.session.create({ data: { id: sha256(token), userId, ip, userAgent, expiresAt } });
  await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentSessionId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? sha256(token) : null;
}

/** Usuário autenticado da requisição atual (memoizado por request). */
export const getCurrentUser = cache(async () => {
  const sessionId = await getCurrentSessionId();
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          status: true,
          emailVerifiedAt: true,
          phone: true,
          createdAt: true,
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt < new Date() || session.user.status !== "ACTIVE") {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    const now = new Date();
    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionId },
        data: { lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) },
      }),
      prisma.user.update({ where: { id: session.userId }, data: { lastActiveAt: now } }),
    ]);
  }
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
