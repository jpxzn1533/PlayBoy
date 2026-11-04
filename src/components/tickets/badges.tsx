import type { TicketStatus, TicketType } from "@prisma/client";
import { Badge } from "@/components/ui/misc";

const STATUS_LABEL: Record<TicketStatus, string> = { OPEN: "Aguardando equipe", WAITING_CUSTOMER: "Respondido", CLOSED: "Encerrado" };
const STATUS_TONE = { OPEN: "warning", WAITING_CUSTOMER: "info", CLOSED: "neutral" } as const;

export function TicketStatusBadge({ status, type, delivered }: { status: TicketStatus; type?: TicketType; delivered?: boolean }) {
  if (type === "DELIVERY") {
    if (delivered) return <Badge tone="success">Entregue</Badge>;
    if (status === "CLOSED") return <Badge tone="neutral">Encerrado</Badge>;
    return <Badge tone="warning">Entrega pendente</Badge>;
  }
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
