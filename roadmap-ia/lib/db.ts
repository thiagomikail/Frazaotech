import "server-only";
import { Pool } from "pg";

/**
 * Postgres puro, sem ORM. São duas tabelas — Prisma aqui seria peso morto, e
 * pior: `prisma db push` apontado pro banco do Bancada tentaria APAGAR as
 * tabelas de lá, que não estão neste schema.
 *
 * Tudo vive no schema `roadmap_ia`, isolado do `public` do Bancada. Pode ser o
 * mesmo projeto Supabase (mesmo DATABASE_URL) sem encostar em nada de lá.
 * Use o pooler (6543): o host direto do Supabase é IPv6 puro e a Vercel é IPv4.
 */

const globalPg = globalThis as unknown as { pool?: Pool };

function criar() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida. Veja .env.example.");
  return new Pool({ connectionString, max: 3 });
}

/** Preguiçoso: o build do Next importa as rotas sem ter DATABASE_URL. */
export function pg() {
  globalPg.pool ??= criar();
  return globalPg.pool;
}

export const SCHEMA = "roadmap_ia";
