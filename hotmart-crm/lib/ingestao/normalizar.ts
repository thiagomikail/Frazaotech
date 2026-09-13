import "server-only";
import type { VendaBruta, DetalhePrecoBruto, ComissaoBruta } from "../hotmart/vendas";
import type { AssinaturaBruta } from "../hotmart/assinaturas";
import { deEpoch } from "../datas";
import { paraCentavos } from "../dinheiro";
import { mesesDoPeriodo, contaComoReceita, contaComoDevolucao } from "../hotmart/tipos";

/**
 * Payload da Hotmart -> linhas do banco.
 *
 * ⚠️ Este arquivo e o unico lugar do projeto que conhece os NOMES DOS CAMPOS
 * da API. Se a Hotmart mexer no payload, so aqui quebra — e `npm run
 * hotmart:testar` imprime um registro cru lado a lado com o normalizado,
 * justamente pra conferir o mapeamento em minutos em vez de cacar o campo
 * errado dentro de um grafico torto.
 *
 * Toda leitura e tolerante: campo ausente vira `null`, nunca excecao. Numa
 * ingestao, estourar no registro 4.312 de uma janela de 5 mil perde os 688
 * que faltavam.
 */

function texto(valor: unknown): string | null {
  if (typeof valor === "string") return valor.trim() || null;
  if (typeof valor === "number") return String(valor);
  return null;
}

// ------------------------------------------------------------------ venda

export interface TransacaoNormalizada {
  pessoa: {
    email: string;
    nome: string | null;
    telefone: string | null;
    documento: string | null;
    pais: string | null;
    estado: string | null;
    cidade: string | null;
  };
  produto: { id: string; nome: string; ehRecorrente: boolean };
  oferta: { codigo: string; nome: string | null } | null;
  afiliado: { codigo: string; nome: string | null } | null;
  transacao: {
    codigo: string;
    status: string;
    comissaoComo: string | null;
    recorrencia: number | null;
    ehAssinatura: boolean;
    assinaturaCodigo: string | null;
    moeda: string;
    brutoCentavos: number;
    taxaCentavos: number;
    liquidoCentavos: number;
    parcelas: number | null;
    metodoPagamento: string | null;
    origemSrc: string | null;
    origemSck: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    compradaEm: Date;
    aprovadaEm: Date | null;
    confirmadaEm: Date | null;
    garantiaAte: Date | null;
    reembolsadaEm: Date | null;
  };
}

/**
 * A SUA parte da venda.
 *
 * A Hotmart devolve o split inteiro (produtor, coprodutor, afiliado,
 * marketplace). Pegar `total - fee` daria o bolo antes da divisao e inflaria
 * a receita de todo produto que tem afiliado. A regra: casar a linha de
 * comissao com o `commission_as` da propria venda, que e a Hotmart dizendo
 * em que papel voce entrou naquela transacao.
 *
 * Sem split disponivel, cai no bruto menos taxa — e o backfill marca a
 * transacao pra revisao ao imprimir o resumo.
 */
function calcularLiquido(
  venda: VendaBruta,
  preco?: DetalhePrecoBruto,
  split?: ComissaoBruta,
): { brutoCentavos: number; taxaCentavos: number; liquidoCentavos: number; moeda: string } {
  const moeda =
    texto(venda.purchase?.price?.currency_code) ?? texto(preco?.currency_code) ?? "BRL";

  const brutoCentavos = paraCentavos(
    venda.purchase?.price?.value ?? preco?.total ?? 0,
  );
  const taxaCentavos = paraCentavos(preco?.fee ?? 0);

  const papel = (texto(venda.purchase?.commission_as) ?? "PRODUCER").toUpperCase();
  const linhas = split?.commissions ?? [];

  const minhas = linhas.filter((c) => {
    const fonte = (texto(c.source) ?? "").toUpperCase();
    if (!fonte) return false;
    if (fonte === "MARKETPLACE") return false; // a taxa da Hotmart, nunca sua
    // COAUTHOR e CO_PRODUCER sao o mesmo papel escrito de dois jeitos.
    const equivalentes: Record<string, string[]> = {
      PRODUCER: ["PRODUCER"],
      AFFILIATE: ["AFFILIATE"],
      COAUTHOR: ["CO_PRODUCER", "COAUTHOR", "COPRODUCER"],
      CO_PRODUCER: ["CO_PRODUCER", "COAUTHOR", "COPRODUCER"],
    };
    return (equivalentes[papel] ?? [papel]).includes(fonte);
  });

  const liquidoCentavos = minhas.length
    ? minhas.reduce((soma, c) => soma + paraCentavos(c.value), 0)
    : Math.max(brutoCentavos - taxaCentavos, 0);

  return { brutoCentavos, taxaCentavos, liquidoCentavos, moeda };
}

export function normalizarVenda(
  venda: VendaBruta,
  preco?: DetalhePrecoBruto,
  split?: ComissaoBruta,
): TransacaoNormalizada | null {
  const codigo = texto(venda.purchase?.transaction);
  const email = texto(venda.buyer?.email)?.toLowerCase();
  const produtoId = texto(venda.product?.id) ?? texto(venda.product?.ucode);
  const compradaEm = deEpoch(venda.purchase?.order_date);

  // Sem um destes quatro a linha nao ancora em lugar nenhum: nao da pra
  // deduplicar, nao da pra ligar a uma pessoa, nao da pra situar no tempo.
  if (!codigo || !email || !produtoId || !compradaEm) return null;

  const status = (texto(venda.purchase?.status) ?? "UNKNOWN").toUpperCase();
  const { brutoCentavos, taxaCentavos, liquidoCentavos, moeda } = calcularLiquido(
    venda,
    preco,
    split,
  );

  const assinaturaCodigo =
    texto(venda.subscription?.subscriber_code) ?? texto(venda.purchase?.subscription_code);
  const ehAssinatura = venda.purchase?.is_subscription === true || !!assinaturaCodigo;

  const afiliado = venda.affiliates?.find((a) => texto(a.affiliate_code));
  const ofertaCodigo = texto(venda.purchase?.offer?.code);

  return {
    pessoa: {
      email,
      nome: texto(venda.buyer?.name),
      telefone: texto(venda.buyer?.phone),
      documento: texto(venda.buyer?.document),
      pais: texto(venda.buyer?.address?.country),
      estado: texto(venda.buyer?.address?.state),
      cidade: texto(venda.buyer?.address?.city),
    },
    produto: {
      id: produtoId,
      nome: texto(venda.product?.name) ?? `Produto ${produtoId}`,
      ehRecorrente: ehAssinatura,
    },
    oferta: ofertaCodigo ? { codigo: ofertaCodigo, nome: null } : null,
    afiliado: afiliado
      ? { codigo: texto(afiliado.affiliate_code)!, nome: texto(afiliado.name) }
      : null,
    transacao: {
      codigo,
      status,
      comissaoComo: texto(venda.purchase?.commission_as),
      recorrencia: venda.purchase?.recurrency_number ?? null,
      ehAssinatura,
      assinaturaCodigo,
      moeda,
      brutoCentavos,
      taxaCentavos,
      liquidoCentavos,
      parcelas: venda.purchase?.payment?.installments_number ?? null,
      metodoPagamento: texto(venda.purchase?.payment?.method),
      origemSrc: texto(venda.purchase?.tracking?.source),
      origemSck: texto(venda.purchase?.tracking?.source_sck),
      utmSource: texto(venda.purchase?.tracking?.utm_source),
      utmMedium: texto(venda.purchase?.tracking?.utm_medium),
      utmCampaign: texto(venda.purchase?.tracking?.utm_campaign),
      compradaEm,
      aprovadaEm: deEpoch(venda.purchase?.approved_date),
      confirmadaEm: deEpoch(venda.purchase?.confirmation_date),
      garantiaAte: deEpoch(venda.purchase?.warranty_expire_date),
      // A API nao devolve data de reembolso em campo proprio: quando o
      // status ja e devolvido, a confirmacao e a melhor aproximacao que
      // existe. O webhook, esse sim, traz a data exata.
      reembolsadaEm: contaComoDevolucao(status)
        ? (deEpoch(venda.purchase?.confirmation_date) ?? null)
        : null,
    },
  };
}

// ------------------------------------------------------------- assinatura

export interface AssinaturaNormalizada {
  pessoa: { email: string; nome: string | null; telefone: string | null };
  produto: { id: string; nome: string };
  assinatura: {
    codigo: string;
    status: string;
    planoId: string | null;
    planoNome: string | null;
    moeda: string;
    valorCentavos: number;
    periodicidade: string | null;
    mesesPeriodo: number;
    aderiuEm: Date;
    proximaCobrancaEm: Date | null;
    canceladaEm: Date | null;
  };
}

export function normalizarAssinatura(bruta: AssinaturaBruta): AssinaturaNormalizada | null {
  const codigo = texto(bruta.subscriber_code);
  const email = texto(bruta.subscriber?.email)?.toLowerCase();
  const produtoId = texto(bruta.product?.id) ?? texto(bruta.product?.ucode);
  const aderiuEm = deEpoch(bruta.accession_date);

  if (!codigo || !email || !produtoId || !aderiuEm) return null;

  const periodicidade =
    texto(bruta.recurrency_period)?.toUpperCase() ?? null;

  return {
    pessoa: {
      email,
      nome: texto(bruta.subscriber?.name),
      telefone: texto(bruta.subscriber?.phone),
    },
    produto: { id: produtoId, nome: texto(bruta.product?.name) ?? `Produto ${produtoId}` },
    assinatura: {
      codigo,
      status: (texto(bruta.status) ?? "UNKNOWN").toUpperCase(),
      planoId: texto(bruta.plan?.id),
      planoNome: texto(bruta.plan?.name),
      moeda: texto(bruta.price?.currency_code) ?? "BRL",
      valorCentavos: paraCentavos(bruta.price?.value),
      periodicidade,
      mesesPeriodo: mesesDoPeriodo(periodicidade),
      aderiuEm,
      proximaCobrancaEm: deEpoch(bruta.date_next_charge),
      canceladaEm: deEpoch(bruta.cancelation_date),
    },
  };
}

// ---------------------------------------------------------------- eventos

/** Um status de transacao vira um tipo de evento na timeline. */
export function eventoDoStatus(status: string, ehAssinatura: boolean): string | null {
  switch (status) {
    case "APPROVED":
      return ehAssinatura ? "ASSINATURA_RENOVADA" : "COMPRA_APROVADA";
    case "COMPLETE":
      return "COMPRA_CONCLUIDA";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "REEMBOLSO";
    case "CHARGEBACK":
    case "PROTESTED":
    case "DISPUTE":
      return "CHARGEBACK";
    case "CANCELLED":
      return "COMPRA_CANCELADA";
    case "EXPIRED":
      return "COMPRA_EXPIRADA";
    case "PRINTED_BILLET":
      return "BOLETO_IMPRESSO";
    case "OVERDUE":
    case "NO_FUNDS":
      return "PAGAMENTO_ATRASADO";
    default:
      return null;
  }
}

export { contaComoReceita, contaComoDevolucao };
