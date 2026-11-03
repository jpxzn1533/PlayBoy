import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getRequestMeta } from "./auth/session";

/** Registra uma atividade administrativa (quem, o quê, quando e de onde). */
export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  details?: Prisma.InputJsonValue,
) {
  try {
    const { ip } = await getRequestMeta();
    await prisma.auditLog.create({ data: { userId, action, entity, entityId: entityId ?? null, details, ip } });
  } catch (err) {
    console.error("[audit] falha ao registrar atividade", err);
  }
}
