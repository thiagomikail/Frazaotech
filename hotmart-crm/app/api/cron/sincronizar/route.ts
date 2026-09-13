import { NextResponse, type NextRequest } from "next/server";
import { sincronizacaoIncremental } from "@/lib/ingestao/sincronizar";
import { cronAutorizado } from "@/lib/sessao";

/**
 * Sincronizacao diaria.
 *
 * O webhook traz o que acontece agora; este cron traz o que o webhook perdeu
 * e o que muda sem gerar evento — status que evolui depois (boleto aprovado
 * no dia seguinte, reembolso uma semana depois). Um sem o outro deixa buraco.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!cronAutorizado(req.headers.get("authorization"))) {
    return NextResponse.json({ erro: "nao autorizado" }, { status: 401 });
  }

  try {
    const resultado = await sincronizacaoIncremental();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (erro) {
    return NextResponse.json(
      { ok: false, erro: erro instanceof Error ? erro.message : String(erro) },
      { status: 500 },
    );
  }
}
