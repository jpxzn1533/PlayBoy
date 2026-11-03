import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { firstParam } from "@/lib/utils";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/confirm-button";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { deleteBannerAction } from "../_actions/settings";
import { BannerForm } from "./banner-form";

export const metadata = { title: "Banners" };

export default async function BannersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("settings");
  const editId = firstParam((await searchParams).editar);
  const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const editing = editId ? banners.find((b) => b.id === editId) : undefined;

  return (
    <div>
      <AdminHeader
        title="Banners"
        description="Banners promocionais exibidos no topo da página inicial."
        back={{ href: "/admin/configuracoes", label: "Configurações" }}
        actions={editing && <LinkButton href="/admin/banners" variant="outline"><Plus className="h-4 w-4" /> Novo banner</LinkButton>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-3">
          {banners.length === 0 && <EmptyState title="Nenhum banner" description="Sem banners, a página inicial exibe o slogan da loja." />}
          {banners.map((b) => (
            <div key={b.id} className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${editing?.id === b.id ? "border-fg/40" : ""}`}>
              <div className="aspect-[16/7] w-full shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:w-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.imageUrl ? <img src={b.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid-bg h-full w-full" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-subtle">#{b.sortOrder}</span>
                  <Badge tone={b.active ? "success" : "neutral"}>{b.active ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="mt-1 font-medium">{b.title}</p>
                {b.subtitle && <p className="line-clamp-1 text-sm text-muted">{b.subtitle}</p>}
                {b.ctaUrl && <p className="mt-1 text-xs text-subtle">{b.ctaLabel ?? "Ver mais"} → {b.ctaUrl}</p>}
              </div>
              <div className="flex gap-1">
                <Link href={`/admin/banners?editar=${b.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-fg" aria-label="Editar"><Pencil className="h-4 w-4" /></Link>
                <ActionButton action={deleteBannerAction.bind(null, b.id)} confirm="Excluir este banner?" size="icon" title="Excluir" className="hover:text-danger"><Trash2 className="h-4 w-4" /></ActionButton>
              </div>
            </div>
          ))}
        </div>
        <Panel title={editing ? "Editar banner" : "Novo banner"} className="h-fit">
          <BannerForm key={editing?.id ?? "new"} banner={editing} nextOrder={banners.length} />
        </Panel>
      </div>
    </div>
  );
}
