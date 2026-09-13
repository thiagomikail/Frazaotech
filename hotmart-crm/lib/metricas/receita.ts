import "server-only";
import { db } from "../db";
import { STATUS_RECEITA, STATUS_DEVOLVIDO } from "../hotmart/tipos";
import { variacao, percentual } from "../dinheiro";
import { chaveDia, chaveMes, rotuloMes } from "../datas";

/**
 * Receita.
 *
 * Toda soma usa `liquidoCentavos` — a sua parte depois da taxa da Hotmart e
 * do split de afiliado. Faturamento bruto e o numero que a Hotmart mostra na
 * home e que faz todo mundo achar que ganha mais do que ganha; ele aparece
 * aqui como referencia, ao lado, nunca sozinho.
 */

export interface ResumoReceita {
  brutoCentavos: number;
  liquidoCentavos: number;
  taxaCentavos: number;
  vendas: number;
  ticketMedioCentavos: number;
  devolucoes: number;
  valorDevolvidoCentavos: number;
  taxaDevolucao: number;
  variacaoLiquido: number | null;
  variacaoVendas: number | null;
}

async function somar(de: Date, ate: Date) {
  const [receita, devolvido] = await Promise.all([
    db.transacao.aggregate({
      where: { status: { in: [...STATUS_RECEITA] }, compradaEm: { gte: de, lte: ate } },
      _sum: { brutoCentavos: true, liquidoCentavos: true, taxaCentavos: true },
      _count: true,
    }),
    db.transacao.aggregate({
      where: { status: { in: [...STATUS_DEVOLVIDO] }, compradaEm: { gte: de, lte: ate } },
      _sum: { liquidoCentavos: true },
      _count: true,
    }),
  ]);

  return {
    bruto: receita._sum.brutoCentavos ?? 0,
    liquido: receita._sum.liquidoCentavos ?? 0,
    taxa: receita._sum.taxaCentavos ?? 0,
    vendas: receita._count,
    devolucoes: devolvido._count,
    valorDevolvido: devolvido._sum.liquidoCentavos ?? 0,
  };
}

export async function resumoDeReceita(
  de: Date,
  ate: Date,
  deAnterior: Date,
  ateAnterior: Date,
): Promise<ResumoReceita> {
  const [atual, anterior] = await Promise.all([
    somar(de, ate),
    somar(deAnterior, ateAnterior),
  ]);

  return {
    brutoCentavos: atual.bruto,
    liquidoCentavos: atual.liquido,
    taxaCentavos: atual.taxa,
    vendas: atual.vendas,
    ticketMedioCentavos: atual.vendas ? Math.round(atual.liquido / atual.vendas) : 0,
    devolucoes: atual.devolucoes,
    valorDevolvidoCentavos: atual.valorDevolvido,
    // Devolucao sobre o total de tentativas que viraram dinheiro: e a taxa
    // que a operadora de cartao olha, e a que antecipa bloqueio de conta.
    taxaDevolucao: percentual(atual.devolucoes, atual.vendas + atual.devolucoes),
    variacaoLiquido: variacao(atual.liquido, anterior.liquido),
    variacaoVendas: variacao(atual.vendas, anterior.vendas),
  };
}

export interface PontoSerie {
  rotulo: string;
  liquidoCentavos: number;
  brutoCentavos: number;
  vendas: number;
}

export async function serieDeReceita(
  de: Date,
  ate: Date,
  granularidade: "dia" | "mes",
): Promise<PontoSerie[]> {
  const linhas = await db.transacao.findMany({
    where: { status: { in: [...STATUS_RECEITA] }, compradaEm: { gte: de, lte: ate } },
    select: { compradaEm: true, liquidoCentavos: true, brutoCentavos: true },
    orderBy: { compradaEm: "asc" },
  });

  const balde = new Map<string, PontoSerie>();
  for (const linha of linhas) {
    const chave =
      granularidade === "dia" ? chaveDia(linha.compradaEm) : chaveMes(linha.compradaEm);
    const ponto = balde.get(chave) ?? {
      rotulo: granularidade === "dia" ? chave.slice(8) + "/" + chave.slice(5, 7) : rotuloMes(chave),
      liquidoCentavos: 0,
      brutoCentavos: 0,
      vendas: 0,
    };
    ponto.liquidoCentavos += linha.liquidoCentavos;
    ponto.brutoCentavos += linha.brutoCentavos;
    ponto.vendas += 1;
    balde.set(chave, ponto);
  }

  return [...balde.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

export interface LinhaProduto {
  produtoId: string;
  nome: string;
  ehRecorrente: boolean;
  liquidoCentavos: number;
  vendas: number;
  devolucoes: number;
  taxaDevolucao: number;
}

export async function receitaPorProduto(de: Date, ate: Date): Promise<LinhaProduto[]> {
  const [receita, devolucoes, produtos] = await Promise.all([
    db.transacao.groupBy({
      by: ["produtoId"],
      where: { status: { in: [...STATUS_RECEITA] }, compradaEm: { gte: de, lte: ate } },
      _sum: { liquidoCentavos: true },
      _count: true,
    }),
    db.transacao.groupBy({
      by: ["produtoId"],
      where: { status: { in: [...STATUS_DEVOLVIDO] }, compradaEm: { gte: de, lte: ate } },
      _count: true,
    }),
    db.produto.findMany({ select: { id: true, nome: true, ehRecorrente: true } }),
  ]);

  const nomes = new Map(produtos.map((p) => [p.id, p]));
  const devolvidas = new Map(devolucoes.map((d) => [d.produtoId, d._count]));

  return receita
    .map((linha) => {
      const vendas = linha._count;
      const dev = devolvidas.get(linha.produtoId) ?? 0;
      return {
        produtoId: linha.produtoId,
        nome: nomes.get(linha.produtoId)?.nome ?? linha.produtoId,
        ehRecorrente: nomes.get(linha.produtoId)?.ehRecorrente ?? false,
        liquidoCentavos: linha._sum.liquidoCentavos ?? 0,
        vendas,
        devolucoes: dev,
        taxaDevolucao: percentual(dev, vendas + dev),
      };
    })
    .sort((a, b) => b.liquidoCentavos - a.liquidoCentavos);
}

export interface LinhaMetodo {
  metodo: string;
  liquidoCentavos: number;
  vendas: number;
}

export async function receitaPorMetodo(de: Date, ate: Date): Promise<LinhaMetodo[]> {
  const linhas = await db.transacao.groupBy({
    by: ["metodoPagamento"],
    where: { status: { in: [...STATUS_RECEITA] }, compradaEm: { gte: de, lte: ate } },
    _sum: { liquidoCentavos: true },
    _count: true,
  });

  return linhas
    .map((l) => ({
      metodo: l.metodoPagamento ?? "DESCONHECIDO",
      liquidoCentavos: l._sum.liquidoCentavos ?? 0,
      vendas: l._count,
    }))
    .sort((a, b) => b.liquidoCentavos - a.liquidoCentavos);
}
