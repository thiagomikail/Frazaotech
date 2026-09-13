import "server-only";
import { db } from "../db";
import { ASSINATURA_VIVA } from "../hotmart/tipos";
import { rotuloMes } from "../datas";
import { percentual } from "../dinheiro";

/**
 * Assinaturas: MRR, churn e cohort.
 *
 * O MRR normaliza por periodo — uma anual de R$ 1.200 entra como R$ 100/mes,
 * nao como R$ 1.200 no mes da cobranca. Sem isso o grafico vira serrote e
 * nao diz nada sobre o tamanho do negocio.
 *
 * As series historicas sao SQL cru de proposito. Reconstruir "quantas
 * assinaturas estavam vivas no fim de cada um dos ultimos 24 meses" no
 * Node significaria trazer a tabela inteira e varrer 24 vezes; em Postgres e
 * um `generate_series` com um join.
 */

export interface ResumoRecorrencia {
  mrrCentavos: number;
  arrCentavos: number;
  assinantesAtivos: number;
  ticketMedioCentavos: number;
  canceladasNoMes: number;
  churnMensal: number;
  cobrancasProximos7Dias: number;
  valorProximos7DiasCentavos: number;
  inadimplentes: number;
}

export async function resumoDeRecorrencia(agora = new Date()): Promise<ResumoRecorrencia> {
  const inicioDoMes = new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1),
  );
  const em7Dias = new Date(agora.getTime() + 7 * 86_400_000);

  const vivas = await db.assinatura.findMany({
    where: { status: { in: [...ASSINATURA_VIVA] } },
    select: { valorCentavos: true, mesesPeriodo: true, proximaCobrancaEm: true, status: true },
  });

  const mrrCentavos = vivas.reduce(
    (soma, a) => soma + Math.round(a.valorCentavos / Math.max(a.mesesPeriodo, 1)),
    0,
  );

  const proximas = vivas.filter(
    (a) => a.proximaCobrancaEm && a.proximaCobrancaEm >= agora && a.proximaCobrancaEm <= em7Dias,
  );

  const [canceladasNoMes, ativasNoInicioDoMes, inadimplentes] = await Promise.all([
    db.assinatura.count({ where: { canceladaEm: { gte: inicioDoMes, lte: agora } } }),
    db.assinatura.count({
      where: {
        aderiuEm: { lt: inicioDoMes },
        OR: [{ canceladaEm: null }, { canceladaEm: { gte: inicioDoMes } }],
      },
    }),
    db.assinatura.count({ where: { status: { in: ["DELAYED", "OVERDUE"] } } }),
  ]);

  return {
    mrrCentavos,
    arrCentavos: mrrCentavos * 12,
    assinantesAtivos: vivas.length,
    ticketMedioCentavos: vivas.length ? Math.round(mrrCentavos / vivas.length) : 0,
    canceladasNoMes,
    churnMensal: percentual(canceladasNoMes, ativasNoInicioDoMes),
    cobrancasProximos7Dias: proximas.length,
    valorProximos7DiasCentavos: proximas.reduce((s, a) => s + a.valorCentavos, 0),
    inadimplentes,
  };
}

export interface PontoRecorrencia {
  chave: string;
  rotulo: string;
  mrrCentavos: number;
  assinantes: number;
  novas: number;
  canceladas: number;
  churn: number;
}

export async function serieDeRecorrencia(meses = 12): Promise<PontoRecorrencia[]> {
  const linhas = await db.$queryRaw<
    Array<{
      chave: string;
      mrr: number;
      assinantes: number;
      novas: number;
      canceladas: number;
      base: number;
    }>
  >`
    WITH meses AS (
      SELECT generate_series(
        date_trunc('month', now()) - make_interval(months => ${meses - 1}),
        date_trunc('month', now()),
        '1 month'
      ) AS inicio
    ),
    janela AS (
      SELECT inicio, (inicio + interval '1 month' - interval '1 microsecond') AS fim
      FROM meses
    )
    SELECT
      to_char(j.inicio, 'YYYY-MM') AS chave,
      -- Vivas no ULTIMO instante do mes: e a foto que se compara mes a mes.
      COALESCE(SUM(
        CASE WHEN a."aderiuEm" <= j.fim
              AND (a."canceladaEm" IS NULL OR a."canceladaEm" > j.fim)
             THEN round(a."valorCentavos"::numeric / GREATEST(a."mesesPeriodo", 1))
        END
      ), 0)::int AS mrr,
      COUNT(*) FILTER (
        WHERE a."aderiuEm" <= j.fim
          AND (a."canceladaEm" IS NULL OR a."canceladaEm" > j.fim)
      )::int AS assinantes,
      COUNT(*) FILTER (
        WHERE a."aderiuEm" BETWEEN j.inicio AND j.fim
      )::int AS novas,
      COUNT(*) FILTER (
        WHERE a."canceladaEm" BETWEEN j.inicio AND j.fim
      )::int AS canceladas,
      -- Base do churn: quem ja era assinante quando o mes comecou.
      COUNT(*) FILTER (
        WHERE a."aderiuEm" < j.inicio
          AND (a."canceladaEm" IS NULL OR a."canceladaEm" >= j.inicio)
      )::int AS base
    FROM janela j
    LEFT JOIN "Assinatura" a ON true
    GROUP BY j.inicio
    ORDER BY j.inicio
  `;

  return linhas.map((l) => ({
    chave: l.chave,
    rotulo: rotuloMes(l.chave),
    mrrCentavos: Number(l.mrr),
    assinantes: Number(l.assinantes),
    novas: Number(l.novas),
    canceladas: Number(l.canceladas),
    churn: percentual(Number(l.canceladas), Number(l.base)),
  }));
}

export interface LinhaCohort {
  coorte: string;
  rotulo: string;
  tamanho: number;
  /** Retencao por mes desde a adesao. `null` = mes ainda nao aconteceu. */
  retencao: Array<number | null>;
}

/**
 * Cohort de retencao: de cada safra de assinantes, quantos continuam vivos
 * 1, 2, 3... meses depois.
 *
 * E a unica leitura que separa "estou vendendo mais" de "estou retendo mais".
 * Duas safras com o mesmo churn mensal podem ter curvas completamente
 * diferentes — e a curva e que diz se o produto entrega o que prometeu.
 */
export async function cohortDeRetencao(mesesDeHistorico = 12): Promise<LinhaCohort[]> {
  const linhas = await db.$queryRaw<
    Array<{ coorte: string; offset_mes: number; vivos: number; tamanho: number }>
  >`
    WITH base AS (
      SELECT
        date_trunc('month', "aderiuEm") AS coorte,
        "aderiuEm",
        COALESCE("canceladaEm", 'infinity'::timestamptz) AS fim
      FROM "Assinatura"
      WHERE "aderiuEm" >= date_trunc('month', now())
                         - make_interval(months => ${mesesDeHistorico - 1})
    ),
    tamanhos AS (
      SELECT coorte, COUNT(*)::int AS tamanho FROM base GROUP BY coorte
    )
    SELECT
      to_char(b.coorte, 'YYYY-MM') AS coorte,
      o.offset_mes::int AS offset_mes,
      COUNT(*) FILTER (
        WHERE b.fim > b.coorte + make_interval(months => o.offset_mes)
      )::int AS vivos,
      MAX(t.tamanho)::int AS tamanho
    FROM base b
    JOIN tamanhos t ON t.coorte = b.coorte
    CROSS JOIN generate_series(0, ${mesesDeHistorico - 1}) AS o(offset_mes)
    GROUP BY b.coorte, o.offset_mes
    ORDER BY b.coorte, o.offset_mes
  `;

  const agora = new Date();
  const porCoorte = new Map<string, LinhaCohort>();

  for (const linha of linhas) {
    const atual = porCoorte.get(linha.coorte) ?? {
      coorte: linha.coorte,
      rotulo: rotuloMes(linha.coorte),
      tamanho: Number(linha.tamanho),
      retencao: [],
    };

    const [ano, mes] = linha.coorte.split("-").map(Number);
    const mesDoPonto = new Date(Date.UTC(ano, mes - 1 + Number(linha.offset_mes), 1));

    // Safra de agosto nao tem "mes 6" ainda. Mostrar 0% ali seria inventar
    // um churn que nao aconteceu — a celula fica vazia.
    atual.retencao[Number(linha.offset_mes)] =
      mesDoPonto > agora ? null : percentual(Number(linha.vivos), Number(linha.tamanho));

    porCoorte.set(linha.coorte, atual);
  }

  return [...porCoorte.values()].sort((a, b) => b.coorte.localeCompare(a.coorte));
}
