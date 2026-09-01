import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessaoAtual } from "@/lib/sessao";
import { perguntarAoConsultor } from "@/lib/agente";
import { conferirCota } from "@/lib/uso-ia";
import { registrarEvento } from "@/lib/eventos";
import { ErroIA, iaConfigurada } from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(requisicao: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Faca login." }, { status: 401 });

  if (!iaConfigurada()) {
    return NextResponse.json(
      { erro: "O consultor ainda não foi ligado nesta instalação: falta OPENROUTER_API_KEY." },
      { status: 503 },
    );
  }

  const corpo = (await requisicao.json().catch(() => ({}))) as {
    pergunta?: string;
    conversaId?: string;
  };
  const pergunta = (corpo.pergunta ?? "").trim().slice(0, 2000);
  if (!pergunta) return NextResponse.json({ erro: "Escreva uma pergunta." }, { status: 400 });

  const cota = await conferirCota(sessao.empresa.id, sessao.empresa.plano, "pergunta");
  if (!cota.permitido) {
    return NextResponse.json({ erro: cota.motivo, cota: true }, { status: 402 });
  }

  // A conversa e sempre buscada com o empresaId junto: um id de outra empresa
  // simplesmente nao encontra nada.
  let conversa = corpo.conversaId
    ? await db.conversa.findFirst({
        where: { id: corpo.conversaId, empresaId: sessao.empresa.id },
        include: { mensagens: { orderBy: { criadaEm: "asc" }, take: 20 } },
      })
    : null;

  if (!conversa) {
    conversa = await db.conversa.create({
      data: { empresaId: sessao.empresa.id, titulo: pergunta.slice(0, 60) },
      include: { mensagens: true },
    });
  }

  const historico = conversa.mensagens.map((m) => ({ papel: m.papel, conteudo: m.conteudo }));

  await db.mensagem.create({
    data: { conversaId: conversa.id, papel: "USUARIO", conteudo: pergunta },
  });

  try {
    const resposta = await perguntarAoConsultor(sessao.empresa.id, pergunta, historico);

    await db.mensagem.create({
      data: {
        conversaId: conversa.id,
        papel: "ASSISTENTE",
        conteudo: resposta.texto,
        ferramentas: resposta.passos.map((p) => p.ferramenta),
      },
    });
    await db.conversa.update({ where: { id: conversa.id }, data: { atualizadaEm: new Date() } });
    await registrarEvento(sessao.empresa.id, "consultor.pergunta", {
      passos: resposta.passos.map((p) => p.ferramenta),
      tokens: resposta.uso.tokensEntrada + resposta.uso.tokensSaida,
    }, sessao.usuario.id);

    return NextResponse.json({
      conversaId: conversa.id,
      texto: resposta.texto,
      passos: resposta.passos.map((p) => p.ferramenta),
    });
  } catch (erro) {
    console.error("[consultor]", erro);
    const mensagem =
      erro instanceof ErroIA
        ? erro.message
        : "Não consegui responder agora. Tente de novo em alguns instantes.";
    return NextResponse.json({ erro: mensagem }, { status: 502 });
  }
}
