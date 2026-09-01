# Giro

Painel de gestão para pequenas empresas com um consultor de IA junto.
Next.js 16 + Prisma 7 + Postgres. Leia o `README.md` antes de mexer.

## Regras duras

1. **A IA não calcula.** Todo número vem de `lib/sinais.ts` ou de uma
   ferramenta de `lib/agente.ts`, apurado em SQL/JS. O modelo interpreta e
   escreve — nunca soma, estima ou arredonda. Se um número novo precisar
   aparecer no diagnóstico, ele nasce em `sinais.ts`, não no prompt.
2. **`empresaId` vem da sessão, nunca do argumento.** Toda ferramenta do
   agente e toda server action já recebem o `empresaId` de `exigirSessao()`.
   Nenhum `where` de leitura ou escrita pode ficar sem ele.
3. **Credencial só no servidor.** Nunca `NEXT_PUBLIC_` com chave. O browser
   fala com as rotas do Giro; as rotas falam com o OpenRouter.
4. **Dinheiro é `Int` em centavos.** Use `lib/dinheiro.ts` para formatar e ler.
5. **Interface em português com acento.** O teste em `scripts/testar.mjs`
   falha se escapar um "nao"/"voce"/"gestao" para a tela. Comentário de código
   fica sem acento, por consistência com o resto dos projetos.
6. **Limite é limite de IA, nunca de cadastro.** Cliente, negócio, lançamento
   e tarefa são ilimitados em todos os planos, de propósito: dado preso é o
   que faz o app valer.

## Armadilha conhecida

Constante exportada de um arquivo com `server-only`, importada por componente
cliente, arrasta o banco para o navegador e quebra o build. Constante pura vai
em arquivo próprio sem `server-only` (`lib/planos.ts`, `lib/dinheiro.ts`,
`lib/datas.ts`); consulta vai no arquivo com `server-only` (`lib/db.ts`,
`lib/sinais.ts`, `lib/agente.ts`, `lib/sessao.ts`).

Script que importa `lib/*` com `server-only` precisa de
`tsx --conditions=react-server`.

## Testar sem gastar IA

```bash
npm run olhar:sinais          # retrato e sinais, direto do banco
node scripts/espelho-ia.mjs   # espelho do OpenRouter, local e de graça
```

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
