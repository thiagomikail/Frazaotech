import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessaoAtual } from "@/lib/sessao";
import { gerarDiagnostico } from "@/lib/agente";
import { conferirCota } from "@/lib/uso-ia";
import { registrarEvento } from "@/lib/eventos";
import { ErroIA, iaConfigurada } from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST() {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Faca login." }, { status: 401 });

  if (!iaConfigurada()) {
    return NextResponse.json(
      { erro: "O consultor ainda não foi ligado nesta instalação: falta OPENROUTER_API_KEY." },
      { status: 503 },
    );
  }

  const cota = await conferirCota(sessao.empresa.id, sessao.empresa.plano, "diagnostico");
  if (!cota.permitido) {
    return NextResponse.json({ erro: cota.motivo, cota: true }, { status: 402 });
  }

  try {
    const { diagnostico, retrato, uso, modelo } = await gerarDiagnostico(sessao.empresa.id);

    const salvo = await db.diagnostico.create({
      data: {
        empresaId: sessao.empresa.id,
        modelo,
        resumo: diagnostico.resumo,
        achados: diagnostico.achados,
        proximosPassos: diagnostico.proximosPassos,
        dadosBase: JSON.parse(JSON.stringify(retrato)),
        tokensEntrada: uso.tokensEntrada,
        tokensSaida: uso.tokensSaida,
      },
    });

    await registrarEvento(sessao.empresa.id, "diagnostico.rodado", {
      id: salvo.id,
      sinais: retrato.sinais.length,
    }, sessao.usuario.id);

    return NextResponse.json({ id: salvo.id });
  } catch (erro) {
    console.error("[diagnostico]", erro);
    const mensagem =
      erro instanceof ErroIA
        ? erro.message
        : erro instanceof Error
          ? erro.message
          : "Não consegui gerar o diagnóstico agora.";
    return NextResponse.json({ erro: mensagem }, { status: 502 });
  }
}
