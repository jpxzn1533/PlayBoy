import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import { hasPermission, type AdminPermission } from "@/lib/permissions";

export class AuthError extends Error {}

/** Para páginas: redireciona para login quando não autenticado. */
export async function requireUserPage(next = "/conta") {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return user;
}

/** Para páginas administrativas. */
export async function requireAdminPage(permission?: AdminPermission) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/admin");
  if (user.role !== "ADMIN") redirect("/");
  if (permission && !hasPermission(user, permission)) redirect("/admin/sem-permissao");
  return user;
}

/** Para server actions / rotas de API: lança erro em vez de redirecionar. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Faça login para continuar.");
  return user;
}

export async function requireAdmin(permission: AdminPermission) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, permission)) throw new AuthError("Você não tem permissão para esta ação.");
  return user;
}
