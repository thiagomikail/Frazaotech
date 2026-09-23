import { NextResponse } from "next/server";
import { criarDiagnostico } from "@/lib/diagnosticos";
import { pontuar } from "@/lib/pontuacao";
import { gerarAnalise, limparRespostas } from "@/lib/processar";
import { emailAtual } from "@/lib/sessao";

// A análise leva de 20 s a alguns minutos quando o Gemini está disputado.
export const maxDuration = 300;

export async function POST(req: Request) {
  const email = await emailAtual();
  if (!email) return NextResponse.json({ erro: "Entre com seu e-mail primeiro." }, { status: 401 });

  const corpo = await req.json().catch(() => null);
  const respostas = limparRespostas(corpo?.respostas);
  if (!respostas) return NextResponse.json({ erro: "Faltam respostas." }, { status: 400 });

  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null);

  // Grava ANTES de chamar a IA: se ela falhar, a pessoa não perde 10 minutos de respostas.
  const id = await criarDiagnostico({
    email,
    nome: texto(corpo?.nome),
    agencia: texto(corpo?.agencia),
    respostas,
    pontuacao: pontuar(respostas),
  });

  const r = await gerarAnalise(id);
  return NextResponse.json({ id, ...(r.ok ? {} : { erro: r.erro }) });
}
