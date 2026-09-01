/**
 * Captura as telas do manual do usuario.
 *
 * Diferente de `scripts/testar.mjs`, que so confere se a tela funciona, este
 * script encena: abre gavetas, preenche campos e espera a resposta do
 * consultor, para que o manual mostre o app em uso e nao vazio.
 *
 * Precisa do app no ar. Para as telas de IA, aponte o app para o espelho:
 *   node scripts/espelho-ia.mjs 4545 &
 *   OPENROUTER_URL=http://127.0.0.1:4545/chat/completions \
 *   OPENROUTER_API_KEY=espelho npm run start &
 *   node scripts/capturar-telas.mjs
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SAIDA = process.env.SAIDA ?? "manual/telas";
mkdirSync(SAIDA, { recursive: true });

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  // `<input type="date">` se formata pela lingua da INTERFACE do navegador,
  // nao pela da pagina. Sem isto o manual mostraria 09/01/2026 no lugar de
  // 01/09/2026 e ensinaria o leitor errado.
  args: ["--lang=pt-BR"],
});
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 820 },
  deviceScaleFactor: 2, // retina: texto legivel quando o manual amplia a imagem
  locale: "pt-BR",
});
const p = await contexto.newPage();

let n = 0;
async function tirar(nome, { inteira = false } = {}) {
  n++;
  await p.waitForTimeout(500);
  const arquivo = `${SAIDA}/${String(n).padStart(2, "0")}-${nome}.png`;
  await p.screenshot({ path: arquivo, fullPage: inteira });
  console.log(`  ${arquivo}`);
}

try {
  console.log("capturando...");

  // ---------------------------------------------------------------- publico
  await p.goto(BASE, { waitUntil: "networkidle" });
  await tirar("landing", { inteira: true });

  await p.goto(`${BASE}/criar-conta`, { waitUntil: "networkidle" });
  await p.fill("#nome", "Thiago Frazão");
  await p.fill("#empresa", "Panificadora São Jorge");
  await p.fill("#segmento", "padaria");
  await p.fill("#email", "voce@suaempresa.com.br");
  await tirar("criar-conta");

  await p.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
  await p.fill("#email", "demo@giro.app.br");
  await p.fill("#senha", "giro12345");
  await tirar("entrar");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL("**/painel", { timeout: 20000 });

  // ---------------------------------------------------------------- painel
  await p.waitForTimeout(800);
  await tirar("painel", { inteira: true });

  // -------------------------------------------------------------- clientes
  await p.goto(`${BASE}/clientes`, { waitUntil: "networkidle" });
  await tirar("clientes");
  await p.getByRole("button", { name: /Novo cliente/ }).click();
  await p.fill("#nome", "Restaurante Dona Ilza");
  await p.fill("#whatsapp", "(11) 98877-1234");
  await p.fill("#origem", "indicação");
  await p.fill("#observacao", "Pede pão de forma toda terça. Fecha às 15h.");
  await tirar("cliente-formulario");
  await p.keyboard.press("Escape");

  // -------------------------------------------------------------- negocios
  await p.goto(`${BASE}/negocios`, { waitUntil: "networkidle" });
  await tirar("negocios", { inteira: true });
  await p.getByRole("button", { name: /Novo negócio/ }).click();
  await p.fill("#titulo", "Coffee break mensal - contrato anual");
  await p.fill("#valor", "9.600,00");
  await p.selectOption("#etapa", "PERDIDO");
  await p.waitForTimeout(300);
  await p.fill("#motivoPerda", "preço");
  await tirar("negocio-formulario");
  await p.keyboard.press("Escape");

  // ----------------------------------------------------------------- caixa
  await p.goto(`${BASE}/caixa`, { waitUntil: "networkidle" });
  await tirar("caixa");
  await p.getByRole("button", { name: /Lançar/ }).click();
  await p.fill("#valor", "480,00");
  await p.fill("#descricao", "farinha e fermento da semana");
  await p.getByRole("button", { name: "Saiu" }).click();
  await p.waitForTimeout(300);
  await tirar("caixa-formulario");
  await p.keyboard.press("Escape");

  // --------------------------------------------------------------- tarefas
  await p.goto(`${BASE}/tarefas`, { waitUntil: "networkidle" });
  await tirar("tarefas");

  // ------------------------------------------------------------- consultor
  await p.goto(`${BASE}/consultor`, { waitUntil: "networkidle" });
  await tirar("consultor-vazio");
  const campo = p.getByRole("textbox", { name: "Sua pergunta" });
  if (await campo.isVisible()) {
    await campo.fill("Por que sobrou menos este mês?");
    await p.getByRole("button", { name: "Enviar" }).click();
    await p.waitForSelector("text=/Entraram R\\$/", { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(1500);
  }
  await tirar("consultor");

  // ----------------------------------------------------------- diagnostico
  await p.goto(`${BASE}/diagnostico`, { waitUntil: "networkidle" });
  const botao = p.getByRole("button", { name: /Rodar diagn/ }).first();
  if (await botao.isVisible().catch(() => false)) {
    await botao.click();
    await p.waitForSelector("text=/Próximos passos desta semana/", { timeout: 90000 }).catch(() => {});
    await p.waitForTimeout(1500);
  }
  await tirar("diagnostico", { inteira: true });

  // ------------------------------------------------------------------ conta
  await p.goto(`${BASE}/conta`, { waitUntil: "networkidle" });
  await tirar("conta", { inteira: true });

  // --------------------------------------------------------------- celular
  const cel = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    locale: "pt-BR",
    isMobile: true,
    hasTouch: true,
  });
  const pc = await cel.newPage();
  await pc.context().addCookies(await contexto.cookies());
  await pc.goto(`${BASE}/painel`, { waitUntil: "networkidle" });
  await pc.waitForTimeout(800);
  n++;
  await pc.screenshot({ path: `${SAIDA}/${String(n).padStart(2, "0")}-celular-painel.png` });
  console.log(`  ${SAIDA}/${String(n).padStart(2, "0")}-celular-painel.png`);

  await pc.goto(`${BASE}/caixa`, { waitUntil: "networkidle" });
  await pc.getByRole("button", { name: /Lançar/ }).click();
  await pc.waitForTimeout(600);
  n++;
  await pc.screenshot({ path: `${SAIDA}/${String(n).padStart(2, "0")}-celular-lancar.png` });
  console.log(`  ${SAIDA}/${String(n).padStart(2, "0")}-celular-lancar.png`);
  await cel.close();

  console.log(`\n${n} telas em ${SAIDA}`);
} finally {
  await navegador.close();
}
