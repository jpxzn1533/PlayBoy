# PLAYBOY STORE

Plataforma e-commerce gamer premium para produtos digitais próprios e serviços: loja pública, área do cliente e painel administrativo independente, conectados a um banco PostgreSQL real.

**Stack:** Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 6 · Zod · Recharts · bcrypt

## Como rodar

Requisitos: Node.js 20+.

```bash
npm install
```

```bash
npm run db:local
```

Esse comando sobe um **PostgreSQL real** local (via `embedded-postgres`, sem instalar nada no sistema) na porta 5433, com os dados em `.pgdata/`. Deixe-o aberto em um terminal. Se você já tem um PostgreSQL, ignore este passo e aponte `DATABASE_URL` no `.env` para ele.

Em outro terminal:

```bash
npm run db:push
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Acesse http://localhost:3000. O painel fica em http://localhost:3000/admin.

### Dados iniciais

`npm run db:seed` deixa a loja **limpa**: só a conta de administrador (e-mail e senha em `SEED_ADMIN_*` no `.env`), as configurações e as categorias. Cadastre seus produtos em `/admin/produtos`. Categorias sem produtos ficam ocultas na loja.

Para testar com dados fictícios, use `npm run db:seed:demo`, que também cria um cliente de demonstração (`SEED_CUSTOMER_*`). O modo demo gera 4 meses de histórico fictício (≈140 clientes, ≈600 pedidos, visitas, leads e avaliações) para testar o painel. **Não use o modo demo na loja real**: os pedidos fictícios apareceriam no aviso de compras e as avaliações na vitrine. Os dois comandos apagam os dados existentes.

## Funcionalidades

**Loja** — home com banners, destaques, ofertas, mais vendidos, novidades e avaliações · catálogo com busca, filtro por categoria/preço/ofertas, ordenação e paginação · página de produto com galeria, especificações, disponibilidade, avaliações (só de quem comprou) e relacionados · carrinho (visitante ou logado, mesclado no login) · cupons · checkout · páginas institucionais e contato.

**Cliente** — cadastro, login, logout, verificação de e-mail, recuperação de senha, perfil, histórico de compras e de pagamentos, favoritos, troca de senha e gestão de sessões ativas.

**Admin** (`/admin`) — visão geral com KPIs e gráficos (faturamento, vendas, crescimento de clientes, mais vendidos, conversão) filtráveis por hoje/7/30/90 dias/período personalizado · produtos (CRUD, imagens, preço, desconto, estoque, ativar/desativar, destacar) · categorias (CRUD, imagem, ordem) · pedidos (busca, filtros, detalhes, status, confirmação de pagamento) · clientes (histórico, total gasto, suspensão) · leads (funil Novo → Em contato → Interessado → Convertido/Perdido, conversão) · cupons · avaliações · configurações (nome, logotipo, cores, dados comerciais, notificações) · banners · permissões administrativas granulares · registro de atividades · caixa de saída de e-mails.

## Atendimento e entrega manual

- **Entrega manual por produto:** marque "Entrega manual" no cadastro do produto (ex.: contas). Após o pagamento, o pedido fica **Em processamento** e abre automaticamente um chat de entrega com a mensagem de boas-vindas (texto em `src/lib/tickets.ts`, `DELIVERY_WELCOME_MESSAGE`).
- **Admin → Entrega de contas:** fila de entregas pendentes (mais antigas primeiro). No chat, o botão "Modelo de entrega" preenche login/senha; depois **Marcar como entregue** conclui o pedido, encerra o chat e avisa o cliente por e-mail.
- **Admin → Atendimento:** tickets abertos pelos clientes em **Minha conta → Atendimento**, com abas Pendentes / Respondidos / Encerrados.
- Os números ao lado das abas no menu mostram as pendências (tickets aguardando a equipe e entregas não concluídas). As conversas se atualizam sozinhas a cada 8 segundos.
- Os e-mails avisam que há resposta, mas **não incluem o conteúdo** (que pode ter dados de acesso); o cliente lê no site, logado.
- Permissão administrativa **"Atendimento e entrega de contas"** permite dar acesso só a essa área para atendentes.

## Pagamentos

- **`sandbox`** (desenvolvimento): instruções de Pix/boleto simuladas e o cliente pode simular aprovação ou recusa. Nenhuma cobrança real. **Bloqueado em produção** — com ele qualquer cliente aprovaria o próprio pedido. Se estiver configurado em produção, a loja usa o modo manual automaticamente.
- **`manual`** (padrão em produção): só Pix. O pedido mostra a chave `PIX_KEY` ao cliente; quando o dinheiro cair, confirme em **Admin → Pedidos → Confirmar pagamento** e os produtos são liberados.
- **`ironpay`**: [Iron Pay](https://docs.ironpayapp.com.br) com **Pix (QR Code + copia e cola)** e **boleto**, confirmação automática.

### Iron Pay

**Configuração (painel da Iron Pay):**
1. Gere o **token de API** em Configurações → API.
2. Crie um **produto digital** (ex.: "Pedido PLAYBOY STORE") com uma **oferta**, e copie o hash de cada um. A API exige esses dois hashes; o valor cobrado é sempre o total do pedido da loja (com cupons), enviado como um único item "Pedido PB-000123 — itens…".

**Variáveis (Vercel):** `PAYMENT_PROVIDER=ironpay`, `IRONPAY_API_TOKEN`, `IRONPAY_OFFER_HASH`, `IRONPAY_PRODUCT_HASH`, `PAYMENT_WEBHOOK_SECRET` (texto aleatório longo) e `APP_URL` com o domínio público — a URL de postback é montada automaticamente: `APP_URL/api/payments/webhook/ironpay?secret=…`.

**Como funciona:**
- No checkout o cliente informa CPF/CNPJ (validado pelos dígitos verificadores) e telefone, exigidos pela Iron Pay; ficam salvos no perfil.
- A página do pedido mostra o QR Code Pix ou a linha digitável/PDF do boleto, e um botão **"Já paguei — verificar pagamento"** que consulta a Iron Pay na hora.
- **Segurança do postback:** a Iron Pay não assina as notificações. Por isso a loja exige o segredo na URL e **nunca confia no conteúdo do aviso**: usa só o hash da transação e confirma status e valor em `GET /transactions/{hash}` com o token da loja. Valor divergente não libera o pedido.
- Se a cobrança não puder ser criada, o pedido é cancelado, o estoque devolvido e os itens voltam ao carrinho.
- Pagamento recebido em pedido já cancelado não reabre o pedido: fica registrado no histórico e a equipe recebe um e-mail para estornar pelo painel da Iron Pay.
- **Cartão de crédito fica desativado**: a API da Iron Pay recebe o número completo do cartão pelo servidor da loja, o que exige certificação PCI DSS. Use o checkout/link de pagamento da própria Iron Pay se quiser oferecer cartão.
- Reembolsos são feitos no painel da Iron Pay; depois marque o pedido como **Reembolsado** no admin (ou aguarde o postback).

Para integrar outro provedor (Mercado Pago, Stripe, Pagar.me…), implemente a interface `PaymentProvider` em `src/lib/payments/`, registre-a em `src/lib/payments/index.ts` e aponte o webhook do provedor para `/api/payments/webhook/<provedor>`. O fluxo de pedido (reserva de estoque, confirmação, cancelamento e reembolso) já está pronto em `src/lib/orders.ts`.

## E-mails

Sem SMTP configurado, os e-mails (verificação, recuperação de senha, confirmação de pagamento, alertas) ficam registrados em **Admin → E-mails enviados**, onde dá para abri-los e clicar nos links. Para envio real, preencha `SMTP_*` no `.env`.

## Segurança

- Senhas com bcrypt (custo 12); resposta de login com tempo constante para não revelar contas existentes
- Sessões no banco com token aleatório em cookie `httpOnly`/`SameSite=Lax`; só o hash SHA-256 do token é guardado; expiração deslizante; encerramento de sessões pelo usuário
- Tokens de verificação/redefinição de uso único, com hash e expiração; troca de senha derruba as outras sessões
- Permissões checadas no servidor em cada página, server action e rota de API (o middleware é só uma checagem otimista)
- Validação de todas as entradas com Zod no backend
- Prisma com consultas parametrizadas (inclusive as SQL brutas, via `Prisma.sql`) contra SQL injection
- Rate limiting em login, cadastro, recuperação de senha, cupons, checkout e formulários públicos
- Upload valida a assinatura binária da imagem, limita tamanho e gera nomes aleatórios; a rota de arquivos bloqueia path traversal
- Registro de auditoria de todas as ações administrativas (quem, o quê, quando, IP)
- Cabeçalhos de segurança (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)

- RLS ativado em todas as tabelas (migração `enable_rls`): a Data API pública do Supabase não acessa nada; a aplicação conecta pelo Prisma como dona das tabelas

## Deploy: Supabase + Vercel

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região São Paulo, `sa-east-1`) e guarde a senha do banco.
2. Em **Connect** (topo do painel) → **ORMs → Prisma**, copie as duas URLs:
   - `DATABASE_URL` → *Transaction pooler*, porta **6543**, com `?pgbouncer=true&connection_limit=1` no final
   - `DIRECT_URL` → *Session pooler*, porta **5432**
3. Em **Project Settings → API**, copie a *Project URL* (`SUPABASE_URL`) e a chave **service_role** (`SUPABASE_SERVICE_ROLE_KEY`). Essa chave dá acesso total: use só no servidor (variável da Vercel), nunca no navegador nem no Git.
4. O bucket público `uploads` do Storage é criado sozinho no primeiro envio de imagem pelo painel.

### 2. Banco de produção (da sua máquina, uma vez)

Crie um arquivo `.env.production.local` (já ignorado pelo Git) com `DATABASE_URL`, `DIRECT_URL`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` (**use um e-mail real e uma senha forte nova**). Depois, no PowerShell:

```bash
npm run db:deploy:prod
```

```bash
npm run db:seed:prod
```

Isso cria as tabelas, ativa o RLS e cria sua conta de administrador, as configurações e as categorias. O seed se recusa a rodar em banco remoto que já tenha pedidos ou produtos.

### 3. Vercel

1. Suba o projeto para um repositório no GitHub e importe em [vercel.com/new](https://vercel.com/new). O framework (Next.js) é detectado sozinho; o build usa o script `vercel-build` (gera o Prisma Client, aplica migrações pendentes e compila).
2. Em **Settings → Environment Variables**, cadastre:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | URL do Transaction pooler (6543, com `?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | URL do Session pooler (5432) |
| `SUPABASE_URL` | Project URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service_role |
| `SUPABASE_STORAGE_BUCKET` | `uploads` |
| `APP_URL` | `https://seu-dominio.com.br` (links dos e-mails) |
| `PAYMENT_PROVIDER` | `ironpay` (ou `manual` para Pix manual) |
| `IRONPAY_API_TOKEN` / `IRONPAY_OFFER_HASH` / `IRONPAY_PRODUCT_HASH` | dados da sua conta Iron Pay (veja a seção Pagamentos) |
| `PAYMENT_WEBHOOK_SECRET` | texto aleatório longo (protege a URL de postback) |
| `PIX_KEY` / `PIX_KEY_HOLDER` | sua chave Pix e o nome do titular |
| `SMTP_*` | dados do seu provedor de e-mail (Resend, Brevo, SES…) |

Não cadastre `LOCAL_DB_*`, `SEED_*` nem `ALLOW_SANDBOX_PAYMENTS`.

3. Faça o deploy, entre em `/entrar` com a conta de administrador, revise **Admin → Configurações** (contato, CNPJ, redes sociais, e-mail de notificações) e cadastre seus produtos.

### Observações de produção

- **E-mail é obrigatório:** sem SMTP, clientes não recebem o link de verificação e não conseguem comprar (a verificação de e-mail é exigida no checkout).
- **Mudanças no schema:** rode `npm run db:migrate` localmente para gerar a migração e faça commit da pasta `prisma/migrations`; a Vercel aplica no próximo deploy.
- **Rate limiting** é em memória por instância. Com tráfego alto, troque `src/lib/rate-limit.ts` por Upstash Redis (integração nativa da Vercel).
- **Limite de upload:** 4 MB por imagem (limite de corpo das funções da Vercel).
- Revise as páginas institucionais (termos, privacidade, reembolso) com assessoria jurídica.

## Estrutura

```
prisma/            schema e seed
scripts/           PostgreSQL local
src/app/(store)/   loja pública e área do cliente
src/app/admin/     painel administrativo (+ _actions com as server actions)
src/app/actions/   server actions da loja e autenticação
src/app/api/       tracking de visitas, upload, webhook de pagamentos
src/components/    ui (base), store, admin, brand
src/lib/           auth, carrinho, pedidos, pagamentos, analytics, validação, e-mail
```
