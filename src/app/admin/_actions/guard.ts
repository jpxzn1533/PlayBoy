import "server-only";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, type AdminPermission } from "@/lib/permissions";
import type { ActionState } from "@/lib/validation";

export const DENIED: ActionState = { ok: false, error: "Você não tem permissão para esta ação." };

/** Retorna o administrador autenticado com a permissão exigida, ou null. */
export async function adminGuard(permission: AdminPermission) {
  const user = await getCurrentUser();
  return user && hasPermission(user, permission) ? user : null;
}

export function isUniqueViolation(e: unknown, field?: string) {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  if (!field) return true;
  const target = (e.meta?.target ?? []) as string[] | string;
  return Array.isArray(target) ? target.includes(field) : String(target).includes(field);
}
