import "server-only";
import { paginar } from "./cliente";
import { paraEpoch } from "../datas";

/**
 * Endpoints de venda.
 *
 * Os tres endpoints (historico, detalhes de preco e comissoes) aceitam os
 * MESMOS filtros de data. Por isso a ingestao busca as tres listas da janela
 * inteira e cruza por codigo de transacao — em vez de uma chamada por venda,
 * que num backfill de 10 mil vendas seria 30 mil requisicoes e um dia de
 * rate limit.
 *
 * Todo campo e opcional de proposito. Nao se escreve contra uma API de
 * terceiro assumindo que o payload veio inteiro: um campo ausente tem que
 * virar `null` no banco, nunca uma excecao que perde a janela toda.
 */

export interface VendaBruta {
  product?: { id?: number | string; name?: string; ucode?: string };
  buyer?: {
    name?: string;
    email?: string;
    ucode?: string;
    phone?: string;
    document?: string;
    address?: { country?: string; state?: string; city?: string };
  };
  producer?: { name?: string; ucode?: string };
  purchase?: {
    transaction?: string;
    order_date?: number;
    approved_date?: number;
    confirmation_date?: number;
    warranty_expire_date?: number;
    status?: string;
    recurrency_number?: number;
    is_subscription?: boolean;
    commission_as?: string;
    subscription_code?: string;
    payment?: { method?: string; installments_number?: number; type?: string };
    price?: { value?: number; currency_code?: string };
    offer?: { code?: string; payment_mode?: string };
    tracking?: {
      source?: string;
      source_sck?: string;
      external_code?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    };
  };
  subscription?: { subscriber_code?: string; status?: string; plan?: { name?: string } };
  affiliates?: Array<{ affiliate_code?: string; name?: string }>;
}

export interface DetalhePrecoBruto {
  transaction?: string;
  currency_code?: string;
  /** O que o comprador pagou. */
  total?: number;
  /** Taxa da Hotmart. */
  fee?: number;
  /** O que sobra pro produtor antes do split de afiliado/coprodutor. */
  real_conversion_rate?: number;
  vat?: number;
  base?: number;
  coupon_code?: string;
}

export interface ComissaoBruta {
  transaction?: string;
  commissions?: Array<{
    user?: { name?: string; ucode?: string };
    /** PRODUCER | AFFILIATE | CO_PRODUCER | MARKETPLACE */
    source?: string;
    currency_code?: string;
    value?: number;
  }>;
}

export interface FiltroVendas {
  inicio: Date;
  fim: Date;
  /** Sem isso a Hotmart devolve so APPROVED e COMPLETE — e o funil some. */
  status?: string;
  produtoId?: string;
  transacao?: string;
}

function filtrosBasicos(f: FiltroVendas) {
  return {
    start_date: paraEpoch(f.inicio),
    end_date: paraEpoch(f.fim),
    transaction_status: f.status,
    product_id: f.produtoId,
    transaction: f.transacao,
  };
}

export function historicoDeVendas(f: FiltroVendas) {
  return paginar<VendaBruta>("/payments/api/v1/sales/history", filtrosBasicos(f));
}

export function detalhesDePreco(f: FiltroVendas) {
  return paginar<DetalhePrecoBruto>("/payments/api/v1/sales/price/details", filtrosBasicos(f));
}

export function comissoes(f: FiltroVendas) {
  return paginar<ComissaoBruta>("/payments/api/v1/sales/commissions", filtrosBasicos(f));
}

/**
 * Busca a janela inteira de uma vez e devolve os cruzamentos ja indexados
 * por transacao. A ingestao so precisa iterar as vendas e consultar os dois
 * mapas.
 */
export async function janelaCompleta(f: FiltroVendas) {
  const vendas: VendaBruta[] = [];
  for await (const v of historicoDeVendas(f)) vendas.push(v);

  const precos = new Map<string, DetalhePrecoBruto>();
  for await (const p of detalhesDePreco(f)) {
    if (p.transaction) precos.set(p.transaction, p);
  }

  const splits = new Map<string, ComissaoBruta>();
  for await (const c of comissoes(f)) {
    if (c.transaction) splits.set(c.transaction, c);
  }

  return { vendas, precos, splits };
}
