/**
 * Dirige o site de verdade: responde tudo, confere a tela de "vai por e-mail",
 * que ninguém sem chave abre relatório, e que o admin vê tudo e baixa CSV.
 *
 *   npm run dev   (noutro terminal)
 *   ADMIN_CHAVE=... npm run testar
 *
 * Sem GOOGLE_API_KEY a análise falha e o e-mail não sai — o admin vê
 * "não enviado", que é justamente o caminho de falha que precisa aparecer.
 */
import { chromium } from "playwright-core";

const BASE = process.env.ROADMAP_URL ?? "http://localhost:3000";
const CHAVE = process.env.ADMIN_CHAVE;
const exe = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.EMAIL_TESTE ?? `teste+${Date.now()}@exemplo.com`;

const browser = await chromium.launch({ executablePath: exe });
const ok = (m) => console.log("✓", m);
const falha = (m) => { console.error("✗", m); process.exitCode = 1; };

try {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto(BASE);
  await p.click("text=Começar o diagnóstico");
  await p.waitForURL("**/teste");

  await p.getByLabel("Seu nome").fill("Ana Teste");
  await p.getByLabel("Nome da agência").fill("Viagens Teste");
  await p.getByLabel("Seu e-mail").fill(EMAIL);
  await p.click("text=Continuar");

  // Em cada bloco: segunda opção de cada pergunta única, horas variadas, textos longos.
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
    const avancar = p.locator("button", { hasText: passo === 5 ? "Receber meu roadmap" : "Continuar" });
    if (await avancar.isDisabled()) throw new Error(`passo ${passo + 1}: botão travado`);
    await avancar.click();
  }
  await p.waitForSelector("text=Seu roadmap vai chegar por e-mail");
  await p.screenshot({ path: "/tmp/roadmap-enviado.png" });
  ok("respondeu e viu a tela de e-mail");

  if (CHAVE) {
    const adm = await (await browser.newContext()).newPage();
    await adm.goto(`${BASE}/admin`);
    await adm.fill('input[name="chave"]', CHAVE);
    await adm.click("text=Entrar");
    await adm.waitForSelector("text=Baixar CSV");
    await adm.screenshot({ path: "/tmp/roadmap-admin.png", fullPage: true });
    ok("admin entrou");

    const csv = await (await adm.request.get(`${BASE}/admin/csv`)).text();
    if (csv.includes(EMAIL)) ok("CSV traz o diagnóstico");
    else falha("CSV sem o diagnóstico");

    const link = await adm.locator("tr", { hasText: EMAIL }).locator("a", { hasText: "abrir" }).getAttribute("href");
    const r = await adm.goto(`${BASE}${link}`);
    if (r.status() === 200) ok("admin abre o relatório");
    else falha("admin não abriu");

    const intruso = await (await browser.newContext()).newPage();
    const r2 = await intruso.goto(`${BASE}${link}`);
    if (r2.status() === 404) ok("sem chave → 404 no relatório");
    else falha(`sem chave viu o relatório (${r2.status()})`);
    console.log(`id: ${link.split("/").pop()}`);
  }
} catch (e) {
  falha(e.message);
} finally {
  await browser.close();
}
