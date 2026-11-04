import { createHmac, timingSafeEqual } from "node:crypto";
import { randomToken } from "@/lib/auth/crypto";
import type { PaymentProvider } from "./index";

/** Provedor simulado para desenvolvimento e homologação. Nenhuma cobrança real é feita. */
export const sandboxProvider: PaymentProvider = {
  id: "sandbox",
  label: "Sandbox (simulado)",
  isSandbox: true,
  methods: ["PIX", "CREDIT_CARD", "BOLETO"],
  requiresCustomerDocument: false,

  async createCharge({ orderNumber, amountCents, method }) {
    const providerRef = `sbx_${randomToken(12)}`;
    if (method === "PIX") {
      return {
        providerRef,
        instructions: {
          kind: "pix",
          copyPaste: `00020126SANDBOX-PLAYBOYSTORE-${orderNumber}-${amountCents}5204000053039865802BR6304TEST`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      };
    }
    if (method === "BOLETO") {
      return {
        providerRef,
        instructions: {
          kind: "boleto",
          barcode: `23790.00009 ${String(orderNumber).padStart(5, "0")}.000000 00000.000000 0 ${String(amountCents).padStart(10, "0")}`,
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        },
      };
    }
    return {
      providerRef,
      instructions: { kind: "card", message: "Ambiente de testes: confirme o pagamento simulado para concluir o pedido." },
    };
  },

  async parseWebhook(request) {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) return null;
    const body = await request.text();
    const signature = request.headers.get("x-signature") ?? "";
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(body) as { providerRef?: string; status?: string };
    if (!data.providerRef || !["PAID", "FAILED", "REFUNDED"].includes(data.status ?? "")) return null;
    return { providerRef: data.providerRef, status: data.status as "PAID" | "FAILED" | "REFUNDED" };
  },
};
