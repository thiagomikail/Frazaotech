/**
 * Dirige o site de verdade: entra com e-mail, responde tudo, gera o
 * relatório, confere que outro e-mail NÃO vê, e que o admin vê e baixa CSV.
 *
 *   npm run dev   (noutro terminal)
 *   ADMIN_CHAVE=... node scripts/testar-fluxo.mjs
 *
 * Sem GOOGLE_API_KEY o relatório sai só com a parte determinística — que é
 * exatamente o caminho de falha que também precisa funcionar.
 */
import { chromium } from "playwright-core";

const BASE = process.env.ROADMAP_URL ?? "http://localhost:3000";
const CHAVE = process.env.ADMIN_CHAVE;
const exe = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const browser = await chromium.launch({ executablePath: exe });
const ok = (m) => console.log("✓", m);
const falha = (m) => { console.error("✗", m); process.exitCode = 1; };

try {
  const aluno = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await aluno.newPage();
  await p.goto(BASE);
  await p.fill('input[name="email"]', `teste+${Date.now()}@exemplo.com`);
  await p.click("text=Começar o diagnóstico");
  await p.waitForURL("**/teste");
  ok("entrou com e-mail");

  await p.getByLabel("Seu nome").fill("Ana Teste");
  await p.getByLabel("Nome da agência").fill("Viagens Teste");
  await p.click("text=Continuar");

  // Em cada bloco: primeira opção de cada pergunta única, horas variadas, textos longos.
  for (let passo = 0; passo < 6; passo++) {
    for (const fs of await p.locator("fieldset").all()) {
      const grades = fs.locator("div.grid-cols-5");
      if (await grades.count()) {
        const n = await grades.count();
        for (let i = 0; i < n; i++) await grades.nth(i).locator("button").nth((i % 4) + 1).click();
        continue;
      }
      const texto = fs.locator("textarea");
      if (await texto.count()) {
        await texto.fill("Cliente manda áudio no WhatsApp pedindo Europa em julho; eu escuto, anoto, pesquiso voo e hotel em três sites e monto a proposta no Canva.");
        continue;
      }
      const botoes = fs.locator("button");
      if (await botoes.count()) await botoes.nth(1).click();
    }
    await p.screenshot({ path: `/tmp/roadmap-passo-${passo}.png`, fullPage: true }).catch(() => {});
    const avancar = p.locator("button", { hasText: passo === 5 ? "Gerar meu roadmap" : "Continuar" });
    if (await avancar.isDisabled()) throw new Error(`passo ${passo + 1}: botão travado`);
    await avancar.click();
  }
  ok("respondeu os 6 blocos");

  await p.waitForURL("**/relatorio/**", { timeout: 300_000 });
  const url = p.url();
  await p.waitForSelector("text=Os números por trás");
  await p.screenshot({ path: "/tmp/roadmap-relatorio.png", fullPage: true });
  ok(`relatório em ${url}`);

  const intruso = await (await browser.newContext()).newPage();
  const r = await intruso.goto(url);
  if (r.status() === 404) ok("sem e-mail → 404");
  else falha(`sem e-mail viu o relatório (${r.status()})`);

  if (CHAVE) {
    const adm = await (await browser.newContext()).newPage();
    await adm.goto(`${BASE}/admin`);
    await adm.fill('input[name="chave"]', CHAVE);
    await adm.click("text=Entrar");
    await adm.waitForSelector("text=Baixar CSV");
    await adm.screenshot({ path: "/tmp/roadmap-admin.png", fullPage: true });
    ok("admin entrou");
    const csv = await adm.request.get(`${BASE}/admin/csv`);
    const corpo = await csv.text();
    if (corpo.includes("Viagens Teste")) ok("CSV traz o diagnóstico");
    else falha("CSV sem o diagnóstico");
    const r2 = await adm.goto(url);
    if (r2.status() === 200) ok("admin abre relatório alheio");
    else falha("admin não abriu");
  }
} catch (e) {
  falha(e.message);
} finally {
  await browser.close();
}
