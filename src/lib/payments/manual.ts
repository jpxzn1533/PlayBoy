import { randomToken } from "@/lib/auth/crypto";
import type { PaymentProvider } from "./index";

/**
 * Pix manual: o cliente paga para a chave Pix da loja e o administrador confirma
 * o recebimento em Admin → Pedidos → "Confirmar pagamento". Sem webhook.
 */
export const manualProvider: PaymentProvider = {
  id: "manual",
  label: "Pix manual (confirmação pelo admin)",
  isSandbox: false,
  methods: ["PIX"],
  requiresCustomerDocument: false,

  async createCharge() {
    const pixKey = process.env.PIX_KEY || null;
    return {
      providerRef: `man_${randomToken(12)}`,
      instructions: {
        kind: "manual-pix",
        pixKey,
        holder: process.env.PIX_KEY_HOLDER || null,
        message: pixKey
          ? "Faça o Pix com o valor exato do pedido para a chave abaixo. Assim que confirmarmos o recebimento, seus produtos são liberados na sua conta."
          : "Nossa equipe enviará as instruções de pagamento para o seu e-mail. Após a confirmação, seus produtos são liberados na sua conta.",
      },
    };
  },

  async parseWebhook() {
    return null;
  },
};
