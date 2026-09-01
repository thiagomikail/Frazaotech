import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const COOKIE_SESSAO = "giro_sessao";
const DURACAO_DIAS = 30;

function chave(): Uint8Array {
  const segredo = process.env.SEGREDO_SESSAO;
  if (!segredo || segredo.length < 24) {
    throw new Error(
      "SEGREDO_SESSAO ausente ou curto demais. Gere com: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(segredo);
}

export async function hashDeSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export async function abrirSessao(usuarioId: string): Promise<void> {
  const token = await new SignJWT({ sub: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_DIAS}d`)
    .sign(chave());

  const jar = await cookies();
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_DIAS * 24 * 60 * 60,
  });
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
}

export type Sessao = {
  usuario: { id: string; nome: string; email: string; papel: "DONO" | "EQUIPE" };
  empresa: {
    id: string;
    nome: string;
    segmento: string;
    plano: "FREE" | "PRO" | "ESTUDIO";
    criadaEm: Date;
  };
};

/**
 * `cache` do React deduplica a leitura dentro do mesmo render: layout, pagina
 * e server action chamam a vontade e o banco e consultado uma vez so.
 */
export const sessaoAtual = cache(async (): Promise<Sessao | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (!token) return null;

  let usuarioId: string;
  try {
    const { payload } = await jwtVerify(token, chave());
    if (typeof payload.sub !== "string") return null;
    usuarioId = payload.sub;
  } catch {
    return null; // expirado ou adulterado
  }

  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    include: { empresa: true },
  });
  if (!usuario) return null;

  return {
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
    },
    empresa: {
      id: usuario.empresa.id,
      nome: usuario.empresa.nome,
      segmento: usuario.empresa.segmento,
      plano: usuario.empresa.plano,
      criadaEm: usuario.empresa.criadaEm,
    },
  };
});

/**
 * Toda pagina privada e toda server action passam por aqui. O `proxy.ts` so
 * faz a checagem otimista do cookie; a autorizacao de verdade e esta, junto
 * do dado — server action e alcancavel por POST direto, sem passar pela UI.
 */
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");
  return sessao;
}
