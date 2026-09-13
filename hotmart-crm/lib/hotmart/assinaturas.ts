import "server-only";
import { paginar, listar } from "./cliente";
import { paraEpoch } from "../datas";

export interface AssinaturaBruta {
  subscriber_code?: string;
  subscriber?: { name?: string; email?: string; ucode?: string; phone?: string };
  status?: string;
  accession_date?: number;
  /** Proxima tentativa de cobranca. Em cancelada, e o ultimo dia de acesso. */
  date_next_charge?: number;
  end_accession_date?: number;
  trial?: boolean;
  request_date?: number;
  cancelation_date?: number;
  product?: { id?: number | string; name?: string; ucode?: string };
  plan?: { name?: string; id?: number | string; recurrency_period?: number };
  price?: { value?: number; currency_code?: string };
  /** MONTHLY | BIMONTHLY | QUARTERLY | SEMIANNUAL | ANNUAL */
  recurrency_period?: string;
  transaction?: string;
}

export interface CobrancaBruta {
  transaction?: string;
  status?: string;
  recurrency_number?: number;
  purchase_date?: number;
  approved_date?: number;
  price?: { value?: number; currency_code?: string };
  payment?: { method?: string; installments_number?: number };
}

export interface FiltroAssinaturas {
  status?: string;
  produtoId?: string;
  inicio?: Date;
  fim?: Date;
  codigo?: string;
}

export function listarAssinaturas(f: FiltroAssinaturas = {}) {
  return paginar<AssinaturaBruta>("/payments/api/v1/subscriptions", {
    status: f.status,
    product_id: f.produtoId,
    subscriber_code: f.codigo,
    accession_date: f.inicio ? paraEpoch(f.inicio) : undefined,
    end_accession_date: f.fim ? paraEpoch(f.fim) : undefined,
  });
}

/**
 * Historico de cobranca de um assinante. Caro (uma chamada por assinante),
 * entao a ingestao so chama pra quem interessa: assinatura atrasada ou
 * cancelada, onde a sequencia de cobrancas explica o que aconteceu.
 */
export function cobrancasDaAssinatura(codigo: string) {
  return listar<CobrancaBruta>(`/payments/api/v1/subscriptions/${codigo}/purchases`);
}
