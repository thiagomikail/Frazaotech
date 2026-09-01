import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gerarDiagnostico } from "@/lib/agente";
import { limitesDe } from "@/lib/planos";
import { registrarEvento } from "@/lib/eventos";
import { iaConfigurada } from "@/lib/openrouter";
import { diasAtras } from "@/lib/datas";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Diagnostico automatico de segunda-feira — o recurso que sustenta o plano
 * pago: o dono nao precisa lembrar de pedir, o consultor aparece.
 *
 * Protegida por CRON_SECRET porque a rota fica em caminho publico e gerar
 * diagnostico custa dinheiro em token.
 */
export async function GET(requisicao: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizacao = requisicao.headers.get("authorization");
  if (!segredo || autorizacao !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!iaConfigurada()) {
    return NextResponse.json({ erro: "OPENROUTER_API_KEY ausente" }, { status: 503 });
  }

  const empresas = await db.empresa.findMany({ select: { id: true, nome: true, plano: true } });
  const semana = diasAtras(6);
  const relatorio: { empresa: string; estado: string }[] = [];

  for (const empresa of empresas) {
    if (!limitesDe(empresa.plano).diagnosticoAutomatico) {
      relatorio.push({ empresa: empresa.nome, estado: "plano sem automático" });
      continue;
    }

    // Nao repete se ja rodou nos ultimos 6 dias (o cron pode disparar duas vezes).
    const recente = await db.diagnostico.findFirst({
      where: { empresaId: empresa.id, geradoEm: { gte: semana } },
      select: { id: true },
    });
    if (recente) {
      relatorio.push({ empresa: empresa.nome, estado: "já tinha desta semana" });
      continue;
    }

    try {
      const { diagnostico, retrato, uso, modelo } = await gerarDiagnostico(empresa.id);
      await db.diagnostico.create({
        data: {
          empresaId: empresa.id,
          modelo,
          resumo: diagnostico.resumo,
          achados: diagnostico.achados,
          proximosPassos: diagnostico.proximosPassos,
          dadosBase: JSON.parse(JSON.stringify(retrato)),
          tokensEntrada: uso.tokensEntrada,
          tokensSaida: uso.tokensSaida,
        },
      });
      await registrarEvento(empresa.id, "diagnostico.automatico");
      relatorio.push({ empresa: empresa.nome, estado: "gerado" });
    } catch (erro) {
      // Uma empresa sem dado nao pode derrubar a rodada das outras.
      relatorio.push({
        empresa: empresa.nome,
        estado: `pulou: ${erro instanceof Error ? erro.message : "erro"}`,
      });
    }
  }

  return NextResponse.json({ empresas: relatorio.length, relatorio });
}
