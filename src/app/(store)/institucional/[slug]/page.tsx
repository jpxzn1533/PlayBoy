import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { LeadForm } from "@/components/store/lead-form";

type Page = { title: string; intro: string; sections: { heading: string; body: string[] }[] };

const PAGES: Record<string, (store: string) => Page> = {
  sobre: (store) => ({
    title: `Sobre a ${store}`,
    intro: `A ${store} nasceu para oferecer à comunidade gamer produtos digitais próprios e serviços com padrão premium: curadoria rigorosa, entrega imediata e atendimento de verdade.`,
    sections: [
      { heading: "O que fazemos", body: ["Desenvolvemos overlays, presets, guias, ferramentas e serviços especializados para jogadores, streamers e equipes. Tudo é criado ou validado pelo nosso time."] },
      { heading: "Nossos compromissos", body: ["Transparência nos preços, segurança no pagamento, proteção dos seus dados e suporte rápido antes e depois da compra."] },
    ],
  }),
  ajuda: () => ({
    title: "Central de ajuda",
    intro: "Respostas rápidas para as dúvidas mais comuns.",
    sections: [
      { heading: "Como recebo meu produto?", body: ["Produtos digitais são liberados na sua conta (Minha conta → Histórico de compras) assim que o pagamento é aprovado, e também enviados ao seu e-mail."] },
      { heading: "Quais formas de pagamento são aceitas?", body: ["Pix (aprovação imediata), cartão de crédito em até 12x e boleto bancário (até 2 dias úteis)."] },
      { heading: "Preciso confirmar meu e-mail?", body: ["Sim. A confirmação garante que seus produtos cheguem ao endereço correto e protege sua conta."] },
      { heading: "Como funcionam os serviços?", body: ["Após a confirmação do pagamento, nossa equipe entra em contato em até 24h para agendar e alinhar os detalhes."] },
      { heading: "Esqueci minha senha", body: ["Use a opção “Esqueceu a senha?” na tela de login. Você receberá um link válido por 1 hora."] },
    ],
  }),
  termos: (store) => ({
    title: "Termos de uso",
    intro: `Ao utilizar a ${store}, você concorda com os termos abaixo.`,
    sections: [
      { heading: "1. Conta", body: ["Você é responsável por manter a confidencialidade das suas credenciais e por todas as atividades realizadas na sua conta."] },
      { heading: "2. Produtos digitais", body: ["Os produtos são licenciados para uso pessoal, salvo indicação em contrário na página do produto. É proibida a redistribuição."] },
      { heading: "3. Pagamentos", body: ["Os pedidos são confirmados somente após a aprovação do pagamento pelo provedor responsável."] },
      { heading: "4. Conduta", body: ["É vedado o uso da plataforma para fins ilícitos, fraudes ou violação de direitos de terceiros."] },
    ],
  }),
  privacidade: (store) => ({
    title: "Política de privacidade",
    intro: `A ${store} trata seus dados pessoais de acordo com a Lei Geral de Proteção de Dados (LGPD).`,
    sections: [
      { heading: "Dados coletados", body: ["Nome, e-mail, telefone (opcional) e informações dos pedidos. Dados de pagamento são processados diretamente pelo provedor de pagamento e não são armazenados por nós."] },
      { heading: "Finalidade", body: ["Processar pedidos, entregar produtos, prestar suporte e, com seu consentimento, enviar comunicações de marketing."] },
      { heading: "Avisos de compras na loja", body: ["A loja pode exibir avisos de compras recentes mostrando apenas o primeiro nome e a inicial do sobrenome do comprador e o produto adquirido. Nenhum outro dado é exibido. Para não aparecer nesses avisos, entre em contato conosco."] },
      { heading: "Segurança", body: ["Senhas são armazenadas com hash criptográfico, sessões são protegidas e o acesso administrativo é registrado e auditado."] },
      { heading: "Seus direitos", body: ["Você pode solicitar acesso, correção ou exclusão dos seus dados pelo nosso canal de contato."] },
    ],
  }),
  reembolso: () => ({
    title: "Política de reembolso",
    intro: "Queremos que você fique satisfeito com sua compra.",
    sections: [
      { heading: "Produtos digitais", body: ["Você pode solicitar reembolso em até 7 dias após a compra, conforme o Código de Defesa do Consumidor, desde que o conteúdo não tenha sido totalmente consumido ou baixado."] },
      { heading: "Serviços", body: ["Serviços não iniciados podem ser reembolsados integralmente. Serviços em andamento são avaliados caso a caso."] },
      { heading: "Como solicitar", body: ["Entre em contato informando o número do pedido (formato PB-000000)."] },
    ],
  }),
  contato: () => ({
    title: "Contato",
    intro: "Fale com a nossa equipe. Respondemos em até 1 dia útil.",
    sections: [],
  }),
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSettings();
  const page = PAGES[slug]?.(s.storeName);
  return { title: page?.title ?? "Página não encontrada" };
}

export default async function InstitutionalPage({ params }: Props) {
  const { slug } = await params;
  const s = await getSettings();
  const page = PAGES[slug]?.(s.storeName);
  if (!page) notFound();

  return (
    <div className="container-pb max-w-3xl pt-14">
      <p className="eyebrow mb-3">{s.storeName}</p>
      <h1 className="heading-xl text-4xl sm:text-5xl">{page.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">{page.intro}</p>

      {slug === "contato" ? (
        <div className="mt-10 grid gap-6 md:grid-cols-[1fr_240px]">
          <div className="card p-6">
            <LeadForm source="Contato" interestLabel="Como podemos ajudar?" />
          </div>
          <aside className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-subtle">E-mail</p>
              <p>{s.contactEmail}</p>
            </div>
            {s.contactPhone && (<div><p className="text-xs text-subtle">Telefone</p><p>{s.contactPhone}</p></div>)}
            {s.whatsapp && (<div><p className="text-xs text-subtle">WhatsApp</p><p>{s.whatsapp}</p></div>)}
            {s.businessHours && (<div><p className="text-xs text-subtle">Atendimento</p><p>{s.businessHours}</p></div>)}
            {s.address && (<div><p className="text-xs text-subtle">Endereço</p><p>{s.address}</p></div>)}
          </aside>
        </div>
      ) : (
        <div className="prose-pb mt-6">
          {page.sections.map((sec) => (
            <section key={sec.heading}>
              <h2>{sec.heading}</h2>
              {sec.body.map((b, i) => (<p key={i}>{b}</p>))}
            </section>
          ))}
          <p className="mt-10 text-sm">
            Ainda com dúvidas? <Link href="/institucional/contato" className="link-underline text-fg">Fale conosco</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
