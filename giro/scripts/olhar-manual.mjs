/**
 * Renderiza manual/manual.html e tira capturas para conferencia visual —
 * incluindo o tema escuro, que ninguem lembra de olhar.
 *
 *   node scripts/olhar-manual.mjs
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SAIDA = process.env.SAIDA ?? "/tmp/manual-conferencia";
mkdirSync(SAIDA, { recursive: true });

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--lang=pt-BR"],
});

const url = "file://" + resolve("manual/manual.html");

for (const tema of ["light", "dark"]) {
  const ctx = await navegador.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: tema,
    locale: "pt-BR",
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(String(e)));
  await p.goto(url, { waitUntil: "load" });
  await p.waitForTimeout(1500);

  await p.screenshot({ path: `${SAIDA}/${tema}-topo.png` });
  await p.locator("#painel").scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${SAIDA}/${tema}-painel.png` });
  await p.locator("#diagnostico").scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${SAIDA}/${tema}-diagnostico.png` });

  const rolagem = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  console.log(`${tema}: rolagem horizontal ok=${rolagem}, erros=${erros.length}`);
  await ctx.close();
}

// celular
const cel = await navegador.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
const pc = await cel.newPage();
await pc.goto(url, { waitUntil: "load" });
await pc.waitForTimeout(1200);
await pc.screenshot({ path: `${SAIDA}/celular-topo.png` });
const rolagemCel = await pc.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
console.log(`celular: rolagem horizontal ok=${rolagemCel}`);
await navegador.close();
console.log(`capturas em ${SAIDA}`);
