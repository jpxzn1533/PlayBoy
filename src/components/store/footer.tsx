import Link from "next/link";
import { Lock, Mail, MessageCircle, Phone, Zap } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getActiveCategories } from "@/lib/catalog";
import { Logo } from "@/components/brand/logo";
import { LeadForm } from "./lead-form";

export async function Footer() {
  const [s, categories] = await Promise.all([getSettings(), getActiveCategories()]);
  const year = new Date().getFullYear();
  const social = [
    { href: s.instagramUrl, label: "Instagram" },
    { href: s.discordUrl, label: "Discord" },
    { href: s.youtubeUrl, label: "YouTube" },
  ].filter((x): x is { href: string; label: string } => !!x.href);

  return (
    <footer className="mt-24 border-t border-line bg-surface/60">
      <div className="container-pb grid gap-8 border-b border-line py-10 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="eyebrow mb-2">Newsletter {s.storeName}</p>
          <h2 className="heading-md text-xl">Lançamentos e ofertas exclusivas, direto no seu e-mail.</h2>
          <p className="mt-1.5 text-sm text-muted">Sem spam. Cancele quando quiser.</p>
        </div>
        <LeadForm source="Newsletter" compact />
      </div>

      <div className="container-pb grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo name={s.storeName} logoUrl={s.logoUrl} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{s.tagline} Produtos digitais próprios e serviços para gamers, criadores e equipes.</p>
          <ul className="mt-5 space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-subtle" /> {s.contactEmail}</li>
            {s.contactPhone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-subtle" /> {s.contactPhone}</li>}
            {s.whatsapp && <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-subtle" /> WhatsApp {s.whatsapp}</li>}
          </ul>
          {social.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {social.map((x) => (
                <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer" className="rounded-md border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg">
                  {x.label}
                </a>
              ))}
            </div>
          )}
        </div>
        <FooterCol title="Loja" links={[{ href: "/produtos", label: "Todos os produtos" }, { href: "/produtos?ofertas=1", label: "Ofertas" }, { href: "/produtos?ordem=popular", label: "Mais vendidos" }, ...categories.slice(0, 3).map((c) => ({ href: `/produtos?categoria=${c.slug}`, label: c.name }))]} />
        <FooterCol title="Minha conta" links={[{ href: "/conta", label: "Perfil" }, { href: "/conta/pedidos", label: "Pedidos" }, { href: "/conta/favoritos", label: "Favoritos" }, { href: "/carrinho", label: "Carrinho" }]} />
        <FooterCol title="Institucional" links={[{ href: "/institucional/sobre", label: `Sobre a ${s.storeName}` }, { href: "/institucional/ajuda", label: "Central de ajuda" }, { href: "/institucional/contato", label: "Contato" }, { href: "/institucional/termos", label: "Termos de uso" }, { href: "/institucional/privacidade", label: "Privacidade" }, { href: "/institucional/reembolso", label: "Reembolso" }]} />
      </div>

      <div className="border-t border-line">
        <div className="container-pb flex flex-col gap-3 py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {s.storeName}. Todos os direitos reservados.
            {s.companyName && ` ${s.companyName}`}
            {s.companyDocument && ` · CNPJ ${s.companyDocument}`}
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Compra segura</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Entrega digital</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fg">{title}</p>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-sm text-muted transition-colors hover:text-fg">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
