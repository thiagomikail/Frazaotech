import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { scrypt, timingSafeEqual, randomBytes } from "node:crypto";
import { promisify } from "node:util";

/**
 * Acesso ao painel.
 *
 * Aqui NAO cabe o truque de URL obscura que funciona num app domestico: este
 * painel mostra nome, e-mail, telefone e CPF de compradores. Sao dados
 * pessoais de terceiros, sob LGPD — o que exige controle de acesso de
 * verdade, nao um endereco dificil de adivinhar.
 *
 * Um usuario so, senha em hash scrypt no ambiente, sessao em cookie JWT
 * HttpOnly. Trocar por Supabase Auth depois e trocar este arquivo; o resto
 * do app so conhece `sessaoAtiva()`.
 */

const derivar = promisify(scrypt) as (
  senha: string,
  sal: string,
  tamanho: number,
) => Promise<Buffer>;

const COOKIE = "hotmart_crm_sessao";
const DURACAO_HORAS = 12;

function segredo(): Uint8Array {
  const valor = process.env.SESSAO_SEGREDO;
  if (!valor || valor.length < 32) {
    throw new Error("SESSAO_SEGREDO ausente ou curto demais. Rode: npm run gerar:segredos");
  }
  return new TextEncoder().encode(valor);
}

// ------------------------------------------------------------------ senha

/** Formato guardado em PAINEL_SENHA_HASH: `scrypt$<sal hex>$<hash hex>`. */
export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(16).toString("hex");
  const hash = await derivar(senha, sal, 64);
  return `scrypt$${sal}$${hash.toString("hex")}`;
}

export async function senhaConfere(senha: string): Promise<boolean> {
  const guardado = process.env.PAINEL_SENHA_HASH;
  if (!guardado) throw new Error("PAINEL_SENHA_HASH nao definido. Rode: npm run gerar:segredos");

  const [algoritmo, sal, hashHex] = guardado.split("$");
  if (algoritmo !== "scrypt" || !sal || !hashHex) return false;

  const calculado = await derivar(senha, sal, 64);
  const esperado = Buffer.from(hashHex, "hex");
  if (calculado.length !== esperado.length) return false;
  return timingSafeEqual(calculado, esperado);
}

// ---------------------------------------------------------------- sessao

export async function abrirSessao(email: string): Promise<void> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_HORAS}h`)
    .sign(segredo());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_HORAS * 3600,
  });
}

export async function fecharSessao(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function sessaoAtiva(): Promise<{ email: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, segredo());
    return typeof payload.email === "string" ? { email: payload.email } : null;
  } catch {
    // Expirado ou adulterado da no mesmo: sem sessao.
    return null;
  }
}

/** Valida o Bearer do cron. Mesma comparacao em tempo constante do hottok. */
export function cronAutorizado(cabecalho: string | null): boolean {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) throw new Error("CRON_SECRET nao definido. Rode: npm run gerar:segredos");

  const recebido = cabecalho?.replace(/^Bearer\s+/i, "") ?? "";
  if (recebido.length !== esperado.length) return false;

  let diferenca = 0;
  for (let i = 0; i < esperado.length; i += 1) {
    diferenca |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  }
  return diferenca === 0;
}
