/**
 * Confere o retrato e os sinais sem gastar um token de IA.
 * Precisa de --conditions=react-server, senao `server-only` derruba o script.
 *
 *   npm run olhar:sinais
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { montarRetrato } from "../src/lib/sinais";
import { formatarBRL } from "../src/lib/dinheiro";

async function main() {
  const empresa = await db.empresa.findFirstOrThrow({ orderBy: { criadaEm: "asc" } });
  const r = await montarRetrato(empresa.id);

  console.log(`\n=== ${r.empresa.nome} (${r.empresa.segmento}) — ${r.empresa.diasDeUso} dias de uso ===\n`);
  console.log("CAIXA");
  console.log(`  entradas mes    ${formatarBRL(r.caixa.entradasMes)}  (anterior ${formatarBRL(r.caixa.entradasMesAnterior)})`);
  console.log(`  saidas mes      ${formatarBRL(r.caixa.saidasMes)}  (anterior ${formatarBRL(r.caixa.saidasMesAnterior)})`);
  console.log(`  saldo mes       ${formatarBRL(r.caixa.saldoMes)}  (anterior ${formatarBRL(r.caixa.saldoMesAnterior)})`);

  console.log("\nFUNIL");
  for (const e of r.funil.porEtapa) {
    console.log(`  ${e.etapa.padEnd(9)} ${String(e.quantidade).padStart(2)}  ${formatarBRL(e.valorCentavos)}`);
  }
  console.log(`  em aberto       ${formatarBRL(r.funil.valorEmAberto)} · conversao ${r.funil.taxaConversao ?? "—"}%`);

  console.log("\nCLIENTES");
  console.log(`  total ${r.clientes.total} · novos 30d ${r.clientes.novos30d} · compraram 90d ${r.clientes.compraram90d}`);
  console.log(`  concentracao top3 ${r.clientes.concentracaoTop3}%`);
  for (const c of r.clientes.parados) {
    console.log(`  parado: ${c.nome.padEnd(26)} ${c.diasSemComprar}d  ${formatarBRL(c.totalGastoCentavos)}`);
  }

  console.log("\nTICKET");
  console.log(`  90d ${r.ticket.medio90d !== null ? formatarBRL(r.ticket.medio90d) : "—"} · antes ${r.ticket.medioAnterior !== null ? formatarBRL(r.ticket.medioAnterior) : "—"}`);

  console.log("\nUSO DO APP");
  console.log(`  ${JSON.stringify(r.uso)}`);

  console.log(`\nSINAIS (${r.sinais.length})`);
  for (const s of r.sinais) {
    console.log(`\n  [${s.gravidade}/${s.categoria}] ${s.titulo}`);
    console.log(`      ${s.evidencia}`);
  }
  console.log();
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
