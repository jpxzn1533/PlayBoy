"use client";

import { useState, useTransition } from "react";
import type { LeadStatus } from "@prisma/client";
import { setLeadStatusAction } from "../_actions/leads";
import { LEAD_STATUS_LABEL, LEAD_STATUSES } from "@/lib/leads";
import { toast } from "@/components/store/toaster";
import { Select } from "@/components/ui/form";

export function LeadStatusSelect({ id, status }: { id: string; status: LeadStatus }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  return (
    <Select
      value={value}
      disabled={pending}
      aria-label="Etapa do lead"
      className="h-9 w-40 py-1.5 text-xs"
      onChange={(e) => {
        const next = e.target.value as LeadStatus;
        const prev = value;
        setValue(next);
        start(async () => {
          const res = await setLeadStatusAction(id, next);
          if (res.error) {
            setValue(prev);
            toast(res.error, "error");
          } else toast(res.message ?? "Atualizado.");
        });
      }}
    >
      {LEAD_STATUSES.map((s) => (<option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>))}
    </Select>
  );
}
