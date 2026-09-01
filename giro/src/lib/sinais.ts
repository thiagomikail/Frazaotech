import "server-only";
import { db } from "./db";
import { diasAtras, diasEntre, inicioDoMes } from "./datas";

/**
 * O retrato e os sinais sao calculados AQUI, em SQL e JavaScript — nao pela IA.
 *
 * Esta separacao e a decisao de arquitetura mais importante do produto. Modelo
 * de linguagem erra aritmetica e inventa numero com voz confiante; um dono de
 * padaria que toma decisao em cima de um faturamento alucinado nao volta mais.
 * Entao o codigo apura o numero e a IA so faz o que ela faz bem: interpretar,
 * priorizar e escrever o proximo passo. Se o agente citar um valor, o valor
 * veio daqui.
 */

export type Gravidade = "alta" | "media" | "baixa";
export type Categoria = "negocio" | "uso";

export type Sinal = {
  chave: string;
  categoria: Categoria;
  gravidade: Gravidade;
  titulo: string;
  /** Numero apurado, para a IA citar sem inventar. */
  evidencia: string;
};

export type Retrato = {
  empresa: { nome: string; segmento: string; diasDeUso: number };
  caixa: {
    entradasMes: number;
    saidasMes: number;
    saldoMes: number;
    entradasMesAnterior: number;
    saidasMesAnterior: number;
    saldoMesAnterior: number;
  };
  funil: {
    porEtapa: { etapa: string; quantidade: number; valorCentavos: number }[];
    valorEmAberto: number;
    ganhos90d: number;
    perdidos90d: number;
    taxaConversao: number | null;
  };
  clientes: {
    total: number;
    novos30d: number;
    compraram90d: number;
    parados: { nome: string; diasSemComprar: number; totalGastoCentavos: number }[];
    concentracaoTop3: number | null;
  };
  ticket: { medio90d: number | null; medioAnterior: number | null };
  tarefas: { abertas: number; atrasadas: number };
  uso: {
    diasDesdeUltimoLancamento: number | null;
    diasDesdeUltimoNegocio: number | null;
    lancamentos30d: number;
    percentualSemCategoria: number;
    clientesSemContato: number;
    negociosSemValor: number;
  };
  sinais: Sinal[];
};

function soma(lista: { valorCentavos: number }[]): number {
  return lista.reduce((t, l) => t + l.valorCentavos, 0);
}

export async function montarRetrato(empresaId: string): Promise<Retrato> {
  const agora = new Date();
  const inicioMes = inicioDoMes();
  const inicioMesAnterior = inicioDoMes(-1);
  // Comparar o mes-ate-hoje com o mes anterior INTEIRO faz todo dia 3 parecer
  // uma catastrofe. O corte abaixo recorta o mesmo numero de dias no mes
  // anterior, para a comparacao ser entre iguais.
  const diaDoMes = agora.getDate();
  const corteMesAnterior = new Date(inicioMesAnterior);
  corteMesAnterior.setMonth(corteMesAnterior.getMonth(), diaDoMes);
  const ha30 = diasAtras(30);
  const ha90 = diasAtras(90);
  const ha180 = diasAtras(180);

  const [empresa, lancamentos, negocios, clientes, tarefas, ultimoLancamento, ultimoNegocio] =
    await Promise.all([
      db.empresa.findUniqueOrThrow({ where: { id: empresaId } }),
      db.lancamento.findMany({
        where: { empresaId, data: { gte: ha180 } },
        select: {
          tipo: true,
          valorCentavos: true,
          data: true,
          categoria: true,
          clienteId: true,
        },
      }),
      db.negocio.findMany({
        where: { empresaId },
        select: { etapa: true, valorCentavos: true, criadoEm: true, fechadoEm: true },
      }),
      db.cliente.findMany({
        where: { empresaId, arquivado: false },
        select: { id: true, nome: true, criadoEm: true, whatsapp: true, email: true },
      }),
      db.tarefa.findMany({ where: { empresaId, feita: false }, select: { prazo: true } }),
      db.lancamento.findFirst({
        where: { empresaId },
        orderBy: { data: "desc" },
        select: { data: true },
      }),
      db.negocio.findFirst({
        where: { empresaId },
        orderBy: { criadoEm: "desc" },
        select: { criadoEm: true },
      }),
    ]);

  // ---------------------------------------------------------------- caixa
  const doMes = lancamentos.filter((l) => l.data >= inicioMes);
  const doMesAnterior = lancamentos.filter(
    (l) => l.data >= inicioMesAnterior && l.data < corteMesAnterior && l.data < inicioMes,
  );
  const entradasMes = soma(doMes.filter((l) => l.tipo === "ENTRADA"));
  const saidasMes = soma(doMes.filter((l) => l.tipo === "SAIDA"));
  const entradasMesAnterior = soma(doMesAnterior.filter((l) => l.tipo === "ENTRADA"));
  const saidasMesAnterior = soma(doMesAnterior.filter((l) => l.tipo === "SAIDA"));

  // ---------------------------------------------------------------- funil
  const ETAPAS = ["NOVO", "CONTATO", "PROPOSTA", "GANHO", "PERDIDO"] as const;
  const porEtapa = ETAPAS.map((etapa) => {
    const doGrupo = negocios.filter((n) => n.etapa === etapa);
    return { etapa, quantidade: doGrupo.length, valorCentavos: soma(doGrupo) };
  });
  const emAberto = negocios.filter(
    (n) => n.etapa === "NOVO" || n.etapa === "CONTATO" || n.etapa === "PROPOSTA",
  );
  const ganhos90d = negocios.filter(
    (n) => n.etapa === "GANHO" && n.fechadoEm && n.fechadoEm >= ha90,
  ).length;
  const perdidos90d = negocios.filter(
    (n) => n.etapa === "PERDIDO" && n.fechadoEm && n.fechadoEm >= ha90,
  ).length;
  const fechados90d = ganhos90d + perdidos90d;

  // ------------------------------------------------------------- clientes
  const entradas = lancamentos.filter((l) => l.tipo === "ENTRADA");
  const ultimaCompra = new Map<string, Date>();
  const totalPorCliente = new Map<string, number>();
  for (const l of entradas) {
    if (!l.clienteId) continue;
    const anterior = ultimaCompra.get(l.clienteId);
    if (!anterior || l.data > anterior) ultimaCompra.set(l.clienteId, l.data);
    totalPorCliente.set(l.clienteId, (totalPorCliente.get(l.clienteId) ?? 0) + l.valorCentavos);
  }

  const parados = clientes
    .map((c) => {
      const quando = ultimaCompra.get(c.id);
      if (!quando) return null;
      const dias = diasEntre(quando, agora);
      return dias >= 60
        ? { nome: c.nome, diasSemComprar: dias, totalGastoCentavos: totalPorCliente.get(c.id) ?? 0 }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.totalGastoCentavos - a.totalGastoCentavos)
    .slice(0, 8);

  const receitaTotal = soma(entradas.filter((l) => l.data >= ha180));
  const top3 = [...totalPorCliente.values()].sort((a, b) => b - a).slice(0, 3);
  const concentracaoTop3 =
    receitaTotal > 0 ? Math.round((top3.reduce((a, b) => a + b, 0) / receitaTotal) * 100) : null;

  // --------------------------------------------------------------- ticket
  const entradas90 = entradas.filter((l) => l.data >= ha90);
  const entradasAnteriores = entradas.filter((l) => l.data < ha90);
  const media = (lista: typeof entradas) =>
    lista.length > 0 ? Math.round(soma(lista) / lista.length) : null;

  // ------------------------------------------------------------------ uso
  const lancamentos30d = lancamentos.filter((l) => l.data >= ha30).length;
  const semCategoria = lancamentos.filter(
    (l) => !l.categoria || l.categoria.toLowerCase() === "outros",
  ).length;
  const percentualSemCategoria =
    lancamentos.length > 0 ? Math.round((semCategoria / lancamentos.length) * 100) : 0;
  const clientesSemContato = clientes.filter((c) => !c.whatsapp && !c.email).length;
  const negociosSemValor = negocios.filter((n) => n.valorCentavos === 0).length;
  const atrasadas = tarefas.filter((t) => t.prazo && t.prazo < agora).length;

  const retrato: Retrato = {
    empresa: {
      nome: empresa.nome,
      segmento: empresa.segmento,
      diasDeUso: diasEntre(empresa.criadaEm, agora),
    },
    caixa: {
      entradasMes,
      saidasMes,
      saldoMes: entradasMes - saidasMes,
      entradasMesAnterior,
      saidasMesAnterior,
      saldoMesAnterior: entradasMesAnterior - saidasMesAnterior,
    },
    funil: {
      porEtapa,
      valorEmAberto: soma(emAberto),
      ganhos90d,
      perdidos90d,
      taxaConversao: fechados90d > 0 ? Math.round((ganhos90d / fechados90d) * 100) : null,
    },
    clientes: {
      total: clientes.length,
      novos30d: clientes.filter((c) => c.criadoEm >= ha30).length,
      compraram90d: new Set(entradas90.map((l) => l.clienteId).filter(Boolean)).size,
      parados,
      concentracaoTop3,
    },
    ticket: { medio90d: media(entradas90), medioAnterior: media(entradasAnteriores) },
    tarefas: { abertas: tarefas.length, atrasadas },
    uso: {
      // Vale a DATA do lancamento, nao quando ele foi digitado: o que cega o
      // diagnostico e o caixa sem cobertura recente, nao a hora da digitacao.
      diasDesdeUltimoLancamento: ultimoLancamento
        ? Math.max(0, diasEntre(ultimoLancamento.data, agora))
        : null,
      diasDesdeUltimoNegocio: ultimoNegocio ? diasEntre(ultimoNegocio.criadoEm, agora) : null,
      lancamentos30d,
      percentualSemCategoria,
      clientesSemContato,
      negociosSemValor,
    },
    sinais: [],
  };

  retrato.sinais = apurarSinais(retrato);
  return retrato;
}

/**
 * Regras fixas, auditaveis, sem IA. Cada sinal carrega a evidencia numerica
 * que a IA vai citar — e so ela.
 */
export function apurarSinais(r: Retrato): Sinal[] {
  const sinais: Sinal[] = [];
  const brl = (c: number) =>
    (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ------------------------------------------------------------- negocio
  if (r.caixa.saldoMes < 0 && new Date().getDate() >= 3) {
    sinais.push({
      chave: "caixa_negativo",
      categoria: "negocio",
      gravidade: "alta",
      titulo: "O mês está fechando no vermelho",
      evidencia: `Entradas ${brl(r.caixa.entradasMes)} contra saídas ${brl(r.caixa.saidasMes)} — saldo ${brl(r.caixa.saldoMes)}.`,
    });
  }

  // Nos primeiros dias do mes a amostra e pequena demais para significar algo.
  const diaDoMes = new Date().getDate();
  if (
    diaDoMes >= 5 &&
    r.caixa.saldoMesAnterior > 0 &&
    r.caixa.saldoMes < r.caixa.saldoMesAnterior * 0.7
  ) {
    sinais.push({
      chave: "saldo_caindo",
      categoria: "negocio",
      gravidade: "media",
      titulo: "O saldo caiu forte contra o mês passado",
      evidencia: `Saldo de ${brl(r.caixa.saldoMes)} contra ${brl(r.caixa.saldoMesAnterior)} no mesmo período do mês anterior.`,
    });
  }

  if (r.clientes.parados.length > 0) {
    const valor = r.clientes.parados.reduce((t, c) => t + c.totalGastoCentavos, 0);
    sinais.push({
      chave: "clientes_parados",
      categoria: "negocio",
      gravidade: r.clientes.parados.length >= 5 ? "alta" : "media",
      titulo: `${r.clientes.parados.length} clientes sumiram`,
      evidencia: `Não compram há 60 dias ou mais e já gastaram ${brl(valor)} no total. O mais antigo está há ${Math.max(...r.clientes.parados.map((c) => c.diasSemComprar))} dias sem comprar.`,
    });
  }

  const proposta = r.funil.porEtapa.find((e) => e.etapa === "PROPOSTA");
  if (proposta && proposta.quantidade >= 3) {
    sinais.push({
      chave: "funil_empilhado_proposta",
      categoria: "negocio",
      gravidade: "media",
      titulo: "Tem proposta empilhada sem resposta",
      evidencia: `${proposta.quantidade} negócios parados em Proposta, somando ${brl(proposta.valorCentavos)}.`,
    });
  }

  if (r.ticket.medio90d !== null && r.ticket.medioAnterior !== null) {
    const variacao = Math.round(
      ((r.ticket.medio90d - r.ticket.medioAnterior) / r.ticket.medioAnterior) * 100,
    );
    if (variacao <= -10) {
      sinais.push({
        chave: "ticket_caindo",
        categoria: "negocio",
        gravidade: "media",
        titulo: `Ticket médio caiu ${Math.abs(variacao)}%`,
        evidencia: `De ${brl(r.ticket.medioAnterior)} para ${brl(r.ticket.medio90d)} nos últimos 90 dias.`,
      });
    }
  }

  if (r.clientes.concentracaoTop3 !== null && r.clientes.concentracaoTop3 >= 50) {
    sinais.push({
      chave: "concentracao",
      categoria: "negocio",
      gravidade: r.clientes.concentracaoTop3 >= 70 ? "alta" : "media",
      titulo: "A receita depende de pouca gente",
      evidencia: `Os 3 maiores clientes respondem por ${r.clientes.concentracaoTop3}% do que entrou.`,
    });
  }

  if (r.tarefas.atrasadas > 0) {
    sinais.push({
      chave: "tarefas_atrasadas",
      categoria: "negocio",
      gravidade: r.tarefas.atrasadas >= 5 ? "media" : "baixa",
      titulo:
        r.tarefas.atrasadas === 1
          ? "1 tarefa passou do prazo"
          : `${r.tarefas.atrasadas} tarefas passaram do prazo`,
      evidencia: `De ${r.tarefas.abertas} tarefas abertas, ${r.tarefas.atrasadas} ${r.tarefas.atrasadas === 1 ? "venceu" : "venceram"}.`,
    });
  }

  // ----------------------------------------------------------------- uso
  // Sem estes, o diagnostico acima vira opiniao sobre dado furado.
  if (r.uso.diasDesdeUltimoLancamento === null) {
    sinais.push({
      chave: "caixa_vazio",
      categoria: "uso",
      gravidade: "alta",
      titulo: "O caixa nunca foi alimentado",
      evidencia: "Nenhum lançamento registrado — sem isso não dá para falar de margem nem de cliente parado.",
    });
  } else if (r.uso.diasDesdeUltimoLancamento >= 10) {
    sinais.push({
      chave: "caixa_desatualizado",
      categoria: "uso",
      gravidade: "alta",
      titulo: `O caixa está ${r.uso.diasDesdeUltimoLancamento} dias sem lançamento`,
      evidencia: `Último registro há ${r.uso.diasDesdeUltimoLancamento} dias; ${r.uso.lancamentos30d} lançamentos nos últimos 30 dias.`,
    });
  }

  if (r.funil.perdidos90d === 0 && r.funil.ganhos90d > 0) {
    sinais.push({
      chave: "nunca_marca_perdido",
      categoria: "uso",
      gravidade: "media",
      titulo: "Nenhum negócio foi marcado como perdido",
      evidencia: `${r.funil.ganhos90d} ganhos e nenhum perdido em 90 dias. A taxa de conversão mostrada está inflada.`,
    });
  }

  if (r.uso.percentualSemCategoria >= 30) {
    sinais.push({
      chave: "sem_categoria",
      categoria: "uso",
      gravidade: "baixa",
      titulo: "A maior parte do caixa está sem categoria",
      evidencia: `${r.uso.percentualSemCategoria}% dos lançamentos estão em "Outros" — não dá para dizer onde o dinheiro vai.`,
    });
  }

  if (r.uso.clientesSemContato > 0 && r.clientes.total > 0) {
    const pct = Math.round((r.uso.clientesSemContato / r.clientes.total) * 100);
    if (pct >= 25) {
      sinais.push({
        chave: "clientes_sem_contato",
        categoria: "uso",
        gravidade: "media",
        titulo: `${r.uso.clientesSemContato} clientes sem WhatsApp nem e-mail`,
        evidencia: `${pct}% da base não tem como ser contatada — reativação fica impossível.`,
      });
    }
  }

  if (r.uso.negociosSemValor >= 3) {
    sinais.push({
      chave: "negocios_sem_valor",
      categoria: "uso",
      gravidade: "baixa",
      titulo: `${r.uso.negociosSemValor} negócios estão sem valor preenchido`,
      evidencia: "Negócio sem valor não entra na conta do funil nem da previsão.",
    });
  }

  const ordem: Record<Gravidade, number> = { alta: 0, media: 1, baixa: 2 };
  return sinais.sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade]);
}
