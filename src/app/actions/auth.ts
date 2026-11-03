"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, getDummyHash } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentSessionId, getRequestMeta } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/guards";
import { consumeToken, issueToken } from "@/lib/auth/tokens";
import { mergeGuestCart } from "@/lib/cart";
import { absoluteUrl, emailLayout, escapeHtml, sendEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { safeRedirectPath } from "@/lib/utils";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  formToObject,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  zodErrors,
  type ActionState,
} from "@/lib/validation";

async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  const token = await issueToken(user.id, "EMAIL_VERIFY");
  await sendEmail(
    user.email,
    "Confirme seu e-mail — PLAYBOY STORE",
    emailLayout(
      "Confirme seu e-mail",
      `<p>Olá, ${escapeHtml(user.name)}! Falta pouco para ativar sua conta na PLAYBOY STORE.</p><p>Confirme seu endereço de e-mail para liberar compras e receber seus produtos. O link expira em 48 horas.</p>`,
      { label: "Confirmar e-mail", url: absoluteUrl(`/verificar-email?token=${token}`) },
    ),
  );
}

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ip } = await getRequestMeta();
  if (!rateLimit(`register:${ip}`, 5, 15 * 60 * 1000).ok)
    return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };

  const parsed = registerSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { ok: false, fieldErrors: { email: ["Já existe uma conta com este e-mail."] }, error: "Revise os campos destacados." };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
    select: { id: true, name: true, email: true },
  });
  // Visitantes que deixaram e-mail como lead viram "convertidos" ao criar conta.
  await prisma.lead.updateMany({ where: { email, status: { notIn: ["CONVERTED", "LOST"] } }, data: { status: "CONVERTED" } });
  await sendVerificationEmail(user);
  await createSession(user.id);
  await mergeGuestCart(user.id);
  redirect(safeRedirectPath(formData.get("next") as string | null, "/conta?bemvindo=1"));
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { email, password } = parsed.data;

  const { ip } = await getRequestMeta();
  if (!rateLimit(`login:${ip}`, 20, 15 * 60 * 1000).ok || !rateLimit(`login:${email}`, 8, 15 * 60 * 1000).ok)
    return { ok: false, error: "Muitas tentativas de login. Aguarde 15 minutos." };

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) return { ok: false, error: "E-mail ou senha incorretos." };
  if (user.status !== "ACTIVE") return { ok: false, error: "Esta conta está suspensa. Fale com o suporte." };

  await createSession(user.id);
  await mergeGuestCart(user.id);
  const fallback = user.role === "ADMIN" ? "/admin" : "/conta";
  redirect(safeRedirectPath(formData.get("next") as string | null, fallback));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { ip } = await getRequestMeta();
  if (!rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000).ok)
    return { ok: false, error: "Muitas solicitações. Aguarde alguns minutos." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user && user.status === "ACTIVE") {
    const token = await issueToken(user.id, "PASSWORD_RESET");
    await sendEmail(
      user.email,
      "Redefinição de senha — PLAYBOY STORE",
      emailLayout(
        "Redefina sua senha",
        `<p>Olá, ${escapeHtml(user.name)}. Recebemos uma solicitação para redefinir a senha da sua conta.</p><p>O link é válido por 1 hora. Se você não fez esta solicitação, ignore este e-mail.</p>`,
        { label: "Criar nova senha", url: absoluteUrl(`/redefinir-senha?token=${token}`) },
      ),
    );
  }
  // Resposta idêntica em ambos os casos para não revelar quais e-mails possuem conta.
  return { ok: true, message: "Se houver uma conta com este e-mail, você receberá as instruções em instantes." };
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const userId = await consumeToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) return { ok: false, error: "Link inválido ou expirado. Solicite uma nova redefinição." };
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  // Encerra todas as sessões existentes após troca de senha.
  await prisma.session.deleteMany({ where: { userId } });
  redirect("/entrar?senha=redefinida");
}

export async function resendVerificationAction(): Promise<ActionState> {
  const user = await requireUser();
  if (user.emailVerifiedAt) return { ok: true, message: "Seu e-mail já está verificado." };
  if (!rateLimit(`verify:${user.id}`, 3, 10 * 60 * 1000).ok)
    return { ok: false, error: "Aguarde alguns minutos antes de reenviar." };
  await sendVerificationEmail(user);
  return { ok: true, message: `Enviamos um novo link para ${user.email}.` };
}

export async function verifyEmailToken(token: string) {
  const userId = await consumeToken(token, "EMAIL_VERIFY");
  if (!userId) return false;
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return true;
}

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/conta");
  return { ok: true, message: "Perfil atualizado." };
}

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const sessionUser = await requireUser();
  const parsed = changePasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash)))
    return { ok: false, fieldErrors: { currentPassword: ["Senha atual incorreta."] }, error: "Revise os campos destacados." };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  const current = await getCurrentSessionId();
  await prisma.session.deleteMany({ where: { userId: user.id, id: { not: current ?? "" } } });
  return { ok: true, message: "Senha alterada. As outras sessões foram encerradas." };
}

export async function revokeSessionAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("sessionId") ?? "");
  await prisma.session.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/conta/seguranca");
}

export async function revokeOtherSessionsAction() {
  const user = await requireUser();
  const current = await getCurrentSessionId();
  await prisma.session.deleteMany({ where: { userId: user.id, id: { not: current ?? "" } } });
  revalidatePath("/conta/seguranca");
}
