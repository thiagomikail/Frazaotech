# Giro

Painel de gestão para pequenas empresas brasileiras — clientes, funil de vendas
e caixa — com um **consultor de IA** que lê esses números, aponta o que está
sangrando e escreve os próximos passos da semana.

A aposta comercial: sistema de gestão é mercado lotado (Conta Azul, Omie, Bling,
Tiny), e todos entregam **relatório**. O Giro entrega **decisão**. Registrar é
grátis para sempre; o que se paga é o consultor.

## Como rodar

```bash
cp .env.example .env      # preencha DATABASE_URL e SEGREDO_SESSAO
npm install
npm run db:sincronizar    # cria as tabelas
npm run db:semear         # empresa de demonstração com 6 meses de história
npm run dev
```

A demonstração entra com `demo@giro.app.br` / `giro12345`.

## Comandos

```bash
npm run dev             # desenvolvimento
npm run build           # gera o client do Prisma + build do Next
npm run lint
npm run verificar       # tsc --noEmit

npm run db:sincronizar  # aplica o schema no banco
npm run db:semear       # recria a empresa de demonstração
npm run db:estudio      # Prisma Studio

npm run testar          # passeio de ponta a ponta no navegador (35 checagens)
npm run olhar:sinais    # imprime o retrato e os sinais, sem gastar IA
npm run testar:ia       # conversa com o consultor pelo terminal
npm run testar:ia -- diagnostico
```

Não há teste unitário de propósito. O que quebra num app assim é a costura
entre sessão, banco e tela — e isso só aparece dirigindo o app de verdade.
`scripts/testar.mjs` faz esse passeio, incluindo uma checagem de que a
interface está escrita em **português com acento**: produto brasileiro sem
acento parece feito às pressas.

## Manual do usuário

`manual/` guarda um manual navegável com capturas reais de cada tela e quatro
clipes curtos feitos em Remotion. Tudo é gerado a partir do app rodando, então
o manual não envelhece sozinho: mudou a tela, roda de novo.

```bash
npm run manual          # captura, converte e monta manual/manual.html
npm run manual:olhar    # confere nos dois temas e no celular
npm run manual:video    # renderiza os quatro clipes
npm run manual:conferir # valida codec, duração e peso dos clipes
```

Detalhes e armadilhas em [`manual/LEIAME.md`](manual/LEIAME.md).

## As duas famílias de dado

Isto é o que separa o Giro de um CRM com chatbot colado:

| | o que é | quem lê |
|---|---|---|
| **Dado do negócio** | cliente, negócio, lançamento, tarefa | o dono, e o consultor |
| **Dado de uso** | `Evento`, `UsoIA` — como a empresa usa o app | só o consultor |

Sem a segunda família o agente elogia número falso. Com ela, ele diz *"sua
conversão parece 100% porque você nunca marcou um negócio como perdido"* —
que é metade do valor do produto.

## O consultor não chuta número

A decisão de arquitetura mais importante do projeto:

```
banco  →  lib/sinais.ts  →  retrato + sinais  →  modelo  →  texto
          (SQL e JS)        (números apurados)   (interpreta)
```

`lib/sinais.ts` calcula tudo — faturamento, margem, ticket, dias sem comprar,
concentração de receita — em código auditável. O modelo recebe os números
prontos e a instrução de que **só pode citar o que recebeu**. Ele não fala com
o banco: fala com um cardápio de ferramentas (`lib/agente.ts`), e cada
ferramenta é uma consulta escrita à mão, já presa ao `empresaId` da sessão.

Não existe caminho pelo qual um texto colado num campo de observação faça o
modelo ler dado de outra empresa — o `empresaId` vem da sessão, nunca do
argumento da ferramenta.

`scripts/espelho-ia.mjs` prova isso: é um servidor local que fala o protocolo
do OpenRouter e **não sabe nada sobre a empresa**. Mesmo assim as respostas
saem com os valores exatos, porque eles vêm do banco.

```bash
node scripts/espelho-ia.mjs 4545 &
OPENROUTER_URL=http://127.0.0.1:4545/chat/completions \
OPENROUTER_API_KEY=espelho npm run start &
node scripts/testar-ia-tela.mjs
```

## Monetização

`lib/planos.ts` carrega a régua inteira: Caderno (grátis), Consultor
(R$ 97/mês) e Estúdio (R$ 249/mês). Todo limite é limite de **IA** — nenhum é
limite de cadastro, porque dado preso é o que faz o app valer.

`BETA_LIBERADO=true` entrega o plano Consultor a todo mundo sem cobrar. O que
**não** para é a medição: `UsoIA` conta chamadas e tokens desde o primeiro dia,
e `/conta` mostra o consumo. Quando a cobrança ligar, o preço sai de consumo
real. Ligar é virar a variável e plugar um provedor de pagamento — o gating
(`lib/uso-ia.ts`) já está de pé e testado.

## Arquitetura

- **Next.js 16** (App Router, React 19). No 16 o middleware virou `proxy.ts`;
  ele faz só a checagem otimista do cookie. Quem autoriza de verdade é
  `exigirSessao()` dentro de cada página e cada server action — server action é
  alcançável por POST direto, sem passar pela interface.
- **Prisma 7** com `prisma7.config.ts`. Sem engine embutido: o client fala com
  o Postgres por driver adapter (`@prisma/adapter-pg`). O client é gerado em
  `src/generated/prisma` e **não** é commitado.
- **Multi-tenant por `empresaId`.** Todo `where` de escrita e leitura inclui o
  `empresaId` da sessão; um id de outra empresa não encontra registro em vez de
  encontrar e vazar.
- **Sessão** por JWT em cookie `httpOnly` (`jose`), senha com `bcryptjs`.
- **IA** só pelo servidor (`lib/openrouter.ts`). Nunca `NEXT_PUBLIC_` com
  credencial. `OPENROUTER_URL` é configurável para gateway, proxy ou espelho.
- **Dinheiro é sempre `Int` em centavos.** `Decimal` do Prisma não atravessa a
  fronteira servidor→cliente sem serialização manual, e float em dinheiro é bug.
- **Datas absolutas** na interface ("22 ago"), nunca "semana passada".
- **Tema claro fixo**, alvos de toque ≥44px, navegação no rodapé no celular —
  o app é usado em pé, no balcão, com uma mão.

## Cron

`vercel.json` roda `/api/cron/diagnostico` às segundas, 11:00 UTC (8h em
Brasília). A rota se protege com `CRON_SECRET` e só atende empresas cujo plano
inclui diagnóstico automático. Uma empresa sem dado suficiente é pulada sem
derrubar a rodada das outras.

## Variáveis de ambiente

| variável | para quê |
|---|---|
| `DATABASE_URL` | Postgres em runtime (pooler, se houver) |
| `DIRECT_URL` | conexão direta para migrations (opcional) |
| `SEGREDO_SESSAO` | assina o cookie — `openssl rand -base64 32` |
| `OPENROUTER_API_KEY` | chave em openrouter.ai/keys |
| `OPENROUTER_MODELO` | padrão `anthropic/claude-sonnet-4.5` |
| `OPENROUTER_URL` | sobrescreve o endpoint (gateway, proxy, espelho) |
| `GIRO_URL` | URL pública, usada na atribuição do OpenRouter |
| `BETA_LIBERADO` | `true` entrega o plano Consultor sem cobrar |
| `CRON_SECRET` | protege a rota do diagnóstico semanal |

Sem `OPENROUTER_API_KEY` o app **não quebra**: as telas de consultor e
diagnóstico explicam o que falta, e os sinais continuam funcionando, porque
são calculados sem IA.
