import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Prisma 7 nao tem engine embutido: o client fala com o Postgres por um
 * driver adapter. Aqui o adapter aponta pro pooler do Supabase (6543); as
 * migrations usam a conexao direta (5432), configurada em prisma7.config.ts.
 */
function criar() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL nao definida. Veja .env.example.");

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalParaPrisma.prisma ?? criar();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = db;
