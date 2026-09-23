import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Login só com e-mail, sem senha e sem confirmação — pedido explícito.
 *
 * Isto NÃO é autenticação: quem souber o e-mail de alguém vê o relatório
 * dessa pessoa. Aceito porque o público é uma turma fechada e o atrito de
 * senha mataria a adesão. Por isso o questionário pede FAIXA de faturamento,
 * nunca número. Se um dia precisar de verdade, o próximo passo é link mágico
 * por e-mail (Resend) — a troca fica toda neste arquivo.
 */

const COOKIE_EMAIL = "rmia_email";
const COOKIE_ADMIN = "rmia_admin";
const UM_ANO = 60 * 60 * 24 * 365;

export function normalizarEmail(bruto: string) {
  const e = bruto.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 200 ? e : null;
}

export async function emailAtual() {
  const v = (await cookies()).get(COOKIE_EMAIL)?.value;
  return v ? normalizarEmail(v) : null;
}

export async function gravarEmail(email: string) {
  (await cookies()).set(COOKIE_EMAIL, email, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: UM_ANO,
  });
}

export async function esquecerEmail() {
  (await cookies()).delete(COOKIE_EMAIL);
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
