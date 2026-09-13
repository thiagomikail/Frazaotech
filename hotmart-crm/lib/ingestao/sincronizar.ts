import "server-only";
import { db } from "../db";
import { janelaCompleta, type FiltroVendas } from "../hotmart/vendas";
import { listarAssinaturas } from "../hotmart/assinaturas";
import { listarAlunos, clubAtivo } from "../hotmart/club";
import { normalizarVenda, normalizarAssinatura, eventoDoStatus } from "./normalizar";
import { garantirPessoa, recalcularAgregados, normalizarEmail } from "./pessoas";
import { janelas, somarDias, deEpoch } from "../datas";
import { assinaturaViva } from "../hotmart/tipos";

/**
 * Ingestao.
 *
 * Duas entradas pro mesmo funil: o backfill (historico inteiro, uma vez) e a
 * incremental (o cron diario). As duas chamam `sincronizarJanela` — a
 * diferenca e so o tamanho do intervalo.
 *
 * Tudo e idempotente por codigo de transacao. Rodar duas vezes a mesma
 * janela e seguro, e precisa ser: a incremental sempre volta alguns dias pra
 * tras, porque venda muda de status depois (boleto aprova no dia seguinte,
 * reembolso cai uma semana depois) e uma janela que so anda pra frente nunca
 * ficaria sabendo.
 */

const SOBREPOSICAO_DIAS = 7;

export interface ResultadoJanela {
  transacoes: number;
  pessoas: number;
  ignoradas: number;
  semSplit: number;
}

export async function sincronizarJanela(
  inicio: Date,
  fim: Date,
  status?: string,
): Promise<ResultadoJanela> {
  const filtro: FiltroVendas = { inicio, fim, status };
  const { vendas, precos, splits } = await janelaCompleta(filtro);

  const pessoasTocadas: string[] = [];
  let ignoradas = 0;
  let semSplit = 0;

  for (const bruta of vendas) {
    const dados = normalizarVenda(
      bruta,
      precos.get(bruta.purchase?.transaction ?? ""),
      splits.get(bruta.purchase?.transaction ?? ""),
    );

    if (!dados) {
      ignoradas += 1;
      continue;
    }
    if (!splits.has(dados.transacao.codigo)) semSplit += 1;

    const pessoaId = await garantirPessoa(dados.pessoa);
    pessoasTocadas.push(pessoaId);

    await db.produto.upsert({
      where: { id: dados.produto.id },
      // O nome pode mudar no painel da Hotmart; `ehRecorrente` so liga,
      // nunca desliga — um produto com plano de assinatura continua
      // recorrente mesmo que a proxima venda avulsa diga o contrario.
      update: {
        nome: dados.produto.nome,
        ...(dados.produto.ehRecorrente ? { ehRecorrente: true } : {}),
      },
      create: dados.produto,
    });

    if (dados.oferta) {
      await db.oferta.upsert({
        where: { codigo: dados.oferta.codigo },
        update: {},
        create: { codigo: dados.oferta.codigo, produtoId: dados.produto.id },
      });
    }

    if (dados.afiliado) {
      await db.afiliado.upsert({
        where: { codigo: dados.afiliado.codigo },
        update: dados.afiliado.nome ? { nome: dados.afiliado.nome } : {},
        create: dados.afiliado,
      });
    }

    const linha = {
      ...dados.transacao,
      pessoaId,
      produtoId: dados.produto.id,
      ofertaCodigo: dados.oferta?.codigo ?? null,
      afiliadoCodigo: dados.afiliado?.codigo ?? null,
      sincronizadaEm: new Date(),
    };

    await db.transacao.upsert({
      where: { codigo: dados.transacao.codigo },
      update: linha,
      create: linha,
    });

    await registrarEvento({
      tipo: eventoDoStatus(dados.transacao.status, dados.transacao.ehAssinatura),
      pessoaId,
      produtoId: dados.produto.id,
      transacaoCodigo: dados.transacao.codigo,
      assinaturaCodigo: dados.transacao.assinaturaCodigo,
      ocorridoEm:
        dados.transacao.aprovadaEm ?? dados.transacao.compradaEm,
      valorCentavos: dados.transacao.liquidoCentavos,
    });
  }

  await recalcularAgregados(pessoasTocadas);
  await casarCarrinhosAbandonados(inicio);

  return {
    transacoes: vendas.length - ignoradas,
    pessoas: new Set(pessoasTocadas).size,
    ignoradas,
    semSplit,
  };
}

/** Evento da timeline, sem duplicar quando a mesma janela roda de novo. */
export async function registrarEvento(dados: {
  tipo: string | null;
  pessoaId?: string | null;
  produtoId?: string | null;
  transacaoCodigo?: string | null;
  assinaturaCodigo?: string | null;
  ocorridoEm: Date;
  resumo?: string | null;
  valorCentavos?: number | null;
  extras?: Record<string, unknown>;
}): Promise<void> {
  if (!dados.tipo) return;

  const jaExiste = await db.evento.findFirst({
    where: {
      tipo: dados.tipo,
      transacaoCodigo: dados.transacaoCodigo ?? null,
      assinaturaCodigo: dados.assinaturaCodigo ?? null,
      pessoaId: dados.pessoaId ?? null,
      ocorridoEm: dados.ocorridoEm,
    },
    select: { id: true },
  });
  if (jaExiste) return;

  await db.evento.create({
    data: {
      tipo: dados.tipo,
      pessoaId: dados.pessoaId ?? null,
      produtoId: dados.produtoId ?? null,
      transacaoCodigo: dados.transacaoCodigo ?? null,
      assinaturaCodigo: dados.assinaturaCodigo ?? null,
      ocorridoEm: dados.ocorridoEm,
      resumo: dados.resumo ?? null,
      valorCentavos: dados.valorCentavos ?? null,
      dados: (dados.extras ?? undefined) as never,
    },
  });
}

// ----------------------------------------------------------- assinaturas

export async function sincronizarAssinaturas(): Promise<{ total: number; vivas: number }> {
  const pessoasTocadas: string[] = [];
  let total = 0;
  let vivas = 0;

  for await (const bruta of listarAssinaturas()) {
    const dados = normalizarAssinatura(bruta);
    if (!dados) continue;
    total += 1;
    if (assinaturaViva(dados.assinatura.status)) vivas += 1;

    const pessoaId = await garantirPessoa({ ...dados.pessoa, email: dados.pessoa.email });
    pessoasTocadas.push(pessoaId);

    await db.produto.upsert({
      where: { id: dados.produto.id },
      update: { nome: dados.produto.nome, ehRecorrente: true },
      create: { ...dados.produto, ehRecorrente: true },
    });

    const anterior = await db.assinatura.findUnique({
      where: { codigo: dados.assinatura.codigo },
      select: { status: true, planoNome: true },
    });

    const linha = {
      ...dados.assinatura,
      pessoaId,
      produtoId: dados.produto.id,
      sincronizadaEm: new Date(),
    };

    await db.assinatura.upsert({
      where: { codigo: dados.assinatura.codigo },
      update: linha,
      create: linha,
    });

    if (!anterior) {
      await registrarEvento({
        tipo: "ASSINATURA_INICIADA",
        pessoaId,
        produtoId: dados.produto.id,
        assinaturaCodigo: dados.assinatura.codigo,
        ocorridoEm: dados.assinatura.aderiuEm,
        resumo: dados.assinatura.planoNome,
        valorCentavos: dados.assinatura.valorCentavos,
      });
    }

    if (
      dados.assinatura.canceladaEm &&
      anterior?.status !== dados.assinatura.status &&
      dados.assinatura.status.startsWith("CANCELLED")
    ) {
      await registrarEvento({
        tipo: "ASSINATURA_CANCELADA",
        pessoaId,
        produtoId: dados.produto.id,
        assinaturaCodigo: dados.assinatura.codigo,
        ocorridoEm: dados.assinatura.canceladaEm,
        resumo: dados.assinatura.status,
      });
    }

    if (anterior?.planoNome && dados.assinatura.planoNome !== anterior.planoNome) {
      await registrarEvento({
        tipo: "TROCA_DE_PLANO",
        pessoaId,
        assinaturaCodigo: dados.assinatura.codigo,
        ocorridoEm: new Date(),
        resumo: `${anterior.planoNome} → ${dados.assinatura.planoNome}`,
      });
    }
  }

  await recalcularAgregados(pessoasTocadas);

  return { total, vivas };
}

// ---------------------------------------------------------------- club

export async function sincronizarClub(): Promise<{ alunos: number }> {
  if (!clubAtivo()) return { alunos: 0 };

  let alunos = 0;
  for await (const bruto of listarAlunos()) {
    const email = normalizarEmail(bruto.email);
    if (!email) continue;

    const pessoa = await db.pessoa.findUnique({ where: { email }, select: { id: true } });
    // Aluno sem compra no espelho e quase sempre acesso manual ou cortesia.
    // Criar pessoa aqui poluiria a base de CRM com quem nunca comprou.
    if (!pessoa) continue;

    alunos += 1;
    const ultimoAcessoEm = deEpoch(bruto.last_access_date);
    const primeiroAcessoEm = deEpoch(bruto.first_access_date);
    const concluidas = bruto.engagement?.completed_lessons ?? 0;
    const totais = bruto.engagement?.total_lessons ?? 0;

    // Sem produto no payload do Club, o engajamento e da area de membros
    // inteira. Ancoramos no produto recorrente mais recente da pessoa.
    const produto = await db.assinatura.findFirst({
      where: { pessoaId: pessoa.id },
      orderBy: { aderiuEm: "desc" },
      select: { produtoId: true },
    });
    if (!produto) continue;

    await db.engajamentoAluno.upsert({
      where: { pessoaId_produtoId: { pessoaId: pessoa.id, produtoId: produto.produtoId } },
      update: {
        ultimoAcessoEm,
        primeiroAcessoEm,
        aulasConcluidas: concluidas,
        aulasTotais: totais,
        progressoPct: totais ? Number(((concluidas / totais) * 100).toFixed(1)) : 0,
      },
      create: {
        pessoaId: pessoa.id,
        produtoId: produto.produtoId,
        ultimoAcessoEm,
        primeiroAcessoEm,
        aulasConcluidas: concluidas,
        aulasTotais: totais,
        progressoPct: totais ? Number(((concluidas / totais) * 100).toFixed(1)) : 0,
      },
    });

    if (ultimoAcessoEm) {
      await db.pessoa.update({
        where: { id: pessoa.id },
        data: { ultimoAcessoEm },
      });
    }
  }

  return { alunos };
}

// ------------------------------------------------- carrinho abandonado

/**
 * Fecha o ciclo do carrinho abandonado: se o mesmo e-mail comprou depois de
 * abandonar, a recuperacao aconteceu. E a unica forma de medir se a
 * sequencia de resgate funciona.
 */
async function casarCarrinhosAbandonados(desde: Date): Promise<void> {
  const abertos = await db.carrinhoAbandonado.findMany({
    where: { convertidoEm: null, abandonadoEm: { gte: somarDias(desde, -90) } },
    select: { id: true, email: true, abandonadoEm: true },
    take: 2_000,
  });

  for (const carrinho of abertos) {
    const pessoa = await db.pessoa.findUnique({
      where: { email: carrinho.email },
      select: { id: true },
    });
    if (!pessoa) continue;

    const compra = await db.transacao.findFirst({
      where: {
        pessoaId: pessoa.id,
        status: { in: ["APPROVED", "COMPLETE"] },
        compradaEm: { gt: carrinho.abandonadoEm },
      },
      orderBy: { compradaEm: "asc" },
      select: { compradaEm: true },
    });
    if (!compra) continue;

    await db.carrinhoAbandonado.update({
      where: { id: carrinho.id },
      data: { convertidoEm: compra.compradaEm },
    });
  }
}

// --------------------------------------------------------------- marcos

export async function ultimoMarco(tipo: string): Promise<Date | null> {
  const marco = await db.sincronizacaoLog.findFirst({
    where: { tipo, status: "OK" },
    orderBy: { janelaFim: "desc" },
    select: { janelaFim: true },
  });
  return marco?.janelaFim ?? null;
}

async function comMarco<T>(
  tipo: string,
  inicio: Date,
  fim: Date,
  trabalho: () => Promise<{ registros: number } & T>,
): Promise<({ registros: number } & T) | null> {
  const log = await db.sincronizacaoLog.create({
    data: { tipo, janelaInicio: inicio, janelaFim: fim },
    select: { id: true },
  });

  try {
    const saida = await trabalho();
    await db.sincronizacaoLog.update({
      where: { id: log.id },
      data: { status: "OK", registros: saida.registros, terminadoEm: new Date() },
    });
    return saida;
  } catch (erro) {
    await db.sincronizacaoLog.update({
      where: { id: log.id },
      data: {
        status: "ERRO",
        erro: erro instanceof Error ? erro.message : String(erro),
        terminadoEm: new Date(),
      },
    });
    throw erro;
  }
}

/**
 * Historico inteiro, em janelas. Retomavel: cada janela que fecha vira um
 * marco, entao uma queda no meio de tres anos de vendas recomeca da janela
 * que falhou, nao do inicio.
 */
export async function backfill(
  desde: Date,
  ate = new Date(),
  aoAndar?: (janela: { inicio: Date; fim: Date }, r: ResultadoJanela) => void,
): Promise<ResultadoJanela> {
  const total: ResultadoJanela = { transacoes: 0, pessoas: 0, ignoradas: 0, semSplit: 0 };

  for (const janela of janelas(desde, ate, 30)) {
    const jaFeita = await db.sincronizacaoLog.findFirst({
      where: { tipo: "VENDAS", status: "OK", janelaInicio: janela.inicio },
      select: { id: true },
    });
    if (jaFeita) continue;

    const r = await comMarco("VENDAS", janela.inicio, janela.fim, async () => {
      // Sem `status`, a Hotmart devolve so APPROVED e COMPLETE — e o funil
      // (boleto impresso, expirado, reembolsado) nunca entra no espelho.
      const saida = await sincronizarJanela(janela.inicio, janela.fim);
      return { ...saida, registros: saida.transacoes };
    });

    if (r) {
      total.transacoes += r.transacoes;
      total.pessoas += r.pessoas;
      total.ignoradas += r.ignoradas;
      total.semSplit += r.semSplit;
      aoAndar?.(janela, r);
    }
  }

  return total;
}

/** O que o cron roda todo dia. */
export async function sincronizacaoIncremental(): Promise<{
  vendas: ResultadoJanela;
  assinaturas: { total: number; vivas: number };
  club: { alunos: number };
}> {
  const marco = await ultimoMarco("VENDAS");
  const inicio = marco ? somarDias(marco, -SOBREPOSICAO_DIAS) : somarDias(new Date(), -30);
  const fim = new Date();

  const vendas =
    (await comMarco("VENDAS", inicio, fim, async () => {
      const saida = await sincronizarJanela(inicio, fim);
      return { ...saida, registros: saida.transacoes };
    })) ?? { transacoes: 0, pessoas: 0, ignoradas: 0, semSplit: 0, registros: 0 };

  const assinaturas =
    (await comMarco("ASSINATURAS", inicio, fim, async () => {
      const saida = await sincronizarAssinaturas();
      return { ...saida, registros: saida.total };
    })) ?? { total: 0, vivas: 0, registros: 0 };

  const club = clubAtivo()
    ? ((await comMarco("CLUB", inicio, fim, async () => {
        const saida = await sincronizarClub();
        return { ...saida, registros: saida.alunos };
      })) ?? { alunos: 0, registros: 0 })
    : { alunos: 0 };

  return { vendas, assinaturas, club };
}
