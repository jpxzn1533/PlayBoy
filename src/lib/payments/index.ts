import "server-only";
import type { PaymentMethod } from "@prisma/client";
import { sandboxProvider } from "./sandbox";
import { manualProvider } from "./manual";
import { ironpayProvider } from "./ironpay";

/**
 * Contrato que todo provedor de pagamento deve implementar.
 * Para integrar outro provedor autorizado:
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
  /** Exige CPF/CNPJ e telefone do cliente no checkout. */
  requiresCustomerDocument: boolean;
  createCharge(input: ChargeInput): Promise<{ providerRef: string; instructions: PaymentInstructions }>;
  /**
   * Interpreta uma notificação recebida no webhook. Deve validar a origem e, quando o
   * provedor não assina as notificações, confirmar o status consultando a API.
   */
  parseWebhook(request: Request): Promise<PaymentEvent | null>;
  /** Consulta o status atual direto no provedor (usado para conferência manual). */
  fetchStatus?(providerRef: string): Promise<PaymentEvent>;
}

export type ChargeInput = {
  orderId: string;
  orderNumber: number;
  amountCents: number;
  method: PaymentMethod;
  customer: { name: string; email: string; document: string | null; phone: string | null };
  items: { name: string; unitCents: number; quantity: number }[];
  postbackUrl: string;
};

export type PaymentEvent = {
  providerRef: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  /** Valor confirmado pelo provedor, quando disponível (conferido com o pedido). */
  amountCents?: number;
};

export type PaymentInstructions =
  | { kind: "pix"; copyPaste: string; expiresAt: string | null }
  | { kind: "boleto"; barcode: string; dueDate: string | null; url?: string | null }
  | { kind: "card"; message: string }
  | { kind: "manual-pix"; pixKey: string | null; holder: string | null; message: string };

export { PaymentProviderError } from "./errors";

const providers: Record<string, PaymentProvider> = {
  sandbox: sandboxProvider,
  manual: manualProvider,
  ironpay: ironpayProvider,
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

/** Provedor que gerou um pagamento já registrado (pode diferir do ativo hoje). */
export function getProviderById(id: string): PaymentProvider | null {
  return providers[id] ?? null;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto bancário",
};
