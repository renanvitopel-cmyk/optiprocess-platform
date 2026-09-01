# Plataforma OptiProcess

Site institucional, gestão interna e portal do cliente para a OptiProcess (instalação, manutenção
elétrica, instrumentação e calibração industrial). Monorepo com backend Node/Express/Prisma e
frontend React/Vite, pensado para rodar 100% em serviços gratuitos (Render + Neon Postgres +
Cloudflare R2).

## Sumário

- [Stack](#stack)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Rodando localmente](#rodando-localmente)
- [Dados de demonstração (seed)](#dados-de-demonstração-seed)
- [Deploy em produção (Render + Neon + R2)](#deploy-em-produção-render--neon--r2)
- [Segurança](#segurança)
- [Decisões e limitações conhecidas](#decisões-e-limitações-conhecidas)

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Query + React Hook Form + Zod + Recharts
- **Backend:** Node.js + Express + TypeScript + Prisma ORM
- **Banco:** PostgreSQL (Neon serverless em produção; Postgres local via Docker em dev)
- **Autenticação:** JWT em cookie `httpOnly`, senhas com bcrypt, RBAC por perfil (Admin, Técnico, Comercial, Cliente)
- **Armazenamento de arquivos:** camada `StorageProvider` compatível com S3 (Cloudflare R2 recomendado); disco local só em desenvolvimento
- **Hospedagem:** Render (um único Web Service serve a API e o build estático do front)

## Estrutura do projeto

```
optiprocess-platform/
  backend/
    prisma/schema.prisma   # modelo de dados completo
    prisma/seed.ts         # dados de demonstracao
    src/modules/           # um modulo por dominio (clients, calibrations, ...)
  frontend/
    src/pages/public/      # site institucional
    src/pages/admin/       # gestao interna ("/gestao")
    src/pages/portal/      # portal do cliente ("/portal")
  render.yaml
  .env.example
```

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- Docker Desktop (para o Postgres local) — ou uma connection string de um Postgres já disponível

### 1. Instalar dependências

```bash
npm install
```

### 2. Subir um Postgres local (Docker)

```bash
docker run -d --name optiprocess-postgres \
  -e POSTGRES_USER=optiprocess -e POSTGRES_PASSWORD=optiprocess -e POSTGRES_DB=optiprocess \
  -p 5434:5432 -v optiprocess_pgdata:/var/lib/postgresql/data postgres:16-alpine
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example backend/.env
```

Edite `backend/.env`: no mínimo confirme `DATABASE_URL` (já vem pronta para o container acima),
defina `JWT_SECRET` e `INITIAL_ADMIN_PASSWORD`. Com `STORAGE_PROVIDER=local` (padrão), os arquivos
enviados ficam em `backend/storage-local/` — apenas para desenvolvimento.

### 4. Rodar as migrações e o seed

```bash
npm run prisma:migrate --workspace backend
npm run seed --workspace backend
```

O seed cria o administrador inicial (a partir do `.env`), técnicos, comercial, clientes fictícios,
instrumentos, certificados de calibração (com PDF de demonstração e QR Code), laudos técnicos,
ordens de serviço, contratos, produtos e um pedido de exemplo.

### 5. Iniciar os dois servidores

Em dois terminais:

```bash
npm run dev:backend
npm run dev:frontend
```

Acesse `http://localhost:5173`. O Vite faz proxy de `/api` para `http://localhost:4000`.

### Logins de demonstração (senha `Demo@12345`, exceto o admin)

| Perfil | E-mail |
|---|---|
| Administrador | o e-mail definido em `INITIAL_ADMIN_EMAIL` |
| Técnico | rodnei@optiprocess.com.br |
| Comercial | comercial@optiprocess.com.br |
| Cliente (Metalvale) | portal@metalvale.com.br |
| Cliente (Campo Verde) | portal@campoverde.com.br |

## Dados de demonstração (seed)

O `prisma/seed.ts` é idempotente para a maioria das entidades (usa `upsert` por chave única), mas
calibrações e laudos são recriados a cada execução. Para recomeçar do zero:

```bash
npx prisma migrate reset --force --schema backend/prisma/schema.prisma
```

## Deploy em produção (Render + Neon + R2)

Todos os passos abaixo usam exclusivamente os planos gratuitos dos três serviços.

### 1. Banco de dados — Neon

1. Crie uma conta em [neon.tech](https://neon.tech) e um novo projeto.
2. Copie a **connection string com pooling** (o host termina em `-pooler`, ex.:
   `...-pooler.sa-east-1.aws.neon.tech`). Isso é importante: evita manter conexões abertas que
   impedem o Neon de hibernar e consomem a cota gratuita de CU-hrs.
3. Guarde essa string para o passo 3 (`DATABASE_URL`).

### 2. Armazenamento de arquivos — Cloudflare R2

1. Crie uma conta gratuita na Cloudflare e ative o R2.
2. Crie um bucket (ex.: `optiprocess-arquivos`) **privado** (não público — os downloads usam URL
   assinada com expiração curta).
3. Em "Manage R2 API Tokens", gere um token com permissão de leitura/escrita nesse bucket. Anote
   `Account ID`, `Access Key ID` e `Secret Access Key`.
4. O endpoint S3 é `https://<account-id>.r2.cloudflarestorage.com`.

### 3. Deploy no Render

1. Suba este repositório para o GitHub.
2. No Render, "New +" → "Blueprint" e aponte para o repositório (ele lê o `render.yaml`
   automaticamente) — ou crie um "Web Service" manual com:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
   - Health check path: `/api/ping`
3. Preencha as variáveis de ambiente marcadas como `sync: false` no `render.yaml`:
   - `DATABASE_URL`: a connection string pooled do Neon
   - `PUBLIC_URL`: a URL pública do serviço no Render (ex.: `https://optiprocess.onrender.com`)
   - `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`: credenciais do primeiro administrador
   - `STORAGE_PROVIDER=s3` e as credenciais do R2 (`S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`)
   - `WHATSAPP_NUMBER`: número comercial no formato internacional (ex.: `5515997847299`)
   - `JWT_SECRET` é gerado automaticamente pelo Render (`generateValue: true`)
4. Depois do primeiro deploy, rode as migrações contra o Neon (uma vez):
   ```bash
   DATABASE_URL="<connection string do Neon>" npm run prisma:deploy --workspace backend
   ```
   O administrador inicial já é criado automaticamente no primeiro boot do servidor (via
   `bootstrapInitialAdmin`), então este passo normalmente só aplica as migrações.
5. **Não é recomendado rodar o `seed` completo em produção** — ele cria clientes fictícios
   (Metalvale, Campo Verde etc.) que não fazem sentido num banco real. Se ainda assim quiser dados
   de demonstração em produção para testes, pode rodar (`npm run seed --workspace backend` com o
   `DATABASE_URL` do Neon); como o `NODE_ENV` é `production`, o seed detecta isso automaticamente e
   gera uma senha aleatória por usuário de demonstração (em vez da senha fixa usada em
   desenvolvimento), imprimindo cada uma **uma única vez** no log do comando — anote na hora.

### Monitoramento (opcional)

O plano gratuito do Render "dorme" o serviço após 15 min sem tráfego. Se usar um monitor de uptime
(ex.: UptimeRobot) para mantê-lo acordado, **aponte sempre para `/api/ping`** — essa rota nunca
consulta o banco. Apontar para `/` ou qualquer rota que use o Prisma mantém o Neon acordado 24h e
pode estourar a cota gratuita de CU-hrs.

## Segurança

- Senhas com bcrypt (custo 12); nunca armazenadas em texto puro.
- JWT em cookie `httpOnly` + `secure` (produção) + `sameSite=strict`.
- Toda rota valida o payload com Zod; Prisma parametriza queries (proteção contra SQL Injection).
- Cada usuário `CLIENT` só enxerga registros do próprio `clientId` — nunca confia em parâmetros
  vindos do cliente para esse filtro.
- Rate limiting em `/auth/login` e formulários públicos.
- Exclusão lógica (`deletedAt`) nas entidades de negócio críticas.
- Trilha de auditoria (`audit_logs`) em criações, edições, exclusões, aprovações e publicações.
- Downloads de PDF sempre via URL assinada de curta duração — nenhum bucket público.

## Decisões e limitações conhecidas

- **Sem envio de e-mail** (nenhum serviço, pago ou gratuito): reset de senha é feito pelo
  administrador no painel de Usuários, que gera uma senha temporária para repassar manualmente.
- **QR Code / leitura de certificado**: o QR aponta direto para a URL pública de validação — abre
  com a câmera nativa de qualquer celular, sem scanner dentro do app.
- **PDFs de certificados/laudos são upload**, não geração automática — o técnico anexa o PDF final
  emitido pelo laboratório/sistema de origem.
- Sem gateway de pagamento: pedidos registram forma e status de pagamento manualmente (Pix,
  boleto, outro), conforme pedido no escopo.
- Sem suíte de testes automatizados nesta entrega.
