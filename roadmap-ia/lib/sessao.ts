import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Aluno não tem login nem vê relatório no site: responde, e o resultado chega
 * por e-mail. Mandar pro endereço digitado é o que garante que só o dono lê.
 *
 * O único acesso ao site é o admin (você), com ADMIN_CHAVE.
 */

const COOKIE_ADMIN = "rmia_admin";

export function normalizarEmail(bruto: string) {
  const e = bruto.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 200 ? e : null;
}

// ——— Admin: você. Uma chave em ADMIN_CHAVE; o cookie guarda o hash dela.

const hash = (s: string) => createHash("sha256").update(`rmia:${s}`).digest("hex");

export function chaveConfere(chave: string) {
  const certa = process.env.ADMIN_CHAVE;
  if (!certa || certa.length < 12) return false;
  const a = Buffer.from(hash(chave));
  const b = Buffer.from(hash(certa));
  return timingSafeEqual(a, b);
}

export async function ehAdmin() {
  const certa = process.env.ADMIN_CHAVE;
  const v = (await cookies()).get(COOKIE_ADMIN)?.value;
  if (!certa || !v) return false;
  const a = Buffer.from(v);
  const b = Buffer.from(hash(certa));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function gravarAdmin() {
  (await cookies()).set(COOKIE_ADMIN, hash(process.env.ADMIN_CHAVE!), {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}

export async function sairAdmin() {
  (await cookies()).delete(COOKIE_ADMIN);
}
