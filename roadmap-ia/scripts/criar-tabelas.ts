import "dotenv/config";
import { Pool } from "pg";

/**
 * Cria o schema `roadmap_ia` e as duas tabelas. Idempotente — pode rodar de
 * novo sem medo. Só CREATE ... IF NOT EXISTS: este script nunca apaga nada,
 * nem aqui nem no `public` do Bancada, se for o mesmo banco.
 *
 *   npm run db:criar
 */

const SQL = `
create schema if not exists roadmap_ia;

create table if not exists roadmap_ia.diagnostico (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  nome        text,
  agencia     text,
  respostas   jsonb not null,
  pontuacao   jsonb not null,
  analise     jsonb,
  modelo      text,
  erro        text,
  criado_em   timestamptz not null default now()
);
-- O relatório só chega por e-mail: estas duas colunas dizem se chegou.
alter table roadmap_ia.diagnostico add column if not exists enviado_em timestamptz;
alter table roadmap_ia.diagnostico add column if not exists erro_envio text;

create index if not exists diagnostico_email on roadmap_ia.diagnostico (email, criado_em desc);

create table if not exists roadmap_ia.uso_ia (
  dia       text primary key,
  contagem  int not null default 0
);

-- O Supabase expõe schemas pela API REST. Este não precisa: o app fala
-- direto pelo Postgres. Sem grant pra anon/authenticated, a chave pública
-- do Supabase não lê nada daqui.
revoke all on schema roadmap_ia from anon, authenticated;
`;

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Defina DATABASE_URL (ou DIRECT_URL) no .env");
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query(SQL);
  } catch (e) {
    // Fora do Supabase os papéis anon/authenticated não existem.
    if (String(e).includes('role "anon" does not exist')) {
      await pool.query(SQL.replace(/revoke all[^;]+;/, ""));
    } else throw e;
  }
  const { rows } = await pool.query("select count(*)::int as n from roadmap_ia.diagnostico");
  console.log(`ok — roadmap_ia pronto (${rows[0].n} diagnósticos)`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
