import "server-only";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Telemetria de uso do proprio app.
 *
 * Nao existe para dashboard de vaidade: e o segundo insumo do agente. Sem ela
 * o consultor so ve o negocio; com ela ele ve tambem o buraco no registro, e
 * consegue dizer "sua taxa de conversao parece 100% porque voce nunca marcou
 * um negocio como perdido" em vez de parabenizar por um numero falso.
 *
 * Registrar evento nunca pode derrubar a acao do usuario — por isso engole erro.
 */
export async function registrarEvento(
  empresaId: string,
  tipo: string,
  meta?: Record<string, unknown>,
  usuarioId?: string,
): Promise<void> {
  try {
    await db.evento.create({
      data: {
        empresaId,
        tipo,
        usuarioId: usuarioId ?? null,
        meta: (meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (erro) {
    console.error("[eventos] falha ao registrar", tipo, erro);
  }
}
