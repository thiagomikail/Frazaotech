import "server-only";
import { db } from "./db";
import { competenciaAtual, inicioDoMes } from "./datas";
import { limitesDe, planoEfetivo, type Plano } from "./planos";
import type { Uso } from "./openrouter";

/**
 * Medidor e catraca do consumo de IA.
 *
 * O beta e gratuito, mas a contagem roda desde o primeiro dia: quando a
 * cobranca ligar, o preco vai ter sido calibrado com consumo real. Medir depois
 * de vender e como descobrir o custo do prato depois de imprimir o cardapio.
 */

export type Consumo = {
  perguntasUsadas: number;
  perguntasLimite: number;
  diagnosticosUsados: number;
  diagnosticosLimite: number;
  tokensEntrada: number;
  tokensSaida: number;
  chamadas: number;
};

export async function consumoDoMes(empresaId: string, plano: Plano): Promise<Consumo> {
  const limites = limitesDe(plano);
  const inicio = inicioDoMes();

  const [perguntas, diagnosticos, uso] = await Promise.all([
    db.mensagem.count({
      where: { papel: "USUARIO", criadaEm: { gte: inicio }, conversa: { empresaId } },
    }),
    db.diagnostico.count({ where: { empresaId, geradoEm: { gte: inicio } } }),
    db.usoIA.findUnique({
      where: { empresaId_competencia: { empresaId, competencia: competenciaAtual() } },
    }),
  ]);

  return {
    perguntasUsadas: perguntas,
    perguntasLimite: limites.perguntasMes,
    diagnosticosUsados: diagnosticos,
    diagnosticosLimite: limites.diagnosticosMes,
    tokensEntrada: uso?.tokensEntrada ?? 0,
    tokensSaida: uso?.tokensSaida ?? 0,
    chamadas: uso?.chamadas ?? 0,
  };
}

export type Veredito = { permitido: true } | { permitido: false; motivo: string };

export async function conferirCota(
  empresaId: string,
  plano: Plano,
  tipo: "pergunta" | "diagnostico",
): Promise<Veredito> {
  const consumo = await consumoDoMes(empresaId, plano);
  const efetivo = planoEfetivo(plano);

  if (tipo === "pergunta" && consumo.perguntasUsadas >= consumo.perguntasLimite) {
    return {
      permitido: false,
      motivo: `Você usou as ${consumo.perguntasLimite} perguntas do plano ${efetivo === "FREE" ? "gratuito" : efetivo} neste mês.`,
    };
  }
  if (tipo === "diagnostico" && consumo.diagnosticosUsados >= consumo.diagnosticosLimite) {
    return {
      permitido: false,
      motivo: `Você já gerou ${consumo.diagnosticosLimite} diagnósticos neste mês.`,
    };
  }
  return { permitido: true };
}

/** Soma tokens na competencia do mes. Nunca derruba a resposta ao usuario. */
export async function somarConsumo(empresaId: string, uso: Uso): Promise<void> {
  const competencia = competenciaAtual();
  try {
    await db.usoIA.upsert({
      where: { empresaId_competencia: { empresaId, competencia } },
      create: {
        empresaId,
        competencia,
        chamadas: 1,
        tokensEntrada: uso.tokensEntrada,
        tokensSaida: uso.tokensSaida,
      },
      update: {
        chamadas: { increment: 1 },
        tokensEntrada: { increment: uso.tokensEntrada },
        tokensSaida: { increment: uso.tokensSaida },
      },
    });
  } catch (erro) {
    console.error("[uso-ia] falha ao somar consumo", erro);
  }
}
