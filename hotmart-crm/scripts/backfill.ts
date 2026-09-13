import "dotenv/config";
import { backfill, sincronizarAssinaturas, sincronizarClub } from "../lib/ingestao/sincronizar";
import { clubAtivo } from "../lib/hotmart/club";
import { formatarData } from "../lib/datas";

/**
 * Carga do historico inteiro.
 *
 * Uso: npm run hotmart:backfill -- 2023-01-01
 *
 * Retomavel: cada janela de 30 dias que fecha vira um marco no banco, entao
 * rodar de novo depois de uma queda continua de onde parou em vez de
 * recomecar tres anos de vendas.
 */
async function principal() {
  const desdeTexto = process.argv[2];
  if (!desdeTexto) {
    console.error("Uso: npm run hotmart:backfill -- 2023-01-01");
    process.exit(1);
  }

  const desde = new Date(`${desdeTexto}T00:00:00Z`);
  if (Number.isNaN(desde.getTime())) {
    console.error(`Data invalida: ${desdeTexto}`);
    process.exit(1);
  }

  console.log(`Carregando vendas desde ${formatarData(desde)}…\n`);

  const total = await backfill(desde, new Date(), (janela, r) => {
    console.log(
      `  ${formatarData(janela.inicio)} → ${formatarData(janela.fim)}  ` +
        `${String(r.transacoes).padStart(5)} transacoes  ` +
        `${String(r.pessoas).padStart(4)} pessoas` +
        (r.ignoradas ? `  (${r.ignoradas} ignoradas)` : ""),
    );
  });

  console.log(`\n${total.transacoes} transacoes, ${total.pessoas} pessoas.`);

  if (total.ignoradas) {
    console.log(
      `⚠️  ${total.ignoradas} registros ignorados por falta de transacao, e-mail, produto ou data.`,
    );
  }
  if (total.semSplit) {
    console.log(
      `⚠️  ${total.semSplit} transacoes sem detalhe de comissao — o liquido delas caiu em\n` +
        "    bruto menos taxa, que ignora o split de afiliado e superestima a receita.",
    );
  }

  console.log("\nAssinaturas…");
  const assinaturas = await sincronizarAssinaturas();
  console.log(`  ${assinaturas.total} assinaturas, ${assinaturas.vivas} vivas.`);

  if (clubAtivo()) {
    console.log("\nArea de membros…");
    const club = await sincronizarClub();
    console.log(`  ${club.alunos} alunos com engajamento.`);
  } else {
    console.log("\nClub desligado (HOTMART_CLUB_SUBDOMAIN vazio) — sem dado de engajamento,");
    console.log("o risco de churn perde o sinal mais forte que tem.");
  }

  console.log("\nPronto. Abra o painel.");
}

principal().catch((erro) => {
  console.error("\n❌", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
