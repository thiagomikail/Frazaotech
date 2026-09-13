# CRM Hotmart

Painel de analytics e CRM proprio sobre a API da Hotmart. Next.js na Vercel,
Postgres no Supabase. Le a doc de uso em `README.md` antes de mexer.

## Comandos

```bash
npm run dev
npm run build                    # prisma generate + next build
npm run lint
npm run db:push
npm run hotmart:testar           # 1 venda crua vs normalizada
npm run hotmart:backfill -- 2023-01-01
npm run webhook:simular -- PURCHASE_APPROVED
```

Scripts que importam modulo com `server-only` precisam de
`--conditions=react-server` (ja esta nos scripts do package.json).

## Regras duras

1. **Receita e sempre liquida.** Nenhuma metrica nova pode somar
   `brutoCentavos` como se fosse faturamento seu. Bruto aparece so como
   referencia ao lado do liquido.
2. **Dinheiro e `Int` em centavos.** Nunca Float, nunca Decimal em coluna
   nova.
3. **Status e string.** Nao transformar em enum do Prisma, por mais tentador
   que pareca: valor novo da Hotmart tem que entrar no banco, nao derrubar a
   ingestao.
4. **Pessoa e deduplicada por e-mail.** CPF e telefone sao enriquecimento,
   nunca chave.
5. **Nada de placar.** Este e um painel de negocio: metrica existe pra
   decidir uma acao. Se um numero novo nao muda nenhuma decisao, ele nao
   entra na tela.
6. **O painel nunca fica sem login.** Tem dado pessoal de terceiro sob LGPD.

## Armadilha que ja mordeu (herdada do bancada)

Constante exportada de arquivo com `server-only`, importada por componente
cliente, arrasta o Prisma pro navegador e **quebra o build**. Regra:

- Puro (sem `server-only`): `lib/dinheiro.ts`, `lib/datas.ts`, `lib/risco.ts`,
  `lib/hotmart/tipos.ts`, `lib/metricas/periodo.ts`.
- Com `server-only`: `lib/db.ts`, `lib/sessao.ts`, `lib/hotmart/cliente.ts`,
  `lib/ingestao/*`, `lib/metricas/*` (menos `periodo.ts`).

`componentes/graficos.tsx` e `"use client"` e toca dinheiro — por isso
importa de `lib/dinheiro.ts`, que e puro.

## Onde o mapeamento de campo mora

`lib/ingestao/normalizar.ts` e o **unico** arquivo que conhece nomes de campo
da API da Hotmart. Mudou o payload, so ali quebra. `npm run hotmart:testar`
imprime cru vs normalizado pra conferir.

## Next.js 16

`middleware.ts` foi renomeado pra `proxy.ts` (export `proxy`). `cookies()`,
`params` e `searchParams` sao **assincronos**. Consulte
`node_modules/next/dist/docs/` antes de escrever codigo de rota.

## Prisma 7

`prisma7.config.ts` (nao `prisma.config.ts`). Client gerado em
`lib/generated/prisma`, **nao** commitado. Versao fixada em 7.10.0 de
proposito — o dist-tag `latest` aponta pra um RC da 8.
