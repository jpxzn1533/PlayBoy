import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/misc";

const ORDER_LABEL: Record<OrderStatus, string> = {
  PENDING: "Aguardando pagamento",
  PROCESSING: "Em processamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};
const PAYMENT_LABEL: Record<PaymentStatus, string> = { PENDING: "Pendente", PAID: "Pago", FAILED: "Recusado", REFUNDED: "Reembolsado" };

const orderTone = { PENDING: "warning", PROCESSING: "info", COMPLETED: "success", CANCELLED: "danger", REFUNDED: "neutral" } as const;
const paymentTone = { PENDING: "warning", PAID: "success", FAILED: "danger", REFUNDED: "neutral" } as const;

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => <Badge tone={orderTone[status]}>{ORDER_LABEL[status]}</Badge>;
export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={paymentTone[status]}>{PAYMENT_LABEL[status]}</Badge>;
