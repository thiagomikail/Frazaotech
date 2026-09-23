# Roadmap de IA · Go Agentes

Diagnóstico aberto pros alunos da Go Agentes: a agência responde ~22 perguntas
e recebe uma análise **crítica** + roadmap de 90 dias de adoção de IA.

A pergunta que o relatório TEM que responder: **onde a IA adiciona mais valor
pro negócio?** — no singular. Relatório que recomenda IA em tudo não recomenda nada.

## Comandos

```bash
npm run dev
npm run build
npm run lint
npm run db:criar                     # schema roadmap_ia (idempotente, nunca apaga)
npm run testar:analise -- --seco     # imprime o prompt de um caso fixo
npm run testar:analise               # chama o Gemini de verdade
npm run testar                       # Playwright no site (precisa do dev rodando + ADMIN_CHAVE)
```

## Como a análise funciona

1. `lib/pontuacao.ts` — **determinístico**. Teoria das Restrições: acha o
   gargalo (capacidade / demanda / margem), inclusive quando a pessoa declara
   um e as respostas mostram outro; pondera horas × adequação à IA × gargalo;
   aplica bloqueios (sem base → recompra não; <10 leads → atendimento não);
   gera alertas de contradição. Sem IA, sempre o mesmo resultado.
2. `lib/analise.ts` — o Gemini recebe respostas + pontuação como chão e devolve
   JSON com esquema fixo: veredito, UMA frente, o que não fazer, verdades
   incômodas, roadmap em 3 fases com critério de sucesso **e de parada**.
3. Se a IA falhar, o relatório sai com a parte determinística e um botão de
   tentar de novo. As respostas são gravadas ANTES da chamada.

Mudar o tom da análise = mexer no prompt de `lib/analise.ts` e rodar
`testar:analise`. Mudar a ordem das frentes = `PESO` e `AREAS.adequacao`.

## Regras

- **Login só com e-mail, sem senha** — pedido explícito. Não é autenticação:
  quem souber o e-mail vê o relatório. Por isso faturamento é faixa, nunca número,
  e a home avisa. Upgrade futuro: link mágico, tudo em `lib/sessao.ts`.
- **Admin** em `/admin` com `ADMIN_CHAVE`. Vê tudo, abre qualquer relatório, baixa CSV.
- **Chave do Google compartilhada com o Bancada.** Tetos em `lib/limite.ts`:
  3 análises/e-mail/24h e `TETO_DIARIO` global (150).
- **Banco**: pode ser o mesmo Supabase do Bancada — tudo no schema `roadmap_ia`.
  Postgres puro (`pg`), sem Prisma: `prisma db push` aqui apagaria as tabelas do Bancada.
- Constante pura (`perguntas.ts`, `pontuacao.ts`, `analise-tipo.ts`) sem `server-only`;
  consulta e IA com `server-only`. Mesma armadilha do Bancada.
- Marca Go Agentes: Montserrat, `#1C1C1E` / `#F2F0EC`, ouro só como acento, sem canto arredondado.

# This is NOT the Next.js you know

Next 16 — leia `node_modules/next/dist/docs/` antes de escrever código.
