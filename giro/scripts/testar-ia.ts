/**
 * Confere a ligacao com o OpenRouter de ponta a ponta, sem passar pela tela.
 * O container de desenvolvimento pode nao ter saida para openrouter.ai — este
 * script e o jeito de provar que a chave e o modelo funcionam na sua maquina.
 *
 *   npm run testar:ia                 # so pergunta ao consultor
 *   npm run testar:ia -- diagnostico  # gera um diagnostico completo
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { iaConfigurada, modeloPadrao } from "../src/lib/openrouter";
import { gerarDiagnostico, perguntarAoConsultor } from "../src/lib/agente";

async function main() {
  if (!iaConfigurada()) {
    console.error("OPENROUTER_API_KEY nao definida. Veja .env.example.");
    process.exit(1);
  }

  const empresa = await db.empresa.findFirstOrThrow({ orderBy: { criadaEm: "asc" } });
  console.log(`empresa: ${empresa.nome}`);
  console.log(`modelo:  ${modeloPadrao()}\n`);

  if (process.argv[2] === "diagnostico") {
    const { diagnostico, uso } = await gerarDiagnostico(empresa.id);
    console.log("RESUMO\n  " + diagnostico.resumo + "\n");
    console.log("ACHADOS");
    for (const a of diagnostico.achados) {
      console.log(`  [${a.gravidade}] ${a.titulo}\n      ${a.evidencia}`);
    }
    console.log("\nPROXIMOS PASSOS");
    diagnostico.proximosPassos.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.titulo} (${p.esforco})\n      ${p.porque}`);
    });
    console.log(`\ntokens: ${uso.tokensEntrada} entrada / ${uso.tokensSaida} saida`);
    return;
  }

  const pergunta = process.argv.slice(2).join(" ") || "Por que sobrou menos dinheiro este mes?";
  console.log(`pergunta: ${pergunta}\n`);
  const r = await perguntarAoConsultor(empresa.id, pergunta);
  console.log("ferramentas usadas:", r.passos.map((p) => p.ferramenta).join(", ") || "nenhuma");
  console.log("\n" + r.texto);
  console.log(`\ntokens: ${r.uso.tokensEntrada} entrada / ${r.uso.tokensSaida} saida`);
}

main()
  .catch((erro) => {
    console.error("\nFALHOU:", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
