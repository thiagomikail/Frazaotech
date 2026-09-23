import "dotenv/config";
import { analisar, montarPrompt } from "../lib/analise";
import type { Respostas } from "../lib/perguntas";
import { pontuar } from "../lib/pontuacao";

/**
 * Roda a análise num caso fixo, sem banco e sem site. Serve pra calibrar o
 * prompt: mude o texto em lib/analise.ts e rode de novo.
 *
 *   npm run testar:analise            → imprime o prompt e chama o Gemini
 *   npm run testar:analise -- --seco  → só o prompt, sem gastar chamada
 *
 * O caso é de propósito contraditório: diz que falta cliente, mas demora dois
 * dias pra responder. Uma boa análise TEM que apontar isso.
 */
const caso: Respostas = {
  modelo: "personalizado", equipe: "1", faturamento: "50-150", ticket: "15-40", leads: "30-100",
  conversao: "1-2", recompra: "nsei", dobro: "demanda", horasDono: "60+", resposta: "1-2d", perda: "sumiu",
  horas: { atendimento: "8-15", proposta: "15+", roteiro: "8-15", posvenda: "3-8", marketing: "3-8", relacionamento: "0", backoffice: "3-8" },
  odeia: ["proposta", "backoffice"], dados: "cabeca", processo: "nada", canais: ["whatsapp", "instagram"],
  usoIA: "texto", medo: ["humanizacao", "erro"], orcamento: "ate200", tempoImplantar: "ate2",
  tarefa: "Cliente manda áudio de 4 minutos no WhatsApp. Escuto duas vezes, anoto no caderno, pesquiso voo em 3 sites, hotel na consolidadora e no Booking, monto a proposta no Canva e mando PDF. Metade some depois.",
  objetivo: "Parar de passar a noite montando proposta que o cliente nem responde.",
};

async function main() {
  const p = pontuar(caso);
  console.log(montarPrompt(caso, p, { nome: "Teste", agencia: "Agência Teste" }));
  if (process.argv.includes("--seco")) return;
  console.log("\n——— chamando o Gemini…\n");
  const t = Date.now();
  const { analise, modelo } = await analisar(caso, p, { nome: "Teste", agencia: "Agência Teste" });
  console.log(JSON.stringify(analise, null, 2));
  console.log(`\n${modelo} · ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
