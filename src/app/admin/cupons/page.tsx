import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDate, formatMoney } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import { AdminHeader, EmptyRow, Panel, Table, Td, Th } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/confirm-button";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { deleteCouponAction, toggleCouponAction } from "../_actions/coupons";
import { CouponForm } from "./coupon-form";

export const metadata = { title: "Cupons" };

export default async function CouponsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("coupons");
  const editId = firstParam((await searchParams).editar);
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { orders: true } } } });
  const editing = editId ? coupons.find((c) => c.id === editId) : undefined;
  const now = new Date();

  const state = (c: (typeof coupons)[number]) => {
    if (!c.active) return { tone: "neutral" as const, label: "Inativo" };
    if (c.expiresAt && c.expiresAt < now) return { tone: "danger" as const, label: "Expirado" };
    if (c.startsAt && c.startsAt > now) return { tone: "info" as const, label: "Agendado" };
    if (c.maxUses !== null && c.usedCount >= c.maxUses) return { tone: "warning" as const, label: "Esgotado" };
    return { tone: "success" as const, label: "Ativo" };
  };

  return (
    <div>
      <AdminHeader
        title="Cupons"
        description="Crie e gerencie cupons de desconto da loja."
        actions={editing && <LinkButton href="/admin/cupons" variant="outline"><Plus className="h-4 w-4" /> Novo cupom</LinkButton>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Table minWidth={760}>
          <thead><tr><Th>Código</Th><Th>Desconto</Th><Th>Pedido mín.</Th><Th>Usos</Th><Th>Validade</Th><Th>Status</Th><Th className="text-right">Ações</Th></tr></thead>
          <tbody>
            {coupons.length === 0 && <EmptyRow colSpan={7} text="Nenhum cupom cadastrado." />}
            {coupons.map((c) => {
              const st = state(c);
              return (
                <tr key={c.id} className={editing?.id === c.id ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}>
                  <Td>
                    <p className="font-mono font-semibold">{c.code}</p>
                    {c.description && <p className="max-w-[200px] truncate text-xs text-subtle">{c.description}</p>}
                  </Td>
                  <Td className="font-medium">{c.type === "PERCENT" ? `${c.value}%` : formatMoney(c.value)}</Td>
                  <Td className="text-muted">{c.minOrderCents ? formatMoney(c.minOrderCents) : "—"}</Td>
                  <Td className="tabular-nums">{c.usedCount}{c.maxUses !== null && <span className="text-subtle"> / {c.maxUses}</span>}</Td>
                  <Td className="whitespace-nowrap text-muted">{c.expiresAt ? `até ${formatDate(c.expiresAt)}` : "Sem expiração"}</Td>
                  <Td>
                    <ActionButton action={toggleCouponAction.bind(null, c.id)} className="h-auto px-0 hover:bg-transparent" title={c.active ? "Desativar" : "Ativar"}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </ActionButton>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/cupons?editar=${c.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-fg" aria-label="Editar"><Pencil className="h-4 w-4" /></Link>
                      <ActionButton action={deleteCouponAction.bind(null, c.id)} confirm={`Excluir o cupom ${c.code}?`} size="icon" title="Excluir" className="hover:text-danger"><Trash2 className="h-4 w-4" /></ActionButton>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <Panel title={editing ? `Editar ${editing.code}` : "Novo cupom"} className="h-fit">
          <CouponForm key={editing?.id ?? "new"} coupon={editing} />
        </Panel>
      </div>
    </div>
  );
}
