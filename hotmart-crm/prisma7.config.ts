import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // O CLI (db push, studio, migrations) usa a conexao DIRETA do Supabase na
    // 5432 — o pooler da 6543 nao aguenta DDL. Em runtime quem manda e o
    // adapter em lib/db.ts, que usa DATABASE_URL (o pooler).
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
