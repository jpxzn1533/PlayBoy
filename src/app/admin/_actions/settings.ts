"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ALL_PERMISSIONS, SUPER } from "@/lib/permissions";
import {
  bannerSchema,
  emailSchema,
  formToObject,
  notificationSettingsSchema,
  storeSettingsSchema,
  themeSettingsSchema,
  zodErrors,
  type ActionState,
} from "@/lib/validation";
import { adminGuard, DENIED } from "./guard";

const refreshAll = () => revalidatePath("/", "layout");

async function saveSettings(
  section: string,
  schema: typeof storeSettingsSchema | typeof themeSettingsSchema | typeof notificationSettingsSchema,
  formData: FormData,
): Promise<ActionState> {
  const user = await adminGuard("settings");
  if (!user) return DENIED;
  const parsed = schema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  await prisma.storeSettings.upsert({ where: { id: 1 }, create: { id: 1, ...parsed.data }, update: parsed.data });
  await audit(user.id, "update", "Configurações", section, parsed.data);
  refreshAll();
  return { ok: true, message: "Configurações salvas." };
}

export async function saveStoreInfoAction(_: ActionState, fd: FormData) {
  return saveSettings("loja", storeSettingsSchema, fd);
}
export async function saveThemeAction(_: ActionState, fd: FormData) {
  return saveSettings("aparencia", themeSettingsSchema, fd);
}
export async function saveNotificationsAction(_: ActionState, fd: FormData) {
  return saveSettings("notificacoes", notificationSettingsSchema, fd);
}

// ───────── Banners

export async function saveBannerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await adminGuard("settings");
  if (!user) return DENIED;
  const id = String(formData.get("id") ?? "") || null;
  const parsed = bannerSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  if (id) await prisma.banner.update({ where: { id }, data: parsed.data });
  else await prisma.banner.create({ data: parsed.data });
  await audit(user.id, id ? "update" : "create", "Banner", id, { title: parsed.data.title });
  revalidatePath("/admin/banners");
  refreshAll();
  return { ok: true, message: id ? "Banner atualizado." : "Banner criado." };
}

export async function deleteBannerAction(id: string): Promise<ActionState> {
  const user = await adminGuard("settings");
  if (!user) return DENIED;
  const b = await prisma.banner.delete({ where: { id } }).catch(() => null);
  if (!b) return { ok: false, error: "Banner não encontrado." };
  await audit(user.id, "delete", "Banner", id, { title: b.title });
  revalidatePath("/admin/banners");
  refreshAll();
  return { ok: true, message: "Banner excluído." };
}

// ───────── Permissões administrativas

const sanitizePermissions = (values: string[]) =>
  values.includes(SUPER) ? [SUPER] : ALL_PERMISSIONS.filter((p) => values.includes(p));

export async function grantAdminAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminGuard("admins");
  if (!admin) return DENIED;
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { ok: false, fieldErrors: { email: ["E-mail inválido."] }, error: "Revise os campos destacados." };
  const permissions = sanitizePermissions(formData.getAll("permissions").map(String));
  if (permissions.length === 0) return { ok: false, error: "Selecione ao menos uma permissão." };
  if (permissions.includes(SUPER) && !admin.permissions.includes(SUPER))
    return { ok: false, error: "Somente super administradores podem conceder acesso total." };
  const target = await prisma.user.findUnique({ where: { email: email.data } });
  if (!target) return { ok: false, fieldErrors: { email: ["Nenhuma conta encontrada. A pessoa precisa se cadastrar na loja primeiro."] }, error: "Revise os campos destacados." };
  if (target.role === "ADMIN") return { ok: false, error: "Este usuário já é administrador. Edite as permissões na lista." };
  await prisma.user.update({ where: { id: target.id }, data: { role: "ADMIN", permissions } });
  await audit(admin.id, "grant_admin", "Usuário", target.id, { email: target.email, permissions });
  revalidatePath("/admin/permissoes");
  return { ok: true, message: `${target.name} agora é administrador.` };
}

export async function updateAdminPermissionsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminGuard("admins");
  if (!admin) return DENIED;
  const userId = String(formData.get("userId") ?? "");
  if (userId === admin.id) return { ok: false, error: "Você não pode alterar as próprias permissões." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "ADMIN") return { ok: false, error: "Administrador não encontrado." };
  if (target.permissions.includes(SUPER) && !admin.permissions.includes(SUPER))
    return { ok: false, error: "Somente super administradores podem alterar outro super administrador." };
  const permissions = sanitizePermissions(formData.getAll("permissions").map(String));
  if (permissions.includes(SUPER) && !admin.permissions.includes(SUPER))
    return { ok: false, error: "Somente super administradores podem conceder acesso total." };
  if (permissions.length === 0) return { ok: false, error: "Selecione ao menos uma permissão ou revogue o acesso." };
  await prisma.user.update({ where: { id: userId }, data: { permissions } });
  await audit(admin.id, "update_permissions", "Usuário", userId, { permissions });
  revalidatePath("/admin/permissoes");
  return { ok: true, message: "Permissões atualizadas." };
}

export async function revokeAdminAction(userId: string): Promise<ActionState> {
  const admin = await adminGuard("admins");
  if (!admin) return DENIED;
  if (userId === admin.id) return { ok: false, error: "Você não pode revogar o próprio acesso." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "ADMIN") return { ok: false, error: "Administrador não encontrado." };
  if (target.permissions.includes(SUPER)) {
    if (!admin.permissions.includes(SUPER)) return { ok: false, error: "Somente super administradores podem revogar outro super administrador." };
    const supers = await prisma.user.count({ where: { role: "ADMIN", permissions: { has: SUPER } } });
    if (supers <= 1) return { ok: false, error: "A loja precisa de ao menos um super administrador." };
  }
  await prisma.user.update({ where: { id: userId }, data: { role: "CUSTOMER", permissions: [] } });
  await prisma.session.deleteMany({ where: { userId } });
  await audit(admin.id, "revoke_admin", "Usuário", userId, { email: target.email });
  revalidatePath("/admin/permissoes");
  return { ok: true, message: "Acesso administrativo revogado." };
}
