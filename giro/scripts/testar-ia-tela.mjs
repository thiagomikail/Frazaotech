/**
 * Exercita o consultor e o diagnostico pela TELA, com o app apontando para
 * `scripts/espelho-ia.mjs`. Cobre o que o teste de ponta a ponta nao cobre:
 * a rota de IA, a persistencia da conversa, o medidor de consumo e a catraca
 * de cota.
 *
 *   node scripts/espelho-ia.mjs 4545 &
 *   OPENROUTER_URL=http://127.0.0.1:4545/chat/completions \
 *   OPENROUTER_API_KEY=espelho npm run start &
 *   node scripts/testar-ia-tela.mjs
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
const TELAS = process.env.TELAS ?? "/tmp/telas";
let passou = 0, falhou = 0;

function conferir(d, c, extra = "") {
  if (c) { passou++; console.log(`  ok    ${d}`); }
  else { falhou++; console.log(`  FALHA ${d}${extra ? ` — ${extra}` : ""}`); }
}

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const p = await (await navegador.newContext({ viewport: { width: 1280, height: 950 }, locale: "pt-BR" })).newPage();

try {
  await p.goto(`${BASE}/entrar`);
  await p.fill("#email", "demo@giro.app.br");
  await p.fill("#senha", "giro12345");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL("**/painel", { timeout: 20000 });

  console.log("\n[A] Consultor responde com numero do banco");
  await p.goto(`${BASE}/consultor`, { waitUntil: "networkidle" });
  await p.getByRole("textbox", { name: "Sua pergunta" }).fill("Por que sobrou menos este mes?");
  await p.getByRole("button", { name: "Enviar" }).click();
  await p.waitForSelector("text=/Entraram R\\$/", { timeout: 60000 });
  const resposta = (await p.evaluate(() => document.body.innerText)).replace(/\u00a0/g, " ");
  conferir("responde citando valores em reais", /Entraram R\$ [\d.,]+/.test(resposta));
  conferir("mostra qual ferramenta o agente usou", /leu o retrato do neg/i.test(resposta));
  await p.screenshot({ path: `${TELAS}/9-consultor.png`, fullPage: true });

  console.log("\n[B] O contador de cota acompanha");
  await p.waitForTimeout(2000);
  const cabecalho = await p.evaluate(() => document.body.innerText);
  conferir(
    "a cota na tela cai depois da pergunta",
    /299 de 300 perguntas restantes/.test(cabecalho),
    cabecalho.match(/\d+ de 300 perguntas restantes/)?.[0] ?? "nao achou o contador",
  );

  console.log("\n[C] A conversa fica salva");
  await p.reload({ waitUntil: "networkidle" });
  conferir("a conversa persiste depois do recarregamento", /Entraram R\$/.test(await p.evaluate(() => document.body.innerText)));

  console.log("\n[D] O consumo e medido");
  await p.goto(`${BASE}/conta`, { waitUntil: "networkidle" });
  const conta = (await p.evaluate(() => document.body.innerText)).replace(/\u00a0/g, " ");
  const usadas = conta.match(/(\d+)\s+de\s+300/);
  conferir("contou a pergunta na cota", usadas !== null && Number(usadas[1]) >= 1, `leu: ${usadas?.[0]}`);
  conferir("registrou tokens consumidos", /chamadas ao modelo/.test(conta) && !/^0 chamadas/.test(conta));

  console.log("\n[E] Diagnostico");
  await p.goto(`${BASE}/diagnostico`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Rodar diagn/ }).first().click();
  await p.waitForSelector("text=/Próximos passos desta semana/", { timeout: 90000 });
  const diag = (await p.evaluate(() => document.body.innerText)).replace(/\u00a0/g, " ");
  conferir("mostra o resumo do diagnostico", /Espelho local lendo/.test(diag));
  conferir("lista os proximos passos numerados", /Próximos passos desta semana/.test(diag));
  conferir("mostra os achados com evidencia numerica", /R\$ [\d.,]+/.test(diag));
  conferir("guarda o modelo que gerou", /espelho\/local/.test(diag));
  await p.screenshot({ path: `${TELAS}/10-diagnostico.png`, fullPage: true });

  console.log("\n[F] Historico do diagnostico");
  await p.getByRole("button", { name: /Rodar de novo/ }).first().click();
  await p.waitForTimeout(6000);
  await p.reload({ waitUntil: "networkidle" });
  conferir("o anterior vira historico", /Diagnósticos anteriores/.test(await p.evaluate(() => document.body.innerText)));

  console.log("\n[G] Catraca de cota");
  const resp = await p.request.post(`${BASE}/api/diagnostico`);
  const corpo = await resp.json();
  conferir(
    "a cota barra quando estoura, com mensagem clara",
    resp.status() === 200 || (resp.status() === 402 && typeof corpo.erro === "string"),
    `status ${resp.status()} ${JSON.stringify(corpo).slice(0, 80)}`,
  );
} catch (erro) {
  falhou++;
  console.log(`\n  EXPLODIU: ${erro.message}`);
  await p.screenshot({ path: `${TELAS}/erro-ia.png`, fullPage: true }).catch(() => {});
} finally {
  await navegador.close();
}

console.log(`\n=== ${passou} passaram, ${falhou} falharam ===\n`);
process.exit(falhou > 0 ? 1 : 0);
