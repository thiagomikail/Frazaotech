import "server-only";
import { db } from "../db";
import { STATUS_RECEITA, STATUS_DEVOLVIDO } from "../hotmart/tipos";
import { percentual } from "../dinheiro";

/**
 * Origem e afiliado.
 *
 * O `src` da URL de checkout e a unica atribuicao que a Hotmart carrega ate
 * o fim. Quem nao carimba `src` nas campanhas ve tudo cair em "(sem origem)"
 * — o que e informacao tambem: diz que a atribuicao esta quebrada na origem,
 * e nenhum painel conserta isso depois.
 */

export interface LinhaOrigem {
  origem: string;
  liquidoCentavos: number;
  vendas: number;
  ticketMedioCentavos: number;
}

export async function receitaPorOrigem(de: Date, ate: Date, limite = 15): Promise<LinhaOrigem[]> {
  const linhas = await db.transacao.groupBy({
    by: ["origemSrc"],
    where: { status: { in: [...STATUS_RECEITA] }, compradaEm: { gte: de, lte: ate } },
    _sum: { liquidoCentavos: true },
    _count: true,
  });

  return linhas
    .map((l) => {
      const liquido = l._sum.liquidoCentavos ?? 0;
      return {
        origem: l.origemSrc ?? "(sem origem)",
        liquidoCentavos: liquido,
        vendas: l._count,
        ticketMedioCentavos: l._count ? Math.round(liquido / l._count) : 0,
      };
    })
    .sort((a, b) => b.liquidoCentavos - a.liquidoCentavos)
    .slice(0, limite);
}

export interface LinhaAfiliado {
  codigo: string;
  nome: string;
  liquidoCentavos: number;
  vendas: number;
  devolucoes: number;
  taxaDevolucao: number;
}

/**
 * Ranking de afiliado COM taxa de devolucao ao lado do volume.
 *
 * Volume sozinho premia quem vende com promessa exagerada: reembolso alto
 * corroi a margem e, em cartao, taxa de chargeback alta poe a conta em
 * risco. Quem vende muito e devolve muito custa dinheiro — e so aparece
 * quando as duas colunas estao na mesma linha.
 */
export async function rankingDeAfiliados(de: Date, ate: Date, limite = 20): Promise<LinhaAfiliado[]> {
  const [receita, devolucoes, afiliados] = await Promise.all([
    db.transacao.groupBy({
      by: ["afiliadoCodigo"],
      where: {
        status: { in: [...STATUS_RECEITA] },
        compradaEm: { gte: de, lte: ate },
        afiliadoCodigo: { not: null },
      },
      _sum: { liquidoCentavos: true },
      _count: true,
    }),
    db.transacao.groupBy({
      by: ["afiliadoCodigo"],
      where: {
        status: { in: [...STATUS_DEVOLVIDO] },
        compradaEm: { gte: de, lte: ate },
        afiliadoCodigo: { not: null },
      },
      _count: true,
    }),
    db.afiliado.findMany({ select: { codigo: true, nome: true } }),
  ]);

  const nomes = new Map(afiliados.map((a) => [a.codigo, a.nome]));
  const devolvidas = new Map(devolucoes.map((d) => [d.afiliadoCodigo ?? "", d._count]));

  return receita
    .map((l) => {
      const codigo = l.afiliadoCodigo ?? "";
      const vendas = l._count;
      const dev = devolvidas.get(codigo) ?? 0;
      return {
        codigo,
        nome: nomes.get(codigo) ?? codigo,
        liquidoCentavos: l._sum.liquidoCentavos ?? 0,
        vendas,
        devolucoes: dev,
        taxaDevolucao: percentual(dev, vendas + dev),
      };
    })
    .sort((a, b) => b.liquidoCentavos - a.liquidoCentavos)
    .slice(0, limite);
}
