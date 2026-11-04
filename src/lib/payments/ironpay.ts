import { timingSafeEqual } from "node:crypto";
import type { ChargeInput, PaymentEvent, PaymentProvider } from "./index";
import { PaymentProviderError } from "./errors";

/**
 * Integração com a Iron Pay (https://docs.ironpayapp.com.br).
 *
 * Autenticação: parâmetro `api_token` na query string. Valores sempre em centavos.
 *
 * Segurança: a documentação não descreve assinatura para os postbacks. Por isso o
 * postback é tratado apenas como um aviso — o status e o valor são SEMPRE confirmados
 * consultando GET /transactions/{hash} com o token da loja antes de liberar o pedido.
 * A URL de postback também carrega um segredo (PAYMENT_WEBHOOK_SECRET).
 *
 * Cartão de crédito fica desativado: a API recebe o número completo do cartão pelo
 * nosso servidor, o que exige certificação PCI DSS da loja.
 */

class TransactionNotFoundError extends PaymentProviderError {}

const API_URL = () => (process.env.IRONPAY_API_URL || "https://api.ironpayapp.com.br/api/public/v1").replace(/\/$/, "");
const HASH_RE = /^[A-Za-z0-9_-]{4,80}$/;

function config() {
  const token = process.env.IRONPAY_API_TOKEN;
  const offerHash = process.env.IRONPAY_OFFER_HASH;
  const productHash = process.env.IRONPAY_PRODUCT_HASH;
  if (!token || !offerHash || !productHash)
    throw new PaymentProviderError("Iron Pay não configurada: defina IRONPAY_API_TOKEN, IRONPAY_OFFER_HASH e IRONPAY_PRODUCT_HASH.");
  return { token, offerHash, productHash };
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && !Number.isNaN(Number(v)) ? Number(v) : undefined);

async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<Json> {
  const { token } = config();
  const url = `${API_URL()}${path}${path.includes("?") ? "&" : "?"}api_token=${encodeURIComponent(token)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new PaymentProviderError("Não foi possível conectar à Iron Pay. Tente novamente em instantes.");
  }
  const data = obj(await res.json().catch(() => ({})));
  if (!res.ok) {
    // Nunca registra a URL (contém o token).
    const errors = obj(data.errors);
    const detail = str(data.message) ?? (Object.values(errors).flat().map(String)[0] || null);
    console.error(`[ironpay] ${method} ${path.split("?")[0]} -> HTTP ${res.status}`, detail ?? "");
    if (res.status === 401) throw new PaymentProviderError("Token da Iron Pay inválido. Verifique IRONPAY_API_TOKEN.");
    if (res.status === 404 && method === "GET") throw new TransactionNotFoundError("Transação não encontrada na Iron Pay.");
    throw new PaymentProviderError(detail ? `Iron Pay recusou a cobrança: ${detail}` : "A Iron Pay recusou a cobrança. Revise seus dados e tente novamente.");
  }
  return data;
}

/** Converte o status da Iron Pay no status interno. Qualquer valor desconhecido fica pendente. */
export function mapIronpayStatus(raw: unknown): PaymentEvent["status"] {
  const s = String(raw ?? "").toLowerCase();
  if (["paid", "approved", "authorized", "completed"].includes(s)) return "PAID";
  if (["refunded", "chargeback", "chargedback", "chargeback_refunded"].includes(s)) return "REFUNDED";
  if (["canceled", "cancelled", "refused", "failed", "expired", "denied"].includes(s)) return "FAILED";
  return "PENDING";
}

/** Lê a transação no formato da criação (campos no topo) ou da consulta ({ data: {...} }). */
function readTransaction(payload: Json) {
  const t = Object.keys(obj(payload.data)).length ? obj(payload.data) : payload;
  return {
    hash: str(t.hash) ?? str(t.transaction_hash),
    status: t.payment_status ?? t.status,
    amount: num(t.amount_total) ?? num(t.amount),
    pix: obj(t.pix),
    billet: obj(t.billet),
  };
}

export const ironpayProvider: PaymentProvider = {
  id: "ironpay",
  label: "Iron Pay",
  isSandbox: false,
  methods: ["PIX", "BOLETO"],
  requiresCustomerDocument: true,

  async createCharge(input: ChargeInput) {
    const { offerHash, productHash } = config();
    if (!input.customer.document || !input.customer.phone) throw new PaymentProviderError("Informe CPF/CNPJ e telefone para pagar.");
    const method = input.method === "BOLETO" ? "billet" : "pix";

    // Um único item com o total do pedido: assim o valor do carrinho sempre bate com
    // `amount`, inclusive quando há cupom de desconto.
    const summary = input.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
    const title = `Pedido PB-${String(input.orderNumber).padStart(6, "0")} — ${summary}`.slice(0, 120);

    const data = await call("POST", "/transactions", {
      amount: input.amountCents,
      offer_hash: offerHash,
      payment_method: method,
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        phone_number: input.customer.phone,
        document: input.customer.document,
      },
      cart: [{ product_hash: productHash, title, cover: null, price: input.amountCents, quantity: 1, operation_type: 1, tangible: false }],
      installments: 1,
      expire_in_days: method === "billet" ? 3 : 1,
      transaction_origin: "api",
      postback_url: input.postbackUrl,
    });

    const tx = readTransaction(data);
    if (!tx.hash) throw new PaymentProviderError("A Iron Pay não retornou o identificador da transação.");

    if (method === "pix") {
      const code = str(tx.pix.pix_qr_code) ?? str(tx.pix.qr_code) ?? str(tx.pix.pix_code);
      if (!code) throw new PaymentProviderError("A Iron Pay não retornou o código Pix.");
      return {
        providerRef: tx.hash,
        instructions: { kind: "pix", copyPaste: code, expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString() },
      };
    }
    const barcode = str(tx.billet.boleto_barcode) ?? str(tx.billet.barcode);
    if (!barcode) throw new PaymentProviderError("A Iron Pay não retornou a linha digitável do boleto.");
    return {
      providerRef: tx.hash,
      instructions: {
        kind: "boleto",
        barcode,
        url: str(tx.billet.boleto_url),
        dueDate: str(tx.billet.boleto_expiration_date),
      },
    };
  },

  async fetchStatus(providerRef: string) {
    if (!HASH_RE.test(providerRef)) throw new PaymentProviderError("Identificador de transação inválido.");
    const tx = readTransaction(await call("GET", `/transactions/${encodeURIComponent(providerRef)}`));
    return { providerRef, status: mapIronpayStatus(tx.status), amountCents: tx.amount };
  },

  async parseWebhook(request: Request) {
    // 1) O postback precisa trazer o segredo que nós mesmos colocamos na URL.
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    const received = new URL(request.url).searchParams.get("secret") ?? "";
    if (!secret) return null;
    const a = Buffer.from(received);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    // 2) Do corpo usamos apenas o hash; o status vem da consulta à API.
    const body = obj(await request.json().catch(() => ({})));
    const hash = str(body.transaction_hash) ?? str(body.hash) ?? str(obj(body.data).hash);
    if (!hash || !HASH_RE.test(hash)) return null;
    try {
      return await ironpayProvider.fetchStatus!(hash);
    } catch (e) {
      // Hash que não existe na Iron Pay: aviso falso ou de outra conta — rejeita sem pedir reenvio.
      if (e instanceof TransactionNotFoundError) return null;
      throw e;
    }
  },
};
