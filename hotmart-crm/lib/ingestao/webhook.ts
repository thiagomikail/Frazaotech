import "server-only";
import { db } from "../db";
import { normalizarVenda, eventoDoStatus } from "./normalizar";
import { garantirPessoa, recalcularAgregados, normalizarEmail } from "./pessoas";
import { registrarEvento } from "./sincronizar";
import { deEpoch } from "../datas";
import { paraCentavos } from "../dinheiro";
import { mesesDoPeriodo } from "../hotmart/tipos";
import type { VendaBruta, ComissaoBruta } from "../hotmart/vendas";

/**
 * Webhook 2.0.
 *
 * O payload de compra tem a MESMA forma do item de `sales/history`
 * (product / buyer / purchase), entao a normalizacao e reaproveitada inteira
 * — um mapeamento de campo so, num lugar so.
 *
 * O que muda e a postura: aqui nao existe segunda chance. Uma entrega que
 * falha some, e carrinho abandonado nao tem endpoint de historico nenhum.
 * Por isso o payload cru e gravado ANTES de qualquer interpretacao: se a
 * normalizacao tiver bug, o reprocessamento e possivel.
 */

export interface EnvelopeWebhook {
  id?: string;
  creation_date?: number;
  event?: string;
  version?: string;
  hottok?: string;
  data?: Record<string, unknown>;
}

/**
 * Comparacao em tempo constante. Um `===` vaza o tamanho do prefixo correto
 * pelo tempo de resposta, e este endpoint e publico por necessidade.
 */
export function hottokValido(recebido: string | null | undefined): boolean {
  const esperado = process.env.HOTMART_HOTTOK;
  if (!esperado) throw new Error("HOTMART_HOTTOK nao definido. Veja .env.example.");
  if (!recebido || recebido.length !== esperado.length) return false;

  let diferenca = 0;
  for (let i = 0; i < esperado.length; i += 1) {
    diferenca |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  }
  return diferenca === 0;
}

/** Grava o cru. Devolve `false` se o evento ja tinha chegado antes. */
export async function registrarBruto(envelope: EnvelopeWebhook): Promise<boolean> {
  const id = envelope.id ?? `sem-id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const existente = await db.eventoWebhook.findUnique({
    where: { id },
    select: { processadoEm: true },
  });
  // A Hotmart reentrega o que nao recebeu 200. Reprocessar uma compra e
  // idempotente, mas reprocessar um evento ja concluido so gasta banco.
  if (existente?.processadoEm) return false;

  await db.eventoWebhook.upsert({
    where: { id },
    update: { tentativas: { increment: 1 } },
    create: {
      id,
      tipo: envelope.event ?? "DESCONHECIDO",
      versao: envelope.version ?? null,
      payload: envelope as never,
    },
  });
  return true;
}

export async function marcarProcessado(id: string, erro?: string): Promise<void> {
  await db.eventoWebhook.update({
    where: { id },
    data: { processadoEm: erro ? null : new Date(), erro: erro ?? null },
  });
}

// ------------------------------------------------------------ processador

export async function processar(envelope: EnvelopeWebhook): Promise<string> {
  const tipo = envelope.event ?? "DESCONHECIDO";
  const dados = (envelope.data ?? {}) as Record<string, unknown>;

  switch (tipo) {
    case "PURCHASE_APPROVED":
    case "PURCHASE_COMPLETE":
    case "PURCHASE_CANCELED":
    case "PURCHASE_REFUNDED":
    case "PURCHASE_CHARGEBACK":
    case "PURCHASE_PROTEST":
    case "PURCHASE_BILLET_PRINTED":
    case "PURCHASE_DELAYED":
    case "PURCHASE_EXPIRED":
      return processarCompra(dados, tipo);

    case "PURCHASE_OUT_OF_SHOPPING_CART":
      return processarCarrinhoAbandonado(dados, envelope.creation_date);

    case "SUBSCRIPTION_CANCELLATION":
      return processarCancelamento(dados, envelope.creation_date);

    case "SWITCH_PLAN":
      return processarTrocaDePlano(dados, envelope.creation_date);

    case "UPDATE_SUBSCRIPTION_CHARGE_DATE":
      return processarNovaDataDeCobranca(dados);

    case "CLUB_FIRST_ACCESS":
    case "CLUB_MODULE_COMPLETED":
      return processarClub(dados, tipo, envelope.creation_date);

    default:
      return `evento ignorado: ${tipo}`;
  }
}

async function processarCompra(dados: Record<string, unknown>, tipo: string): Promise<string> {
  const venda = dados as VendaBruta;
  const split: ComissaoBruta | undefined = Array.isArray(dados.commissions)
    ? { commissions: dados.commissions as ComissaoBruta["commissions"] }
    : undefined;

  const normalizada = normalizarVenda(venda, undefined, split);
  if (!normalizada) return `payload de ${tipo} sem transacao/comprador/produto — ignorado`;

  const pessoaId = await garantirPessoa(normalizada.pessoa);

  await db.produto.upsert({
    where: { id: normalizada.produto.id },
    update: {
      nome: normalizada.produto.nome,
      ...(normalizada.produto.ehRecorrente ? { ehRecorrente: true } : {}),
    },
    create: normalizada.produto,
  });

  if (normalizada.oferta) {
    await db.oferta.upsert({
      where: { codigo: normalizada.oferta.codigo },
      update: {},
      create: { codigo: normalizada.oferta.codigo, produtoId: normalizada.produto.id },
    });
  }

  if (normalizada.afiliado) {
    await db.afiliado.upsert({
      where: { codigo: normalizada.afiliado.codigo },
      update: normalizada.afiliado.nome ? { nome: normalizada.afiliado.nome } : {},
      create: normalizada.afiliado,
    });
  }

  const linha = {
    ...normalizada.transacao,
    pessoaId,
    produtoId: normalizada.produto.id,
    ofertaCodigo: normalizada.oferta?.codigo ?? null,
    afiliadoCodigo: normalizada.afiliado?.codigo ?? null,
    sincronizadaEm: new Date(),
  };

  await db.transacao.upsert({
    where: { codigo: normalizada.transacao.codigo },
    update: linha,
    create: linha,
  });

  await registrarEvento({
    tipo: eventoDoStatus(normalizada.transacao.status, normalizada.transacao.ehAssinatura),
    pessoaId,
    produtoId: normalizada.produto.id,
    transacaoCodigo: normalizada.transacao.codigo,
    assinaturaCodigo: normalizada.transacao.assinaturaCodigo,
    ocorridoEm: normalizada.transacao.aprovadaEm ?? normalizada.transacao.compradaEm,
    valorCentavos: normalizada.transacao.liquidoCentavos,
  });

  await recalcularAgregados([pessoaId]);
  return `${tipo} ${normalizada.transacao.codigo} gravada`;
}

/**
 * Carrinho abandonado. NAO tem backfill: so existe o que chega por aqui, no
 * momento em que chega. Por isso e o primeiro evento a ligar no painel da
 * Hotmart, mesmo antes do resto do app estar pronto.
 */
async function processarCarrinhoAbandonado(
  dados: Record<string, unknown>,
  criadoEm?: number,
): Promise<string> {
  const buyer = dados.buyer as { email?: string; name?: string; phone?: string } | undefined;
  const product = dados.product as { id?: number | string } | undefined;
  const offer = dados.offer as { code?: string } | undefined;
  const preco = dados.price as { value?: number } | undefined;

  const email = normalizarEmail(buyer?.email);
  if (!email) return "carrinho abandonado sem e-mail — ignorado";

  const abandonadoEm = deEpoch(criadoEm) ?? new Date();

  const jaExiste = await db.carrinhoAbandonado.findFirst({
    where: { email, abandonadoEm },
    select: { id: true },
  });
  if (jaExiste) return "carrinho abandonado repetido — ignorado";

  await db.carrinhoAbandonado.create({
    data: {
      email,
      nome: buyer?.name ?? null,
      telefone: buyer?.phone ?? null,
      produtoId: product?.id ? String(product.id) : null,
      ofertaCodigo: offer?.code ?? null,
      valorCentavos: preco?.value ? paraCentavos(preco.value) : null,
      abandonadoEm,
    },
  });

  const pessoa = await db.pessoa.findUnique({ where: { email }, select: { id: true } });
  await registrarEvento({
    tipo: "CARRINHO_ABANDONADO",
    pessoaId: pessoa?.id ?? null,
    ocorridoEm: abandonadoEm,
    resumo: offer?.code ?? null,
    valorCentavos: preco?.value ? paraCentavos(preco.value) : null,
  });

  return `carrinho abandonado de ${email} gravado`;
}

async function processarCancelamento(
  dados: Record<string, unknown>,
  criadoEm?: number,
): Promise<string> {
  const assinatura = dados.subscription as
    | { subscriber_code?: string; status?: string; plan?: { name?: string } }
    | undefined;
  const codigo =
    assinatura?.subscriber_code ??
    (dados.subscriber as { code?: string } | undefined)?.code;
  if (!codigo) return "cancelamento sem codigo de assinante — ignorado";

  const existente = await db.assinatura.findUnique({
    where: { codigo },
    select: { pessoaId: true, produtoId: true },
  });
  const canceladaEm = deEpoch(criadoEm) ?? new Date();

  if (existente) {
    await db.assinatura.update({
      where: { codigo },
      data: {
        status: assinatura?.status?.toUpperCase() ?? "CANCELLED_BY_CUSTOMER",
        canceladaEm,
        motivoCancelamento:
          (dados.cancellation_date_reason as string | undefined) ??
          (dados.reason as string | undefined) ??
          null,
      },
    });
  }

  await registrarEvento({
    tipo: "ASSINATURA_CANCELADA",
    pessoaId: existente?.pessoaId ?? null,
    produtoId: existente?.produtoId ?? null,
    assinaturaCodigo: codigo,
    ocorridoEm: canceladaEm,
    resumo: assinatura?.plan?.name ?? null,
  });

  return `assinatura ${codigo} cancelada`;
}

async function processarTrocaDePlano(
  dados: Record<string, unknown>,
  criadoEm?: number,
): Promise<string> {
  const assinatura = dados.subscription as { subscriber_code?: string } | undefined;
  const planos = dados.plans as Array<{ name?: string; current?: boolean }> | undefined;
  const codigo = assinatura?.subscriber_code;
  if (!codigo) return "troca de plano sem codigo — ignorada";

  const novo = planos?.find((p) => p.current)?.name ?? null;
  const antigo = planos?.find((p) => !p.current)?.name ?? null;
  const ocorridoEm = deEpoch(criadoEm) ?? new Date();

  const existente = await db.assinatura.findUnique({
    where: { codigo },
    select: { pessoaId: true, produtoId: true },
  });

  if (existente && novo) {
    await db.assinatura.update({
      where: { codigo },
      data: { planoNome: novo, trocouDePlanoEm: ocorridoEm },
    });
  }

  await registrarEvento({
    tipo: "TROCA_DE_PLANO",
    pessoaId: existente?.pessoaId ?? null,
    produtoId: existente?.produtoId ?? null,
    assinaturaCodigo: codigo,
    ocorridoEm,
    resumo: antigo && novo ? `${antigo} → ${novo}` : (novo ?? null),
  });

  return `troca de plano em ${codigo}`;
}

async function processarNovaDataDeCobranca(dados: Record<string, unknown>): Promise<string> {
  const assinatura = dados.subscription as { subscriber_code?: string } | undefined;
  const codigo = assinatura?.subscriber_code;
  const nova = deEpoch(dados.date_next_charge as number | undefined);
  if (!codigo || !nova) return "reagendamento incompleto — ignorado";

  const existente = await db.assinatura.findUnique({
    where: { codigo },
    select: { pessoaId: true, periodicidade: true },
  });
  if (!existente) return `assinatura ${codigo} ainda nao sincronizada — ignorado`;

  await db.assinatura.update({
    where: { codigo },
    data: {
      proximaCobrancaEm: nova,
      mesesPeriodo: mesesDoPeriodo(existente.periodicidade),
    },
  });

  await registrarEvento({
    tipo: "COBRANCA_REAGENDADA",
    pessoaId: existente.pessoaId,
    assinaturaCodigo: codigo,
    ocorridoEm: new Date(),
    resumo: nova.toISOString().slice(0, 10),
  });

  return `cobranca de ${codigo} reagendada`;
}

async function processarClub(
  dados: Record<string, unknown>,
  tipo: string,
  criadoEm?: number,
): Promise<string> {
  const usuario = dados.user as { email?: string; name?: string } | undefined;
  const email = normalizarEmail(usuario?.email);
  if (!email) return "evento de club sem e-mail — ignorado";

  const pessoa = await db.pessoa.findUnique({ where: { email }, select: { id: true } });
  if (!pessoa) return `aluno ${email} sem compra no espelho — ignorado`;

  const ocorridoEm = deEpoch(criadoEm) ?? new Date();
  const modulo = (dados.module as { name?: string } | undefined)?.name ?? null;

  await db.pessoa.update({ where: { id: pessoa.id }, data: { ultimoAcessoEm: ocorridoEm } });

  await registrarEvento({
    tipo: tipo === "CLUB_FIRST_ACCESS" ? "PRIMEIRO_ACESSO" : "MODULO_CONCLUIDO",
    pessoaId: pessoa.id,
    ocorridoEm,
    resumo: modulo,
  });

  return `${tipo} de ${email} gravado`;
}
