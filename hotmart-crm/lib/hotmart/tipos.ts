/**
 * Vocabulario da Hotmart.
 *
 * Puro de proposito (sem `server-only`): o painel precisa rotular status no
 * cliente e o normalizador precisa classificar no servidor. Sao as mesmas
 * listas — duplicar seria garantir que um dia divergem.
 *
 * O banco guarda estes valores como string. Se a Hotmart inventar um status
 * novo, ele entra no banco e aparece aqui como desconhecido, em vez de
 * derrubar a ingestao.
 */

// ------------------------------------------------------------ transacoes

export const STATUS_TRANSACAO = {
  APPROVED: "Aprovada",
  BLOCKED: "Bloqueada",
  CANCELLED: "Cancelada",
  CHARGEBACK: "Chargeback",
  COMPLETE: "Concluida",
  DISPUTE: "Em disputa",
  EXPIRED: "Expirada",
  NO_FUNDS: "Sem saldo",
  OVERDUE: "Atrasada",
  PARTIALLY_REFUNDED: "Reembolso parcial",
  PRE_ORDER: "Pre-venda",
  PRINTED_BILLET: "Boleto impresso",
  PROCESSING_TRANSACTION: "Processando",
  PROTESTED: "Protestada",
  REFUNDED: "Reembolsada",
  STARTED: "Iniciada",
  UNDER_ANALISYS: "Em analise",
  WAITING_PAYMENT: "Aguardando pagamento",
} as const;

export type StatusTransacao = keyof typeof STATUS_TRANSACAO;

export function rotularStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return STATUS_TRANSACAO[status as StatusTransacao] ?? status;
}

/** Dinheiro que entrou e ficou. */
export const STATUS_RECEITA: readonly string[] = ["APPROVED", "COMPLETE"];

/** Dinheiro que entrou e voltou. Nao e receita, mas conta na saude do negocio. */
export const STATUS_DEVOLVIDO: readonly string[] = [
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CHARGEBACK",
  "PROTESTED",
  "DISPUTE",
];

/** Intencao de compra que ainda nao virou dinheiro — o meio do funil. */
export const STATUS_PENDENTE: readonly string[] = [
  "PRINTED_BILLET",
  "WAITING_PAYMENT",
  "PROCESSING_TRANSACTION",
  "UNDER_ANALISYS",
  "STARTED",
  "PRE_ORDER",
];

export const contaComoReceita = (s?: string | null) => !!s && STATUS_RECEITA.includes(s);
export const contaComoDevolucao = (s?: string | null) => !!s && STATUS_DEVOLVIDO.includes(s);
export const contaComoPendente = (s?: string | null) => !!s && STATUS_PENDENTE.includes(s);

// ----------------------------------------------------------- assinaturas

export const STATUS_ASSINATURA = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
  DELAYED: "Atrasada",
  OVERDUE: "Inadimplente",
  CANCELLED_BY_CUSTOMER: "Cancelada pelo cliente",
  CANCELLED_BY_SELLER: "Cancelada por voce",
  CANCELLED_BY_ADMIN: "Cancelada pela Hotmart",
  STARTED: "Iniciada",
  EXPIRED: "Expirada",
} as const;

export type StatusAssinatura = keyof typeof STATUS_ASSINATURA;

export function rotularStatusAssinatura(status: string | null | undefined): string {
  if (!status) return "—";
  return STATUS_ASSINATURA[status as StatusAssinatura] ?? status;
}

/** Assinatura que ainda gera MRR. `DELAYED` entra: atrasado nao e cancelado. */
export const ASSINATURA_VIVA: readonly string[] = ["ACTIVE", "DELAYED", "STARTED"];

export const assinaturaViva = (s?: string | null) => !!s && ASSINATURA_VIVA.includes(s);

export const assinaturaCancelada = (s?: string | null) =>
  !!s && s.startsWith("CANCELLED");

/**
 * Meses cobertos por cobranca. E o divisor do MRR: uma anual de R$ 1.200
 * contribui com R$ 100/mes, nao com R$ 1.200 no mes da cobranca — senao o
 * grafico vira um serrote e nao diz nada sobre o negocio.
 */
export const MESES_POR_PERIODO: Record<string, number> = {
  MONTHLY: 1,
  BIMONTHLY: 2,
  QUARTERLY: 3,
  SEMIANNUALLY: 6,
  SEMIANNUAL: 6,
  YEARLY: 12,
  ANNUALLY: 12,
  ANNUAL: 12,
  BIANNUAL: 24,
};

export function mesesDoPeriodo(periodicidade: string | null | undefined): number {
  if (!periodicidade) return 1;
  return MESES_POR_PERIODO[periodicidade.toUpperCase()] ?? 1;
}

// -------------------------------------------------------------- pagamento

export const METODO_PAGAMENTO: Record<string, string> = {
  CREDIT_CARD: "Cartao de credito",
  BILLET: "Boleto",
  PIX: "Pix",
  PAYPAL: "PayPal",
  PAYPAL_INTERNACIONAL: "PayPal",
  GOOGLE_PAY: "Google Pay",
  APPLE_PAY: "Apple Pay",
  SAMSUNG_PAY: "Samsung Pay",
  HOTCARD: "Hotcard",
  HYBRID: "Hibrido",
  BALANCE: "Saldo",
  CASH_PAYMENT: "Dinheiro",
  DIRECT_BANK_TRANSFER: "Transferencia",
  FINANCED_BILLET: "Boleto parcelado",
  FINANCED_INSTALLMENT: "Parcelado",
  WALLET: "Carteira",
};

export function rotularMetodo(metodo: string | null | undefined): string {
  if (!metodo) return "—";
  return METODO_PAGAMENTO[metodo] ?? metodo;
}

// ---------------------------------------------------------------- eventos

/** Tipos de evento do webhook 2.0 que este app processa. */
export const EVENTOS_WEBHOOK = [
  "PURCHASE_APPROVED",
  "PURCHASE_COMPLETE",
  "PURCHASE_CANCELED",
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_PROTEST",
  "PURCHASE_BILLET_PRINTED",
  "PURCHASE_DELAYED",
  "PURCHASE_EXPIRED",
  "PURCHASE_OUT_OF_SHOPPING_CART",
  "SUBSCRIPTION_CANCELLATION",
  "SWITCH_PLAN",
  "UPDATE_SUBSCRIPTION_CHARGE_DATE",
  "CLUB_FIRST_ACCESS",
  "CLUB_MODULE_COMPLETED",
] as const;

export type EventoWebhook = (typeof EVENTOS_WEBHOOK)[number];

/** Tipos da timeline interna (model Evento). Nao sao os do webhook. */
export const TIPO_EVENTO = {
  COMPRA_APROVADA: "Compra aprovada",
  COMPRA_CONCLUIDA: "Compra concluida",
  COMPRA_CANCELADA: "Compra cancelada",
  COMPRA_EXPIRADA: "Compra expirada",
  REEMBOLSO: "Reembolso",
  CHARGEBACK: "Chargeback",
  BOLETO_IMPRESSO: "Boleto gerado",
  PAGAMENTO_ATRASADO: "Pagamento atrasado",
  CARRINHO_ABANDONADO: "Carrinho abandonado",
  ASSINATURA_INICIADA: "Assinatura iniciada",
  ASSINATURA_CANCELADA: "Assinatura cancelada",
  ASSINATURA_RENOVADA: "Renovacao",
  TROCA_DE_PLANO: "Troca de plano",
  COBRANCA_REAGENDADA: "Cobranca reagendada",
  PRIMEIRO_ACESSO: "Primeiro acesso ao curso",
  MODULO_CONCLUIDO: "Modulo concluido",
} as const;

export type TipoEvento = keyof typeof TIPO_EVENTO;

export function rotularEvento(tipo: string): string {
  return TIPO_EVENTO[tipo as TipoEvento] ?? tipo;
}

/** Eventos que pesam negativo na timeline — usados so pra cor na tela. */
export const EVENTOS_NEGATIVOS: readonly string[] = [
  "REEMBOLSO",
  "CHARGEBACK",
  "COMPRA_CANCELADA",
  "ASSINATURA_CANCELADA",
  "PAGAMENTO_ATRASADO",
  "CARRINHO_ABANDONADO",
  "COMPRA_EXPIRADA",
];
