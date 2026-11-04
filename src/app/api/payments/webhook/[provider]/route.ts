import { NextResponse } from "next/server";
import { getProviderById } from "@/lib/payments";
import { applyPaymentEvent } from "@/lib/orders";

/**
 * Endpoint de notificações dos provedores de pagamento.
 * Cada provedor valida a origem em `parseWebhook` (assinatura, segredo e/ou consulta à API);
 * eventos que não passam na validação são rejeitados.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await params;
  const provider = getProviderById(providerId);
  if (!provider || provider.isSandbox && process.env.NODE_ENV === "production" && process.env.ALLOW_SANDBOX_PAYMENTS !== "true")
    return NextResponse.json({ error: "Provedor desconhecido." }, { status: 404 });

  let event;
  try {
    event = await provider.parseWebhook(request);
  } catch (e) {
    // Falha ao consultar o provedor: 503 faz o gateway reenviar o aviso depois.
    console.error(`[webhook:${providerId}]`, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Não foi possível confirmar o pagamento agora." }, { status: 503 });
  }
  if (!event) return NextResponse.json({ error: "Notificação inválida." }, { status: 401 });
  if (event.status === "PENDING") return NextResponse.json({ received: true, status: "pending" });

  const result = await applyPaymentEvent(event, `webhook:${providerId}`);
  if (!result.ok && result.reason === "not_found") return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
  return NextResponse.json({ received: true, ...result });
}
