import "server-only";
import type { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "./crypto";

const TTL: Record<TokenType, number> = {
  EMAIL_VERIFY: 48 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

export async function issueToken(userId: string, type: TokenType) {
  const token = randomToken();
  await prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  await prisma.authToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL[type]) },
  });
  return token;
}

/** Consome um token de uso único. Retorna o userId se válido. */
export async function consumeToken(token: string, type: TokenType) {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) return null;
  const updated = await prisma.authToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return updated.count === 1 ? record.userId : null;
}

export async function isTokenValid(token: string, type: TokenType) {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  return !!record && record.type === type && !record.usedAt && record.expiresAt > new Date();
}
