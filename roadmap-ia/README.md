# Roadmap de IA · Go Agentes

Diagnóstico de adoção de IA pra agências de viagem. Next.js 16 + Postgres + Gemini.
Detalhes de arquitetura em `CLAUDE.md`.

## Pôr no ar (Vercel), reaproveitando o Bancada

1. **Banco** — rode uma vez, com o `DATABASE_URL` do Bancada:
   `DATABASE_URL=... npm run db:criar` (cria só o schema `roadmap_ia`).
2. **Vercel** → Add New Project → este repositório → **Root Directory: `roadmap-ia`**.
3. **Environment Variables** (copie as duas primeiras do projeto Bancada):
   - `GOOGLE_API_KEY`
   - `DATABASE_URL` (pooler 6543)
   - `ADMIN_CHAVE` — `openssl rand -hex 16`
4. Deploy. Deixe **Deployment Protection** em "Only Preview Deployments",
   senão os alunos caem na tela de login da Vercel.
5. Seu painel: `https://<dominio>/admin`.
