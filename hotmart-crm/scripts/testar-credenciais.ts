import "dotenv/config";
import { historicoDeVendas } from "../lib/hotmart/vendas";
import { normalizarVenda } from "../lib/ingestao/normalizar";
import { somarDias } from "../lib/datas";
import { formatar } from "../lib/dinheiro";

/**
 * Primeiro comando a rodar depois de configurar o .env.
 *
 * Autentica, puxa UMA venda e imprime o payload cru lado a lado com o
 * normalizado. Existe porque o mapeamento de campo em lib/ingestao/
 * normalizar.ts foi escrito contra a documentacao, nao contra a SUA conta:
 * conferir aqui custa dois minutos, descobrir depois custa um painel inteiro
 * com numero errado.
 */
async function principal() {
  console.log("Autenticando na Hotmart…");

  const fim = new Date();
  const inicio = somarDias(fim, -365);

  let encontrada = false;

  for await (const venda of historicoDeVendas({ inicio, fim })) {
    encontrada = true;

    console.log("\n─── PAYLOAD CRU ───────────────────────────────────────");
    console.log(JSON.stringify(venda, null, 2));

    const normalizada = normalizarVenda(venda);
    console.log("\n─── NORMALIZADO ───────────────────────────────────────");
    if (!normalizada) {
      console.log("❌ A normalizacao devolveu null — falta transacao, e-mail,");
      console.log("   produto ou data de compra no payload acima.");
      break;
    }

    console.log(`transacao   ${normalizada.transacao.codigo}`);
    console.log(`comprador   ${normalizada.pessoa.nome ?? "—"} <${normalizada.pessoa.email}>`);
    console.log(`produto     ${normalizada.produto.nome}`);
    console.log(`status      ${normalizada.transacao.status}`);
    console.log(`bruto       ${formatar(normalizada.transacao.brutoCentavos)}`);
    console.log(`taxa        ${formatar(normalizada.transacao.taxaCentavos)}`);
    console.log(`liquido     ${formatar(normalizada.transacao.liquidoCentavos)}`);
    console.log(`metodo      ${normalizada.transacao.metodoPagamento ?? "—"}`);
    console.log(`origem src  ${normalizada.transacao.origemSrc ?? "—"}`);
    console.log(`assinatura  ${normalizada.transacao.assinaturaCodigo ?? "nao"}`);

    console.log("\n⚠️  Confira o LIQUIDO contra o extrato da Hotmart. Se divergir,");
    console.log("   ajuste calcularLiquido() em lib/ingestao/normalizar.ts —");
    console.log("   e o unico lugar do projeto que conhece o nome dos campos.");
    break;
  }

  if (!encontrada) {
    console.log("\n✅ Credenciais funcionam, mas nao ha venda nos ultimos 365 dias.");
  }
}

principal().catch((erro) => {
  console.error("\n❌", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
