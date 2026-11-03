import "server-only";
import type { PaymentMethod } from "@prisma/client";
import { sandboxProvider } from "./sandbox";
import { manualProvider } from "./manual";

/**
 * Contrato que todo provedor de pagamento deve implementar.
 * Para integrar um provedor autorizado (Mercado Pago, Stripe, Pagar.me...):
 *  1. crie src/lib/payments/<provedor>.ts implementando PaymentProvider;
 *  2. registre-o em `providers` abaixo;
 *  3. defina PAYMENT_PROVIDER=<provedor> e as credenciais no ambiente;
 *  4. aponte o webhook do provedor para /api/payments/webhook/<provedor>.
 */
export interface PaymentProvider {
  id: string;
  label: string;
  /** Provedores sandbox permitem confirmar o pagamento manualmente na tela do pedido. */
  isSandbox: boolean;
  /** Métodos aceitos no checkout. */
  methods: PaymentMethod[];
  createCharge(input: {
    orderId: string;
    orderNumber: number;
    amountCents: number;
    method: PaymentMethod;
    customer: { name: string; email: string };
  }): Promise<{ providerRef: string; instructions: PaymentInstructions }>;
  /** Valida a assinatura e normaliza o evento recebido via webhook. */
  parseWebhook(request: Request): Promise<{ providerRef: string; status: "PAID" | "FAILED" | "REFUNDED" } | null>;
}

export type PaymentInstructions =
  | { kind: "pix"; copyPaste: string; expiresAt: string }
  | { kind: "boleto"; barcode: string; dueDate: string }
  | { kind: "card"; message: string }
  | { kind: "manual-pix"; pixKey: string | null; holder: string | null; message: string };

const providers: Record<string, PaymentProvider> = {
  sandbox: sandboxProvider,
  manual: manualProvider,
};

const isProduction = () => process.env.NODE_ENV === "production" && process.env.ALLOW_SANDBOX_PAYMENTS !== "true";

/**
 * Provedor ativo. Em produção o sandbox é bloqueado: com ele qualquer cliente poderia
 * "aprovar" o próprio pagamento. Nesse caso cai para o Pix manual (o admin confirma).
 */
export function getPaymentProvider(id = process.env.PAYMENT_PROVIDER || (isProduction() ? "manual" : "sandbox")): PaymentProvider {
  if (id === "sandbox" && isProduction()) return manualProvider;
  const provider = providers[id];
  if (!provider) throw new Error(`Provedor de pagamento "${id}" não está configurado.`);
  return provider;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto bancário",
};
