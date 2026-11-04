"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth/guards";
import { getCurrentUser, getRequestMeta } from "@/lib/auth/session";
import { getCartSummary, getOrCreateCart, MAX_QTY_PER_ITEM } from "@/lib/cart";
import { evaluateCoupon } from "@/lib/pricing";
import { applyPaymentEvent, createOrderFromCart, changeOrderStatus, markOrderPaid, OrderError } from "@/lib/orders";
import { getPaymentProvider, getProviderById } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { absoluteUrl, emailLayout, escapeHtml, sendEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { checkoutSchema, documentSchema, formToObject, leadSchema, phoneDigitsSchema, reviewSchema, zodErrors, type ActionState } from "@/lib/validation";

const refreshStore = () => revalidatePath("/", "layout");

// ───────── Carrinho

export async function addToCartAction(productId: string, quantity = 1): Promise<ActionState> {
  const qty = Math.min(Math.max(Math.trunc(quantity) || 1, 1), MAX_QTY_PER_ITEM);
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, active: true, stock: true, name: true } });
  if (!product || !product.active) return { ok: false, error: "Produto indisponível." };
  const cart = await getOrCreateCart();
  const current = cart.items.find((i) => i.productId === productId)?.quantity ?? 0;
  const next = Math.min(current + qty, MAX_QTY_PER_ITEM);
  if (next > product.stock) return { ok: false, error: product.stock === 0 ? "Produto esgotado." : `Apenas ${product.stock} unidade(s) disponível(is).` };
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity: next },
    update: { quantity: next },
  });
  refreshStore();
  return { ok: true, message: `"${product.name}" adicionado ao carrinho.` };
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionState> {
  const cart = await getOrCreateCart();
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "Item não encontrado." };
  const qty = Math.trunc(quantity);
  if (qty <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    if (qty > MAX_QTY_PER_ITEM) return { ok: false, error: `Máximo de ${MAX_QTY_PER_ITEM} unidades por produto.` };
    if (qty > item.product.stock) return { ok: false, error: `Apenas ${item.product.stock} unidade(s) disponível(is).` };
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: qty } });
  }
  refreshStore();
  return { ok: true };
}

export async function applyCouponAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { ok: false, error: "Digite um código de cupom válido." };
  const { ip } = await getRequestMeta();
  if (!rateLimit(`coupon:${ip}`, 15, 10 * 60 * 1000).ok) return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };
  const summary = await getCartSummary();
  if (summary.lines.length === 0) return { ok: false, error: "Adicione produtos antes de aplicar um cupom." };
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  const result = evaluateCoupon(coupon, summary.subtotalCents);
  if (!result.ok) return { ok: false, error: result.error };
  const cart = await getOrCreateCart();
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
  refreshStore();
  return { ok: true, message: `Cupom ${code} aplicado.` };
}

export async function removeCouponAction() {
  const cart = await getOrCreateCart();
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  refreshStore();
}

// ───────── Favoritos

export async function toggleFavoriteAction(productId: string): Promise<{ ok: boolean; favorited?: boolean; error?: string; needsLogin?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsLogin: true, error: "Entre na sua conta para salvar favoritos." };
  const key = { userId_productId: { userId: user.id, productId } };
  const existing = await prisma.favorite.findUnique({ where: key });
  if (existing) {
    await prisma.favorite.delete({ where: key });
  } else {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return { ok: false, error: "Produto não encontrado." };
    await prisma.favorite.create({ data: { userId: user.id, productId } });
  }
  revalidatePath("/conta/favoritos");
  return { ok: true, favorited: !existing };
}

// ───────── Avaliações

export async function submitReviewAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Entre na sua conta para avaliar." };
  }
  const parsed = reviewSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { productId, rating, comment } = parsed.data;
  const purchased = await prisma.orderItem.findFirst({
    where: { productId, order: { userId: user.id, paymentStatus: "PAID" } },
    select: { id: true },
  });
  if (!purchased) return { ok: false, error: "Apenas clientes que compraram este produto podem avaliá-lo." };
  await prisma.review.upsert({
    where: { productId_userId: { productId, userId: user.id } },
    create: { productId, userId: user.id, rating, comment },
    update: { rating, comment, createdAt: new Date() },
  });
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (product) revalidatePath(`/produto/${product.slug}`);
  return { ok: true, message: "Obrigado! Sua avaliação foi publicada." };
}

// ───────── Leads (newsletter e contato)

export async function captureLeadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ip } = await getRequestMeta();
  if (!rateLimit(`lead:${ip}`, 6, 10 * 60 * 1000).ok) return { ok: false, error: "Muitas solicitações. Tente novamente mais tarde." };
  // Campo-armadilha para bots: deve permanecer vazio.
  if (formData.get("website")) return { ok: true, message: "Recebido!" };
  const parsed = leadSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const data = parsed.data;
  const source = ["Newsletter", "Contato", "Pop-up", "Produto"].includes(data.source) ? data.source : "Site";

  const recent = await prisma.lead.findFirst({
    where: { email: data.email, source, createdAt: { gte: new Date(Date.now() - 86400000) } },
  });
  if (!recent) {
    await prisma.lead.create({ data: { name: data.name, email: data.email, interest: data.interest, source } });
    const settings = await getSettings();
    if (settings.notifyNewLead && settings.notificationEmail) {
      await sendEmail(
        settings.notificationEmail,
        `Novo lead: ${data.name}`,
        emailLayout(
          "Novo lead capturado",
          `<p><strong>${escapeHtml(data.name)}</strong> (${escapeHtml(data.email)}) via ${escapeHtml(source)}.</p>${data.interest ? `<p>Interesse: ${escapeHtml(data.interest)}</p>` : ""}`,
          { label: "Ver leads", url: absoluteUrl("/admin/leads") },
        ),
      );
    }
  }
  return {
    ok: true,
    message: source === "Contato" ? "Mensagem enviada! Responderemos em breve." : "Inscrição confirmada. Fique de olho no seu e-mail!",
  };
}

// ───────── Checkout & pedidos

export async function checkoutAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) redirect("/entrar?next=/checkout");
    throw e;
  }
  if (!user.emailVerifiedAt) return { ok: false, error: "Confirme seu e-mail antes de finalizar a compra." };
  if (!rateLimit(`checkout:${user.id}`, 10, 10 * 60 * 1000).ok) return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };

  const parsed = checkoutSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const provider = getPaymentProvider();
  if (!provider.methods.includes(parsed.data.paymentMethod))
    return { ok: false, fieldErrors: { paymentMethod: ["Forma de pagamento indisponível no momento."] }, error: "Revise os campos destacados." };

  // Gateways como a Iron Pay exigem CPF/CNPJ e telefone. Ficam salvos no perfil para a próxima compra.
  let buyer: { id: string; name: string; email: string; document: string | null; phone: string | null } = user;
  if (provider.requiresCustomerDocument) {
    const doc = documentSchema.safeParse(formData.get("document") ?? "");
    const phone = phoneDigitsSchema.safeParse(formData.get("phone") ?? "");
    if (!doc.success || !phone.success)
      return {
        ok: false,
        error: "Revise os campos destacados.",
        fieldErrors: {
          ...(doc.success ? {} : { document: doc.error.issues.map((i) => i.message) }),
          ...(phone.success ? {} : { phone: phone.error.issues.map((i) => i.message) }),
        },
      };
    await prisma.user.update({ where: { id: user.id }, data: { document: doc.data, phone: phone.data } });
    buyer = { ...user, document: doc.data, phone: phone.data };
  }

  let orderNumber: number;
  try {
    const summary = await getCartSummary();
    const order = await createOrderFromCart({ user: buyer, summary, paymentMethod: parsed.data.paymentMethod, notes: parsed.data.notes });
    orderNumber = order.number;
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    console.error("[checkout]", e);
    return { ok: false, error: "Não foi possível concluir o pedido. Tente novamente." };
  }
  refreshStore();
  redirect(`/conta/pedidos/${orderNumber}?novo=1`);
}

/** Apenas no provedor sandbox: o próprio cliente simula a aprovação do pagamento. */
export async function simulatePaymentAction(formData: FormData) {
  const user = await requireUser();
  if (!getPaymentProvider().isSandbox) throw new Error("Simulação indisponível em produção.");
  const orderId = String(formData.get("orderId") ?? "");
  const outcome = String(formData.get("outcome") ?? "PAID");
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order || order.paymentStatus !== "PENDING") return;
  if (outcome === "FAILED") {
    await changeOrderStatus(order.id, "CANCELLED", user.email, "Pagamento recusado (simulação sandbox).");
  } else {
    await markOrderPaid(order.id, user.email, "Pagamento aprovado (simulação sandbox).");
  }
  revalidatePath(`/conta/pedidos/${order.number}`);
}

/**
 * "Já paguei": consulta o status direto no gateway. Funciona mesmo se o postback se perder.
 * O cliente só consegue verificar os próprios pedidos.
 */
export async function checkPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!rateLimit(`paycheck:${user.id}`, 10, 5 * 60 * 1000).ok) return { ok: false, error: "Aguarde um pouco antes de verificar novamente." };
  const order = await prisma.order.findFirst({
    where: { id: String(formData.get("orderId") ?? ""), userId: user.id },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const payment = order?.payments[0];
  const provider = payment ? getProviderById(payment.provider) : null;
  if (!order || !payment?.providerRef || !provider?.fetchStatus) return { ok: false, error: "Verificação indisponível para este pedido." };
  if (order.paymentStatus === "PAID") return { ok: true, message: "Pagamento já confirmado." };

  try {
    const event = await provider.fetchStatus(payment.providerRef);
    if (event.status === "PENDING") return { ok: false, error: "Ainda não identificamos seu pagamento. Pix costuma cair em segundos; boleto, em até 2 dias úteis." };
    const result = await applyPaymentEvent(event, `cliente:${user.email}`);
    if (!result.ok) return { ok: false, error: "Não foi possível confirmar o pagamento. Fale com o suporte informando o número do pedido." };
  } catch {
    return { ok: false, error: "Não foi possível consultar o pagamento agora. Tente novamente em instantes." };
  }
  revalidatePath(`/conta/pedidos/${order.number}`);
  return { ok: true, message: "Status do pagamento atualizado." };
}

export async function cancelMyOrderAction(formData: FormData) {
  const user = await requireUser();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order || order.status !== "PENDING" || order.paymentStatus !== "PENDING") return;
  await changeOrderStatus(order.id, "CANCELLED", user.email, "Cancelado pelo cliente.");
  revalidatePath(`/conta/pedidos/${order.number}`);
  revalidatePath("/conta/pedidos");
}
