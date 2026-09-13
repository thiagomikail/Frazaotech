# CRM Hotmart

Painel de analytics e CRM proprio sobre a API da Hotmart. Espelha vendas,
assinaturas e engajamento num Postgres seu e responde o que o painel nativo
nao responde: **quanto sobra de verdade, quem esta prestes a cancelar, e
tudo que se sabe sobre uma pessoa numa tela so.**

## Faca isto primeiro (antes de qualquer codigo)

**Ligue o webhook no painel da Hotmart hoje.** Carrinho abandonado,
`SWITCH_PLAN` e alguns eventos de assinatura **nao tem endpoint de
historico**: so existe o que chega no momento em que chega. Cada dia com o
webhook desligado e dado perdido pra sempre — e nenhum backfill recupera.

Hotmart > seu produto > Ferramentas > Webhook (Postback):

- Versao **2.0.0**
- URL: `https://<seu-app>.vercel.app/api/webhook/hotmart`
- Eventos: todos os `PURCHASE_*`, `SUBSCRIPTION_CANCELLATION`, `SWITCH_PLAN`,
  `UPDATE_SUBSCRIPTION_CHARGE_DATE`, `PURCHASE_OUT_OF_SHOPPING_CART`,
  e os `CLUB_*` se voce usa area de membros.

O endpoint aceita e guarda o evento cru mesmo antes do resto do app existir.

## Como sobe

```bash
cp .env.example .env
npm run gerar:segredos -- "sua senha do painel"   # cola a saida no .env
# preencha DATABASE_URL, DIRECT_URL e as credenciais da Hotmart

npm install
npm run db:push            # cria as tabelas no Supabase
npm run hotmart:testar     # ⚠️ confira o LIQUIDO antes de carregar tudo
npm run hotmart:backfill -- 2023-01-01
npm run dev
```

### Por que `hotmart:testar` vem antes do backfill

O mapeamento de campo em `lib/ingestao/normalizar.ts` foi escrito contra a
documentacao da Hotmart, **nao contra a sua conta**. O script puxa uma venda
e imprime o payload cru ao lado do normalizado. Compare o **liquido** com o
seu extrato: se divergir, o ajuste e numa funcao so (`calcularLiquido`) e
custa minutos. Descobrir depois custa um painel inteiro com numero errado.

## As quatro camadas

| Camada | Onde | O que faz |
|---|---|---|
| Cliente HTTP | `lib/hotmart/` | OAuth com cache, retry em 429/5xx, paginacao |
| Ingestao | `lib/ingestao/` | Normaliza, unifica pessoa, grava idempotente |
| Metricas | `lib/metricas/` | Receita liquida, MRR, churn, cohort, funil, origem |
| Painel | `app/(painel)/` | Dashboard, busca, perfil 360, fila de risco |

### Duas entradas, um funil

- **Webhook** (`/api/webhook/hotmart`) — o que acontece agora.
- **Cron diario** (`/api/cron/sincronizar`, 08:00 UTC) — o que o webhook
  perdeu e o que muda **sem gerar evento**: boleto que aprova no dia
  seguinte, reembolso que cai uma semana depois. A janela sempre volta 7
  dias, porque status de venda muda pra tras.

Um sem o outro deixa buraco.

## Decisoes que nao sao gosto

**Dinheiro e inteiro em centavos.** Float acumula erro em somatorio de MRR e
LTV, e nao tem conserto depois.

**Toda receita e liquida.** `liquidoCentavos` e a sua parte depois da taxa da
Hotmart e do split de afiliado. O bruto — o numero que a Hotmart mostra na
home, o que faz todo mundo achar que ganha mais do que ganha — aparece ao
lado, nunca sozinho.

**Status e string, nao enum.** A Hotmart adiciona status sem avisar. Com
enum, um valor novo derruba a ingestao e o dado se perde. Os valores
conhecidos vivem em `lib/hotmart/tipos.ts`, onde errar custa um build.

**Pessoa e deduplicada por e-mail, nunca por CPF.** CPF vem vazio em compra
internacional e telefone o comprador digita errado. Usar qualquer um dos
dois como chave cria pessoa duplicada — e no CRM, duplicada e pior que
faltando.

**O MRR normaliza por periodo.** Uma anual de R$ 1.200 entra como R$ 100/mes,
nao R$ 1.200 no mes da cobranca. Senao o grafico vira serrote.

**`assinaturaCodigo` na transacao nao e chave estrangeira.** A cobranca
costuma chegar antes da assinatura ser sincronizada; uma FK obrigaria a
ingestao a respeitar uma ordem que quem manda o dado nao respeita.

**O painel tem login de verdade.** Tem nome, e-mail, telefone e CPF de
terceiros — dado pessoal sob LGPD. URL obscura nao serve aqui.

**O webhook grava o cru antes de interpretar.** Se a normalizacao tiver bug,
o reprocessamento e possivel. Sem isso, um erro de parsing vira perda
permanente — webhook nao se repete.

## A tela que importa

`/risco` e a unica que pede uma acao **hoje** em vez de descrever o passado.
Ordena assinantes por sinais que antecedem o cancelamento (sumico da area de
membros, cobranca falhando, progresso parado no 2o mes) e poe primeiro quem
tem cobranca nos proximos 7 dias — a janela pra agir antes da fatura.

O score em `lib/risco.ts` e soma de sinais com peso explicito, **nao previsao
estatistica**. Melhor um numero que voce entende e corrige do que um modelo
que voce obedece.

## Limites honestos

- **Nao existe lead que nunca comprou.** A Hotmart nao entrega isso. Topo de
  funil so cruzando com GA4/Meta pelo `src`.
- **`src` vazio = atribuicao quebrada na origem.** Nenhum painel conserta
  depois: carimbe `src` nas campanhas.
- **Engajamento depende do Hotmart Club.** Sem `HOTMART_CLUB_SUBDOMAIN`, o
  risco de churn perde o sinal mais forte que tem.
- **O Club nao diz de qual produto e o acesso.** O engajamento e ancorado na
  assinatura mais recente da pessoa — aproximacao, nao verdade.

## Comandos

```bash
npm run dev
npm run build
npm run lint
npm run db:push                  # aplica o schema
npm run db:studio
npm run gerar:segredos -- "senha"
npm run hotmart:testar           # 1 venda: cru vs normalizado
npm run hotmart:backfill -- 2023-01-01
npm run hotmart:sincronizar      # o mesmo que o cron
npm run webhook:simular -- PURCHASE_APPROVED
```

## Producao (Vercel + Supabase)

- O host direto do Supabase (`db.<ref>.supabase.co`) e **IPv6 puro**. As
  funcoes da Vercel sao IPv4: runtime **e** migrations usam o pooler
  (`DATABASE_URL` 6543 / `DIRECT_URL` 5432).
- `CRON_SECRET` no ambiente faz a Vercel mandar o `Authorization: Bearer`
  sozinha no cron.
- Prisma 7 fixado em **7.10.0**: o dist-tag `latest` aponta pra um RC da 8.
  Nao rodar `npm i prisma@latest`.
