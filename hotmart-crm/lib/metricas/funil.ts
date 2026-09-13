import "server-only";
import { db } from "../db";
import { STATUS_RECEITA } from "../hotmart/tipos";
import { percentual } from "../dinheiro";

/**
 * Funil de pagamento.
 *
 * Depende de o espelho ter sido carregado COM filtro de status — sem isso a
 * Hotmart so devolve APPROVED e COMPLETE, e um funil onde todo mundo converte
 * nao e um funil, e um espelho pela metade.
 *
 * A leitura aproveita que status e mutavel: um boleto que foi pago hoje esta
 * como APPROVED, nao como PRINTED_BILLET. Entao, por metodo, "aprovadas" sao
 * as que converteram e o resto e o que ficou no caminho.
 */

export interface LinhaFunil {
  metodo: string;
  iniciadas: number;
  aprovadas: number;
  perdidas: number;
  conversao: number;
  valorPerdidoCentavos: number;
}

const PERDIDAS = ["PRINTED_BILLET", "WAITING_PAYMENT", "EXPIRED", "NO_FUNDS", "CANCELLED"];

export async function funilDePagamento(de: Date, ate: Date): Promise<LinhaFunil[]> {
  const [aprovadas, perdidas] = await Promise.all([
    db.transacao.groupBy({
      by: ["metodoPagamento"],
      where: { status: { in: [...STATUS_RECEITA] }, compradaEm: { gte: de, lte: ate } },
      _count: true,
    }),
    db.transacao.groupBy({
      by: ["metodoPagamento"],
      where: { status: { in: PERDIDAS }, compradaEm: { gte: de, lte: ate } },
      _count: true,
      _sum: { brutoCentavos: true },
    }),
  ]);

  const mapa = new Map<string, LinhaFunil>();

  for (const linha of aprovadas) {
    const metodo = linha.metodoPagamento ?? "DESCONHECIDO";
    mapa.set(metodo, {
      metodo,
      iniciadas: linha._count,
      aprovadas: linha._count,
      perdidas: 0,
      conversao: 100,
      valorPerdidoCentavos: 0,
    });
  }

  for (const linha of perdidas) {
    const metodo = linha.metodoPagamento ?? "DESCONHECIDO";
    const atual =
      mapa.get(metodo) ??
      { metodo, iniciadas: 0, aprovadas: 0, perdidas: 0, conversao: 0, valorPerdidoCentavos: 0 };
    atual.perdidas = linha._count;
    atual.iniciadas += linha._count;
    atual.valorPerdidoCentavos = linha._sum.brutoCentavos ?? 0;
    mapa.set(metodo, atual);
  }

  return [...mapa.values()]
    .map((l) => ({ ...l, conversao: percentual(l.aprovadas, l.iniciadas) }))
    .sort((a, b) => b.iniciadas - a.iniciadas);
}

export interface ResumoCarrinho {
  abandonados: number;
  recuperados: number;
  taxaRecuperacao: number;
  valorAbandonadoCentavos: number;
  /** Quando 0, quase sempre significa webhook desligado — nao zero real. */
  temDados: boolean;
}

export async function resumoDeCarrinho(de: Date, ate: Date): Promise<ResumoCarrinho> {
  const [total, recuperados, valor, existeAlgum] = await Promise.all([
    db.carrinhoAbandonado.count({ where: { abandonadoEm: { gte: de, lte: ate } } }),
    db.carrinhoAbandonado.count({
      where: { abandonadoEm: { gte: de, lte: ate }, convertidoEm: { not: null } },
    }),
    db.carrinhoAbandonado.aggregate({
      where: { abandonadoEm: { gte: de, lte: ate } },
      _sum: { valorCentavos: true },
    }),
    db.carrinhoAbandonado.count(),
  ]);

  return {
    abandonados: total,
    recuperados,
    taxaRecuperacao: percentual(recuperados, total),
    valorAbandonadoCentavos: valor._sum.valorCentavos ?? 0,
    temDados: existeAlgum > 0,
  };
}
