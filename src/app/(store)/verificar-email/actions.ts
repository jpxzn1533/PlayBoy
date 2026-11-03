"use server";

import { redirect } from "next/navigation";
import { verifyEmailToken } from "@/app/actions/auth";
import type { ActionState } from "@/lib/validation";

export async function confirmEmailAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const ok = await verifyEmailToken(String(formData.get("token") ?? ""));
  if (!ok) return { ok: false, error: "Link inválido ou expirado." };
  redirect("/verificar-email?status=ok");
}
