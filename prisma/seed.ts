/**
 * Seed da PLAYBOY STORE. Padrão: loja limpa (admin, configurações e categorias).
 * Com --demo (npm run db:seed:demo): catálogo, clientes, pedidos, visitas, leads e avaliações fictícios
 * com ~4 meses de histórico, para testar o painel com dados de exemplo.
 * Uso: npm run db:seed  (apaga os dados existentes antes de inserir)
 */
import { PrismaClient, type OrderStatus, type PaymentMethod, type PaymentStatus, type LeadStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// PRNG determinístico para dados reproduzíveis
let seed = 20261102;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const DAY = 86400000;
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ───────── Arte de capa (SVG monocromático gerado)

function coverSvg(title: string, label: string, variant: number, w = 800, h = 600) {
  const shapes: string[] = [];
  const cx = w * (0.62 + (variant % 3) * 0.06);
  const cy = h * 0.42;
  if (variant % 4 === 0) for (let i = 0; i < 7; i++) shapes.push(`<circle cx="${cx}" cy="${cy}" r="${40 + i * 34}" fill="none" stroke="#fff" stroke-opacity="${0.5 - i * 0.06}" stroke-width="1.5"/>`);
  if (variant % 4 === 1) for (let i = 0; i < 9; i++) shapes.push(`<rect x="${cx - 150 + i * 14}" y="${cy - 150 + i * 14}" width="${300 - i * 28}" height="${300 - i * 28}" fill="none" stroke="#fff" stroke-opacity="${0.45 - i * 0.04}" transform="rotate(${i * 6} ${cx} ${cy})"/>`);
  if (variant % 4 === 2) for (let i = 0; i < 14; i++) shapes.push(`<line x1="${cx - 220}" y1="${cy - 130 + i * 20}" x2="${cx + 220}" y2="${cy - 190 + i * 28}" stroke="#fff" stroke-opacity="${0.08 + (i % 4) * 0.08}" stroke-width="1.5"/>`);
  if (variant % 4 === 3) {
    const pts = (r: number) => Array.from({ length: 6 }, (_, k) => `${cx + r * Math.cos((Math.PI / 3) * k)},${cy + r * Math.sin((Math.PI / 3) * k)}`).join(" ");
    for (let i = 0; i < 6; i++) shapes.push(`<polygon points="${pts(50 + i * 40)}" fill="none" stroke="#fff" stroke-opacity="${0.5 - i * 0.07}" stroke-width="1.5"/>`);
  }
  const words = title.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > 18) {
      lines.push(line.trim());
      line = word;
    } else line += " " + word;
  }
  lines.push(line.trim());
  const text = lines.slice(0, 3).map((l, i) => `<text x="56" y="${h - 70 - (Math.min(lines.length, 3) - 1 - i) * 52}" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#fff" letter-spacing="-1">${esc(l)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
<radialGradient id="g" cx="70%" cy="35%" r="80%"><stop offset="0" stop-color="#2a2a2a"/><stop offset="0.55" stop-color="#111"/><stop offset="1" stop-color="#080808"/></radialGradient>
<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity="0.04"/></pattern>
<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#080808" stop-opacity="0"/><stop offset="1" stop-color="#080808" stop-opacity="0.95"/></linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#p)"/>
${shapes.join("\n")}
<rect width="${w}" height="${h}" fill="url(#f)"/>
${text}
</svg>`;
}

const publicDir = path.join(process.cwd(), "public", "seed");
mkdirSync(publicDir, { recursive: true });
function writeCover(name: string, title: string, label: string, variant: number, w?: number, h?: number) {
  writeFileSync(path.join(publicDir, `${name}.svg`), coverSvg(title, label, variant, w, h));
  return `/seed/${name}.svg`;
}

// ───────── Catálogo

const CATEGORIES = [
  { name: "Overlays & Stream", description: "Pacotes visuais completos para lives e vídeos." },
  { name: "Configurações & Presets", description: "Configs otimizadas, presets de edição e perfis." },
  { name: "Guias & E-books", description: "Conteúdo aprofundado para evoluir no jogo." },
  { name: "Coaching & Serviços", description: "Sessões e serviços com especialistas." },
  { name: "Ferramentas & Bots", description: "Bots, automações e ferramentas para comunidades." },
  { name: "Packs Visuais", description: "Wallpapers, ícones, emotes e efeitos sonoros." },
];

type P = { name: string; cat: number; price: number; discount?: number; stock: number; platform: string; short: string; delivery?: string; specs: [string, string][]; featured?: boolean; popularity: number };

const PRODUCTS: P[] = [
  { name: "Overlay Pack Monochrome Pro", cat: 0, price: 89.9, discount: 15, stock: 120, platform: "OBS / Streamlabs", short: "Pacote completo de overlays em preto e branco com cenas, alertas e transições animadas.", specs: [["Formato", "WEBM + PNG"], ["Cenas", "6 cenas prontas"], ["Resolução", "1920×1080"]], featured: true, popularity: 10 },
  { name: "Kit Alertas Animados Neon Mute", cat: 0, price: 49.9, stock: 200, platform: "OBS / Streamlabs", short: "24 alertas animados para follows, subs, doações e raids, com sons inclusos.", specs: [["Alertas", "24 variações"], ["Sons", "Inclusos"], ["Formato", "WEBM"]], popularity: 7 },
  { name: "Painéis de Perfil Twitch Essentials", cat: 0, price: 29.9, stock: 300, platform: "Twitch", short: "Painéis de perfil minimalistas e editáveis para organizar seu canal.", specs: [["Painéis", "16 + editáveis"], ["Formato", "PSD + PNG"]], popularity: 5 },
  { name: "Tela de Intervalo Cinematic", cat: 0, price: 39.9, discount: 20, stock: 150, platform: "OBS / Streamlabs", short: "Telas de início, pausa e encerramento com animação cinematográfica.", specs: [["Telas", "4 animadas"], ["Duração", "Loop contínuo"]], popularity: 4 },
  { name: "Config Competitiva FPS Ultra", cat: 1, price: 34.9, stock: 500, platform: "PC", short: "Configuração otimizada de sistema e jogo para máximo FPS e menor input lag.", specs: [["Compatibilidade", "Windows 10/11"], ["Inclui", "Guia passo a passo"]], featured: true, popularity: 9 },
  { name: "Presets de Edição Cinemático Gamer", cat: 1, price: 59.9, discount: 10, stock: 250, platform: "Premiere / DaVinci", short: "40 presets de cor e transição para montar highlights com acabamento profissional.", specs: [["Presets", "40"], ["Softwares", "Premiere Pro, DaVinci Resolve"]], popularity: 6 },
  { name: "Perfil de Áudio Pro para Streams", cat: 1, price: 24.9, stock: 400, platform: "PC", short: "Cadeia de filtros de microfone pronta: gate, compressor e EQ ajustados.", specs: [["Filtros", "Noise gate, compressor, EQ, limiter"]], popularity: 5 },
  { name: "Pack de Sensibilidade e Mira", cat: 1, price: 19.9, stock: 600, platform: "PC / Console", short: "Tabelas de sensibilidade e rotinas de treino de mira para jogos de tiro.", specs: [["Rotinas", "12 planilhas"], ["Formato", "PDF + planilha"]], popularity: 4 },
  { name: "Guia Definitivo de Ranked", cat: 2, price: 47.9, stock: 800, platform: "Multiplataforma", short: "E-book com mentalidade, rotina de treino e análise de partidas para subir de elo.", specs: [["Páginas", "148"], ["Formato", "PDF + EPUB"]], featured: true, popularity: 8 },
  { name: "E-book Como Crescer na Twitch", cat: 2, price: 37.9, discount: 25, stock: 800, platform: "Multiplataforma", short: "Estratégias práticas de conteúdo, frequência e comunidade para canais iniciantes.", specs: [["Páginas", "96"], ["Bônus", "Checklist de lives"]], popularity: 7 },
  { name: "Manual do Shotcaller", cat: 2, price: 29.9, stock: 800, platform: "Multiplataforma", short: "Comunicação, tomada de decisão e liderança para quem comanda o time.", specs: [["Páginas", "72"]], popularity: 3 },
  { name: "Coaching Individual 1h", cat: 3, price: 149.9, stock: 30, platform: "Online", delivery: "Agendamento em até 24h", short: "Sessão ao vivo com coach: análise de gameplay, plano de evolução e tira-dúvidas.", specs: [["Duração", "60 minutos"], ["Formato", "Chamada de vídeo"], ["Inclui", "Gravação da sessão"]], featured: true, popularity: 6 },
  { name: "Análise de VOD Detalhada", cat: 3, price: 79.9, stock: 50, platform: "Online", delivery: "Entrega em até 72h", short: "Envie sua partida e receba análise em vídeo com pontos de melhoria comentados.", specs: [["Entrega", "Vídeo comentado"], ["Prazo", "Até 72h"]], popularity: 5 },
  { name: "Setup e Otimização Remota de PC", cat: 3, price: 119.9, discount: 10, stock: 25, platform: "PC", delivery: "Agendamento em até 24h", short: "Otimização completa do seu PC por acesso remoto seguro, com relatório final.", specs: [["Duração média", "90 minutos"], ["Inclui", "Relatório antes/depois"]], popularity: 4 },
  { name: "Montagem de Servidor Discord", cat: 3, price: 199.9, stock: 15, platform: "Discord", delivery: "Entrega em até 5 dias", short: "Servidor completo: cargos, canais, permissões, bots e identidade visual.", specs: [["Prazo", "Até 5 dias úteis"], ["Revisões", "2 rodadas"]], popularity: 3 },
  { name: "Bot de Moderação Discord Pro", cat: 4, price: 69.9, stock: 300, platform: "Discord", short: "Bot próprio com automod, logs, tickets e cargos automáticos. Licença vitalícia.", specs: [["Licença", "Vitalícia"], ["Recursos", "Automod, logs, tickets"]], featured: true, popularity: 6 },
  { name: "Painel de Torneios", cat: 4, price: 99.9, discount: 15, stock: 100, platform: "Web", short: "Ferramenta para organizar campeonatos: chaves, inscrições e placares em tempo real.", specs: [["Formato", "Aplicação web"], ["Times", "Até 64"]], popularity: 3 },
  { name: "Widget de Metas para Lives", cat: 4, price: 27.9, stock: 500, platform: "OBS / Streamlabs", short: "Barras de metas e contadores animados conectados aos eventos da sua live.", specs: [["Widgets", "8"], ["Integração", "Twitch, YouTube"]], popularity: 4 },
  { name: "Wallpapers Monochrome Collection", cat: 5, price: 14.9, stock: 1000, platform: "PC / Mobile", short: "60 wallpapers em alta resolução com estética preto e branco premium.", specs: [["Quantidade", "60"], ["Resolução", "Até 4K"]], popularity: 5 },
  { name: "Pack de Emotes Personalizados", cat: 5, price: 54.9, stock: 80, platform: "Twitch / Discord", delivery: "Entrega em até 4 dias", short: "Criação de 6 emotes exclusivos no estilo do seu canal.", specs: [["Emotes", "6 personalizados"], ["Tamanhos", "28, 56, 112 px"]], popularity: 4 },
  { name: "Efeitos Sonoros para Highlights", cat: 5, price: 22.9, discount: 30, stock: 600, platform: "Multiplataforma", short: "120 efeitos sonoros livres de direitos para vídeos e lives.", specs: [["Arquivos", "120 WAV"], ["Licença", "Uso comercial"]], popularity: 4 },
  { name: "Ícones de Interface Gamer", cat: 5, price: 18.9, stock: 0, platform: "Multiplataforma", short: "300 ícones vetoriais para overlays, thumbnails e interfaces.", specs: [["Ícones", "300"], ["Formato", "SVG + PNG"]], popularity: 2 },
  { name: "Thumbnail Kit para YouTube", cat: 5, price: 32.9, stock: 400, platform: "Photoshop / Canva", short: "30 modelos de thumbnail editáveis com tipografia de alto impacto.", specs: [["Modelos", "30"], ["Formato", "PSD + Canva"]], popularity: 5 },
  { name: "Assinatura Mensal PLAYBOY Club", cat: 4, price: 24.9, stock: 999, platform: "Multiplataforma", delivery: "Acesso imediato", short: "Todo mês: novos packs, presets e descontos exclusivos para membros.", specs: [["Ciclo", "Mensal"], ["Benefícios", "Conteúdo + 10% OFF na loja"]], popularity: 5 },
];

const FIRST = ["Lucas", "Gabriel", "Rafael", "Matheus", "Pedro", "João", "Gustavo", "Felipe", "Bruno", "Thiago", "Ana", "Beatriz", "Larissa", "Camila", "Juliana", "Mariana", "Isabela", "Letícia", "Vinícius", "Diego", "Caio", "Leonardo", "Rodrigo", "Eduardo", "Amanda", "Carolina", "Fernanda", "Gabriela", "Renan", "Igor"];
const LAST = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Ribeiro", "Martins", "Rocha", "Gomes", "Barbosa", "Freitas", "Moreira"];
const REVIEWS = [
  [5, "Qualidade absurda, entrega na hora. Superou o que eu esperava."],
  [5, "Material muito bem feito e fácil de configurar. Recomendo demais."],
  [5, "Atendimento excelente e o produto é exatamente o que promete."],
  [4, "Muito bom! Só senti falta de mais variações, mas valeu cada centavo."],
  [5, "Mudou completamente a cara da minha live. Visual premium de verdade."],
  [4, "Conteúdo bem organizado, já vi resultado nas primeiras semanas."],
  [5, "Comprei, recebi em segundos e já estava usando. Loja confiável."],
  [3, "Bom produto, mas precisei de ajuda do suporte para configurar."],
  [5, "Coach extremamente didático, saí com um plano claro de evolução."],
  [4, "Ótimo custo-benefício. Compraria de novo."],
] as const;

// Sem flag: loja limpa (admin, configurações e categorias). Com --demo: histórico fictício completo para testes.
const DEMO = process.argv.includes("--demo");

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const customerEmail = process.env.SEED_CUSTOMER_EMAIL;
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no .env");

  // Proteção: o seed APAGA tudo. Em bancos remotos (ex.: Supabase), só roda se ainda estiver vazio.
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");
  if (!isLocal && !process.argv.includes("--force")) {
    const [orders, products] = await Promise.all([prisma.order.count(), prisma.product.count()]);
    if (orders > 0 || products > 0)
      throw new Error(`Banco remoto com ${orders} pedido(s) e ${products} produto(s). O seed apagaria tudo; use --force se for realmente isso que você quer.`);
  }

  console.log("Limpando dados...");
  await prisma.$transaction([
    prisma.visit.deleteMany(), prisma.auditLog.deleteMany(), prisma.emailMessage.deleteMany(), prisma.orderStatusHistory.deleteMany(),
    prisma.payment.deleteMany(), prisma.orderItem.deleteMany(), prisma.order.deleteMany(), prisma.cartItem.deleteMany(), prisma.cart.deleteMany(),
    prisma.review.deleteMany(), prisma.favorite.deleteMany(), prisma.productImage.deleteMany(), prisma.product.deleteMany(), prisma.category.deleteMany(),
    prisma.coupon.deleteMany(), prisma.lead.deleteMany(), prisma.banner.deleteMany(), prisma.session.deleteMany(), prisma.authToken.deleteMany(),
    prisma.user.deleteMany(), prisma.storeSettings.deleteMany(),
  ]);

  const now = Date.now();
  const START = now - 120 * DAY;

  await prisma.storeSettings.create({
    data: {
      id: 1,
      logoUrl: "/brand/logo.png",
      notificationEmail: adminEmail,
      // Dados de contato fictícios apenas no modo demonstração; na loja real, preencha pelo painel.
      ...(DEMO && {
        contactPhone: "(11) 4000-0000",
        whatsapp: "(11) 90000-0000",
        businessHours: "Seg. a sáb., 9h às 21h",
        companyName: "PLAYBOY STORE Produtos Digitais LTDA",
        instagramUrl: "https://instagram.com/",
        discordUrl: "https://discord.com/",
      }),
    },
  });

  console.log("Administrador...");
  const admin = await prisma.user.create({
    data: { name: "Administrador PLAYBOY", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: "ADMIN", permissions: ["*"], emailVerifiedAt: new Date(DEMO ? START : now), createdAt: new Date(DEMO ? START : now) },
  });

  console.log("Categorias...");
  const categories = [];
  for (const [i, c] of CATEGORIES.entries()) {
    const s = slug(c.name);
    categories.push(await prisma.category.create({ data: { ...c, slug: s, sortOrder: i, imageUrl: writeCover(`cat-${s}`, c.name, "Categoria", i, 800, 640) } }));
  }

  if (!DEMO) {
    console.log(`\n✔ Loja pronta, sem produtos: cadastre os seus em /admin/produtos.`);
    console.log(`  Admin: ${adminEmail} (senha definida em SEED_ADMIN_PASSWORD no .env)`);
    console.log(`  Para dados de demonstração: npm run db:seed:demo`);
    return;
  }

  console.log("Clientes (demo)...");

  const unusableHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
  const customers: { id: string; name: string; email: string; createdAt: Date }[] = [];
  if (customerEmail && customerPassword) {
    const demo = await prisma.user.create({
      data: { name: "Cliente Demonstração", email: customerEmail, passwordHash: await bcrypt.hash(customerPassword, 12), emailVerifiedAt: new Date(START + 2 * DAY), createdAt: new Date(START + 2 * DAY), lastActiveAt: new Date(now - DAY) },
    });
    customers.push(demo);
  }
  // Crescimento gradual: mais cadastros nas semanas recentes
  for (let i = 0; i < 140; i++) {
    const t = Math.pow(rand(), 0.75);
    const createdAt = new Date(START + t * (now - START));
    const first = pick(FIRST);
    const last = pick(LAST);
    const user = await prisma.user.create({
      data: {
        name: `${first} ${last}`,
        email: `${slug(first)}.${slug(last)}${i}@exemplo.com.br`,
        passwordHash: unusableHash,
        emailVerifiedAt: rand() > 0.1 ? createdAt : null,
        status: rand() > 0.97 ? "SUSPENDED" : "ACTIVE",
        createdAt,
        lastActiveAt: new Date(Math.min(now, createdAt.getTime() + rand() * (now - createdAt.getTime()))),
      },
    });
    customers.push(user);
  }

  console.log("Produtos (demo)...");
  const products = [];
  for (const [i, p] of PRODUCTS.entries()) {
    const s = slug(p.name);
    const cat = categories[p.cat];
    const images = [0, 1, 2].map((k) => writeCover(`${s}-${k + 1}`, p.name, cat.name, i + k));
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: s,
        shortDescription: p.short,
        description: `${p.short}\n\nDesenvolvido pela equipe da PLAYBOY STORE com foco em qualidade, desempenho e facilidade de uso. Após a confirmação do pagamento, o acesso é liberado na sua conta e enviado por e-mail.\n\nInclui suporte dedicado e atualizações gratuitas sempre que houver melhorias.`,
        priceCents: Math.round(p.price * 100),
        discountPercent: p.discount ?? 0,
        sku: `PB-${String(i + 1).padStart(4, "0")}`,
        stock: p.stock,
        featured: !!p.featured,
        platform: p.platform,
        deliveryType: p.delivery ?? "Entrega digital imediata",
        specs: p.specs.map(([label, value]) => ({ label, value })),
        categoryId: cat.id,
        createdAt: new Date(START - (PRODUCTS.length - i) * DAY * 2 + (i > 18 ? 110 * DAY : 0)),
        images: { create: images.map((url, k) => ({ url, sortOrder: k })) },
      },
    });
    products.push({ ...product, popularity: p.popularity });
  }

  console.log("Cupons e banners...");
  const coupons = await Promise.all([
    prisma.coupon.create({ data: { code: "BEMVINDO10", description: "10% na primeira compra", type: "PERCENT", value: 10, createdAt: new Date(START) } }),
    prisma.coupon.create({ data: { code: "PLAYBOY20", description: "20% acima de R$ 100", type: "PERCENT", value: 20, minOrderCents: 10000, maxUses: 500, createdAt: new Date(START) } }),
    prisma.coupon.create({ data: { code: "DESCONTO15", description: "R$ 15 OFF acima de R$ 60", type: "FIXED", value: 1500, minOrderCents: 6000, createdAt: new Date(START) } }),
    prisma.coupon.create({ data: { code: "BLACKOUT", description: "Campanha encerrada", type: "PERCENT", value: 30, active: false, expiresAt: new Date(now - 10 * DAY), createdAt: new Date(START) } }),
  ]);

  await prisma.banner.createMany({
    data: [
      { title: "Eleve o nível da sua stream.", subtitle: "Overlays, alertas e ferramentas premium criados pela PLAYBOY STORE. Entrega imediata.", ctaLabel: "Ver overlays", ctaUrl: "/produtos?categoria=overlays-stream", imageUrl: writeCover("banner-1", "", "Stream", 0, 1920, 800), sortOrder: 0 },
      { title: "Coaching com quem joga no topo.", subtitle: "Sessões individuais, análise de VOD e plano de evolução personalizado.", ctaLabel: "Agendar sessão", ctaUrl: "/produtos?categoria=coaching-servicos", imageUrl: writeCover("banner-2", "", "Coaching", 1, 1920, 800), sortOrder: 1 },
      { title: "Ofertas de até 30% OFF.", subtitle: "Presets, packs visuais e guias com preço especial por tempo limitado.", ctaLabel: "Ver ofertas", ctaUrl: "/produtos?ofertas=1", imageUrl: writeCover("banner-3", "", "Ofertas", 3, 1920, 800), sortOrder: 2 },
    ],
  });

  console.log("Pedidos (pode levar alguns segundos)...");
  const weighted = products.flatMap((p) => Array(p.popularity).fill(p));
  const sold = new Map<string, number>();
  const purchases = new Map<string, Set<string>>();
  const couponUses = new Map<string, number>();
  const methods: PaymentMethod[] = ["PIX", "PIX", "PIX", "CREDIT_CARD", "CREDIT_CARD", "BOLETO"];
  let created = 0;

  for (let d = 119; d >= 0; d--) {
    const dayStart = now - d * DAY;
    const growth = 1 + (119 - d) / 60;
    const weekend = new Date(dayStart).getDay() % 6 === 0 ? 1.4 : 1;
    const ordersToday = Math.round((1 + rand() * 3) * growth * weekend);
    for (let o = 0; o < ordersToday; o++) {
      const createdAt = new Date(Math.min(now - 60000, dayStart - rand() * DAY * 0.9));
      const eligible = customers.filter((c) => c.createdAt <= createdAt);
      if (eligible.length === 0) continue;
      const customer = pick(eligible);
      const lines = new Map<string, { p: (typeof products)[number]; q: number }>();
      const n = rand() > 0.7 ? int(2, 3) : 1;
      for (let k = 0; k < n; k++) {
        const p = pick(weighted);
        if (p.stock === 0) continue;
        lines.set(p.id, { p, q: (lines.get(p.id)?.q ?? 0) + (rand() > 0.9 ? 2 : 1) });
      }
      if (lines.size === 0) continue;
      const items = [...lines.values()].map(({ p, q }) => {
        const unit = Math.round(p.priceCents * (1 - p.discountPercent / 100));
        return { productId: p.id, productName: p.name, unitPriceCents: unit, quantity: q, totalCents: unit * q };
      });
      const subtotal = items.reduce((s, i) => s + i.totalCents, 0);
      let coupon: (typeof coupons)[number] | null = null;
      if (rand() > 0.8) {
        const c = pick(coupons.slice(0, 3));
        if (subtotal >= c.minOrderCents) coupon = c;
      }
      const discount = coupon ? Math.min(subtotal, coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value) : 0;
      const total = subtotal - discount;
      const method = pick(methods);
      const ageDays = (now - createdAt.getTime()) / DAY;
      const r = rand();
      let status: OrderStatus = "COMPLETED";
      let pay: PaymentStatus = "PAID";
      if (ageDays < 2 && r < 0.35) { status = "PENDING"; pay = "PENDING"; }
      else if (r < 0.08) { status = "CANCELLED"; pay = "FAILED"; }
      else if (r < 0.1) { status = "REFUNDED"; pay = "REFUNDED"; }
      const paidAt = pay === "PAID" || pay === "REFUNDED" ? new Date(createdAt.getTime() + (method === "BOLETO" ? int(6, 40) * 3600000 : int(1, 15) * 60000)) : null;
      if (paidAt && paidAt.getTime() > now) { status = "PENDING"; pay = "PENDING"; }

      const history: { status: OrderStatus; note: string; createdAt: Date; createdBy?: string }[] = [{ status: "PENDING", note: "Pedido criado pelo cliente.", createdAt }];
      if (status === "COMPLETED") history.push({ status: "COMPLETED", note: "Pagamento confirmado.", createdAt: paidAt! });
      if (status === "CANCELLED") history.push({ status: "CANCELLED", note: "Pagamento não confirmado no prazo.", createdAt: new Date(createdAt.getTime() + DAY) });
      if (status === "REFUNDED") history.push({ status: "COMPLETED", note: "Pagamento confirmado.", createdAt: paidAt! }, { status: "REFUNDED", note: "Reembolso solicitado pelo cliente.", createdAt: new Date(paidAt!.getTime() + 2 * DAY), createdBy: adminEmail });

      await prisma.order.create({
        data: {
          userId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          status,
          paymentStatus: pay === "REFUNDED" ? "REFUNDED" : pay,
          paymentMethod: method,
          subtotalCents: subtotal,
          discountCents: discount,
          totalCents: total,
          couponId: coupon?.id,
          couponCode: coupon?.code,
          paidAt: pay === "PAID" ? paidAt : null,
          createdAt,
          items: { create: items },
          payments: { create: { provider: "sandbox", method, amountCents: total, status: pay, providerRef: `sbx_${randomBytes(9).toString("base64url")}`, createdAt } },
          history: { create: history },
        },
      });
      created++;
      if (coupon && status !== "CANCELLED" && status !== "REFUNDED") couponUses.set(coupon.id, (couponUses.get(coupon.id) ?? 0) + 1);
      if (pay === "PAID") {
        for (const i of items) {
          sold.set(i.productId, (sold.get(i.productId) ?? 0) + i.quantity);
          if (!purchases.has(customer.id)) purchases.set(customer.id, new Set());
          purchases.get(customer.id)!.add(i.productId);
        }
      }
    }
  }
  for (const p of products) {
    const s = sold.get(p.id) ?? 0;
    await prisma.product.update({ where: { id: p.id }, data: { salesCount: s, stock: p.stock === 0 ? 0 : Math.max(p.stock - s, int(2, 12)) } });
  }
  for (const [id, n] of couponUses) await prisma.coupon.update({ where: { id }, data: { usedCount: n } });

  console.log("Avaliações...");
  for (const [userId, productIds] of purchases) {
    for (const productId of productIds) {
      if (rand() > 0.45) continue;
      const [rating, comment] = pick(REVIEWS);
      await prisma.review.create({ data: { userId, productId, rating, comment, createdAt: new Date(now - rand() * 100 * DAY) } });
    }
  }

  console.log("Favoritos...");
  for (const c of customers.slice(0, 60)) {
    const favs = new Set([pick(products).id, pick(products).id]);
    for (const productId of favs) await prisma.favorite.create({ data: { userId: c.id, productId } });
  }

  console.log("Visitas...");
  const paths = ["/", "/produtos", ...products.map((p) => `/produto/${p.slug}`), "/carrinho", "/institucional/ajuda"];
  for (let d = 119; d >= 0; d--) {
    const dayStart = now - d * DAY;
    const growth = 1 + (119 - d) / 50;
    const visitors = Math.round((50 + rand() * 50) * growth);
    const rows = [];
    for (let v = 0; v < visitors; v++) {
      const visitorId = randomBytes(12).toString("base64url");
      const views = int(1, 5);
      for (let k = 0; k < views; k++) rows.push({ visitorId, path: k === 0 ? "/" : pick(paths), createdAt: new Date(Math.min(now - 1000, dayStart - rand() * DAY * 0.95)) });
    }
    await prisma.visit.createMany({ data: rows });
  }

  console.log("Leads...");
  const sources = ["Newsletter", "Newsletter", "Newsletter", "Contato", "Instagram", "Discord", "Indicação", "Evento"];
  const interests = ["Overlays para live", "Coaching individual", "Montagem de servidor Discord", "Presets de edição", "Parcerias", "Pacote para equipe", null];
  const leadStatuses: LeadStatus[] = ["NEW", "NEW", "NEW", "CONTACTED", "CONTACTED", "INTERESTED", "CONVERTED", "CONVERTED", "LOST"];
  for (let i = 0; i < 110; i++) {
    const createdAt = new Date(now - Math.pow(rand(), 1.3) * 118 * DAY);
    const first = pick(FIRST);
    const last = pick(LAST);
    const age = (now - createdAt.getTime()) / DAY;
    await prisma.lead.create({
      data: {
        name: `${first} ${last}`,
        email: `${slug(first)}${slug(last)}${int(10, 999)}@exemplo.com.br`,
        source: pick(sources),
        interest: pick(interests),
        status: age < 3 ? "NEW" : pick(leadStatuses),
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: "create", entity: "Configurações", entityId: "loja", createdAt: new Date(START), ip: "seed" },
      { userId: admin.id, action: "create", entity: "Cupom", entityId: coupons[1].id, details: { code: "PLAYBOY20" }, createdAt: new Date(START + DAY), ip: "seed" },
    ],
  });

  console.log(`\n✔ Seed concluído: ${customers.length} clientes, ${products.length} produtos, ${created} pedidos.`);
  console.log(`  Admin: ${adminEmail} (senha definida em SEED_ADMIN_PASSWORD no .env)`);
  if (customerEmail) console.log(`  Cliente demo: ${customerEmail} (senha em SEED_CUSTOMER_PASSWORD no .env)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
