import Link from "next/link";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import { AdminHeader, EmptyRow, FilterBar, Table, Td, Th } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/confirm-button";
import { Select } from "@/components/ui/form";
import { Badge, Pagination, Stars } from "@/components/ui/misc";
import { deleteReviewAction, toggleReviewAction } from "../_actions/reviews";

export const metadata = { title: "Avaliações" };
const PER_PAGE = 20;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("reviews");
  const sp = await searchParams;
  const nota = Number(firstParam(sp.nota)) || 0;
  const visibilidade = firstParam(sp.visibilidade) ?? "";
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);
  const where: Prisma.ReviewWhereInput = {
    ...(nota >= 1 && nota <= 5 && { rating: nota }),
    ...(visibilidade === "visiveis" && { approved: true }),
    ...(visibilidade === "ocultas" && { approved: false }),
  };
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { user: { select: { id: true, name: true } }, product: { select: { name: true, slug: true } } },
    }),
    prisma.review.count({ where }),
  ]);

  return (
    <div>
      <AdminHeader title="Avaliações" description="Modere as avaliações publicadas pelos clientes." />
      <FilterBar action="/admin/avaliacoes" resetHref="/admin/avaliacoes">
        <Select name="nota" defaultValue={nota ? String(nota) : ""} className="w-40" aria-label="Nota">
          <option value="">Todas as notas</option>
          {[5, 4, 3, 2, 1].map((n) => (<option key={n} value={n}>{n} estrela(s)</option>))}
        </Select>
        <Select name="visibilidade" defaultValue={visibilidade} className="w-40" aria-label="Visibilidade">
          <option value="">Todas</option>
          <option value="visiveis">Visíveis</option>
          <option value="ocultas">Ocultas</option>
        </Select>
      </FilterBar>
      <Table minWidth={880}>
        <thead><tr><Th>Nota</Th><Th>Comentário</Th><Th>Produto</Th><Th>Cliente</Th><Th>Data</Th><Th>Status</Th><Th className="text-right">Ações</Th></tr></thead>
        <tbody>
          {reviews.length === 0 && <EmptyRow colSpan={7} />}
          {reviews.map((r) => (
            <tr key={r.id} className="hover:bg-white/[0.02]">
              <Td><Stars value={r.rating} size={12} /></Td>
              <Td><p className="max-w-[300px] text-muted">{r.comment}</p></Td>
              <Td><Link href={`/produto/${r.product.slug}`} target="_blank" className="max-w-[180px] truncate hover:underline">{r.product.name}</Link></Td>
              <Td><Link href={`/admin/clientes/${r.user.id}`} className="hover:underline">{r.user.name}</Link></Td>
              <Td className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</Td>
              <Td><Badge tone={r.approved ? "success" : "neutral"}>{r.approved ? "Visível" : "Oculta"}</Badge></Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <ActionButton action={toggleReviewAction.bind(null, r.id)} size="icon" title={r.approved ? "Ocultar" : "Publicar"}>
                    {r.approved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </ActionButton>
                  <ActionButton action={deleteReviewAction.bind(null, r.id)} confirm="Excluir esta avaliação?" size="icon" title="Excluir" className="hover:text-danger"><Trash2 className="h-4 w-4" /></ActionButton>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-6">
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/avaliacoes" params={{ nota: nota ? String(nota) : undefined, visibilidade }} />
      </div>
    </div>
  );
}
