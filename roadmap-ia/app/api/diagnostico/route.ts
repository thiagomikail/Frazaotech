import { after, NextResponse } from "next/server";
import { criarDiagnostico } from "@/lib/diagnosticos";
import { podeEnviar, POR_EMAIL } from "@/lib/limite";
import { pontuar } from "@/lib/pontuacao";
import { limparRespostas, processar } from "@/lib/processar";
import { normalizarEmail } from "@/lib/sessao";

// A análise + o e-mail rodam DEPOIS da resposta (`after`), dentro deste prazo.
export const maxDuration = 300;

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);

  const email = normalizarEmail(String(corpo?.email ?? ""));
  if (!email) return NextResponse.json({ erro: "Esse e-mail não parece válido." }, { status: 400 });

  const respostas = limparRespostas(corpo?.respostas);
  if (!respostas) return NextResponse.json({ erro: "Faltam respostas." }, { status: 400 });

  if (!(await podeEnviar(email))) {
    return NextResponse.json(
      { erro: `Este e-mail já pediu ${POR_EMAIL} diagnósticos nas últimas 24h. Confira a caixa de entrada (e o spam).` },
      { status: 429 },
    );
  }

  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null);

  // Grava ANTES da IA: se ela ou o e-mail falharem, as respostas estão salvas
  // e o admin reenvia pelo painel.
  const id = await criarDiagnostico({
    email,
    nome: texto(corpo?.nome),
    agencia: texto(corpo?.agencia),
    respostas,
    pontuacao: pontuar(respostas),
  });

  // O aluno não vê relatório na tela — então não precisa esperar a IA.
  after(() => processar(id));

  return NextResponse.json({ ok: true });
}
