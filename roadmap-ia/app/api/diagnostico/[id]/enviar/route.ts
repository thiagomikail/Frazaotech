import { NextResponse } from "next/server";
import { processar } from "@/lib/processar";
import { ehAdmin } from "@/lib/sessao";

export const maxDuration = 300;

/** Botão do admin: gera a análise se faltar e (re)envia o e-mail. */
export async function POST(_req: Request, ctx: RouteContext<"/api/diagnostico/[id]/enviar">) {
  if (!(await ehAdmin())) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });
  const { id } = await ctx.params;
  const r = await processar(id, { reenviar: true });
  return NextResponse.json(r.ok ? { ok: true } : { erro: r.erro }, { status: r.ok ? 200 : 503 });
}
