import { NextResponse } from "next/server";
import { buscar } from "@/lib/diagnosticos";
import { gerarAnalise } from "@/lib/processar";
import { ehAdmin, emailAtual } from "@/lib/sessao";

export const maxDuration = 300;

/** Tentar de novo quando a IA falhou na primeira vez. Só o dono ou o admin. */
export async function POST(_req: Request, ctx: RouteContext<"/api/diagnostico/[id]/analisar">) {
  const { id } = await ctx.params;
  const [d, email, admin] = await Promise.all([buscar(id), emailAtual(), ehAdmin()]);
  if (!d || (d.email !== email && !admin)) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const r = await gerarAnalise(id);
  return NextResponse.json(r.ok ? { ok: true } : { erro: r.erro }, { status: r.ok ? 200 : 503 });
}
