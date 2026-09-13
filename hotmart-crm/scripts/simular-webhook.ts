import "dotenv/config";

/**
 * Dispara um evento falso contra o seu proprio endpoint.
 *
 * Uso: npm run webhook:simular -- PURCHASE_APPROVED [http://localhost:3000]
 *
 * Serve pra validar o caminho inteiro (hottok → gravacao crua → normalizacao
 * → timeline) antes de apontar a Hotmart pra producao — porque webhook que
 * falha em producao nao volta.
 */
const tipo = process.argv[2] ?? "PURCHASE_APPROVED";
const base = process.argv[3] ?? "http://localhost:3000";
const hottok = process.env.HOTMART_HOTTOK;

if (!hottok) {
  console.error("HOTMART_HOTTOK nao definido no .env.");
  process.exit(1);
}

const agora = Date.now();

const envelope = {
  id: `simulado-${agora}`,
  creation_date: agora,
  event: tipo,
  version: "2.0.0",
  data: {
    product: { id: 9999, name: "Produto de teste" },
    buyer: {
      name: "Comprador de Teste",
      email: "teste@exemplo.com",
      phone: "31999990000",
      address: { country: "BR", state: "MG", city: "Belo Horizonte" },
    },
    purchase: {
      transaction: `HP-SIMULADO-${agora}`,
      order_date: agora,
      approved_date: agora,
      status: tipo === "PURCHASE_REFUNDED" ? "REFUNDED" : "APPROVED",
      commission_as: "PRODUCER",
      is_subscription: false,
      payment: { method: "PIX", installments_number: 1 },
      price: { value: 297, currency_code: "BRL" },
      offer: { code: "oferta-teste" },
      tracking: { source: "simulacao" },
    },
    commissions: [
      { source: "PRODUCER", value: 267.3, currency_code: "BRL" },
      { source: "MARKETPLACE", value: 29.7, currency_code: "BRL" },
    ],
  },
};

const resposta = await fetch(`${base}/api/webhook/hotmart`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-HOTMART-HOTTOK": hottok },
  body: JSON.stringify(envelope),
});

console.log(resposta.status, await resposta.text());
