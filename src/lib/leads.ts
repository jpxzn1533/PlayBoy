import type { LeadStatus } from "@prisma/client";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Novo",
  CONTACTED: "Em contato",
  INTERESTED: "Interessado",
  CONVERTED: "Convertido",
  LOST: "Perdido",
};

export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[];

export const LEAD_TONE = { NEW: "info", CONTACTED: "warning", INTERESTED: "neutral", CONVERTED: "success", LOST: "danger" } as const;
