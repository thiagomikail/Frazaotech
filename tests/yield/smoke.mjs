/**
 * Yield driven in a real Chrome, against the production build, tab by tab.
 *
 *   npm run test:yield:e2e
 *
 * Exists because the two bugs that used to take this app down — the plant
 * Sankey and the modals without positioning — passed `vite build` clean: the
 * build compiled, the app broke on click. Only a real browser catches that.
 *
 * CHROME_PATH points at another Chrome (container, CI); without it, the Mac one.
 * SMOKE_OUT=<dir> also saves a screenshot per viewport.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4181;
const URL = `http://localhost:${PORT}/yield/`;
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.env.SMOKE_OUT;
if (OUT) mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(URL)).ok) break;
  } catch {
    // not up yet
  }
  await new Promise((r) => setTimeout(r, 200));
}

const browser = await chromium.launch({ executablePath: CHROME });
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures++;
};

const VIEWPORTS = [
  { width: 1600, height: 950, scheme: 'light' },
  { width: 1366, height: 768, scheme: 'dark' },
];

for (const vp of VIEWPORTS) {
  const tag = `${vp.width}x${vp.height} ${vp.scheme}`;
  console.log(`\n${tag}`);
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: vp.scheme });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${m.text()}`));
  await p.goto(URL);
  await p.waitForTimeout(1200);

  const crashed = async () => (await p.innerText('body')).includes('Something went wrong');
  const tid = (id) => `[data-testid="${id}"]`;
  const score = () => p.$eval(tid('score-number'), (e) => e.textContent.trim());
  const count = (sel) => p.$$eval(sel, (els) => els.length);

  check('loads without crashing', !(await crashed()));

  for (const tab of ['combustion', 'optimization', 'reports', 'monitor']) {
    await p.click(tid(`yield-tab-${tab}`));
    await p.waitForTimeout(900);
    check(`${tab} tab`, !(await crashed()));
  }

  // Modals
  await p.click(tid('open-sankey'));
  await p.waitForTimeout(1000);
  check('plant Sankey opens', (await count(tid('modal'))) === 1 && !(await crashed()));
  await p.click(tid('modal-close'));
  await p.waitForTimeout(400);
  check('plant Sankey closes', (await count(tid('modal'))) === 0);

  await p.click(tid('open-backlog'));
  await p.waitForTimeout(800);
  check('backlog opens', (await count(tid('modal'))) === 1);
  await p.click(tid('modal-close'));
  await p.waitForTimeout(400);
  check('backlog closes', (await count(tid('modal'))) === 0);

  // Combustion: pick a system, then the simulator moves the score
  await p.click(tid('yield-tab-combustion'));
  await p.waitForTimeout(800);
  await p.click(`${tid('combustion-system')}:has-text("RB-02 Sidewell B")`);
  await p.waitForTimeout(700);
  const s2 = await score();
  check('RB-02 selected', s2 === '62', `score ${s2}`);
  await p.click(tid('simulate-toggle'));
  await p.waitForTimeout(600);
  check('simulator opens', (await count(tid('sim-slider'))) > 0);
  await p.focus(`${tid('sim-slider')} >> nth=0`);
  for (let i = 0; i < 20; i++) await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(700);
  const s2b = await score();
  check('score follows the slider', s2b !== s2, `${s2} → ${s2b}`);
  check('simulated banner shows', (await count(tid('sim-banner'))) === 1);
  await p.click(tid('reset-to-field'));
  await p.waitForTimeout(600);
  check('reset returns to the field reading', (await score()) === s2);

  // FMEA: Occurrence must follow the readings — a degraded system has more live failure modes
  await p.click(tid('combustion-view-fmea'));
  await p.waitForTimeout(700);
  const modes = await count(tid('fmea-card'));
  check('FMEA lists the failure modes', modes >= 10, `${modes} modes`);
  await p.click(`${tid('fmea-card-head')} >> nth=0`);
  await p.waitForTimeout(400);
  check('a failure mode expands with S/O/D', (await count(tid('sod-cell'))) >= 4);
  const active = () => count(`${tid('fmea-card')}[data-active="true"]`);
  await p.click(`${tid('combustion-system')}:has-text("RB-01 Sidewell A")`);
  await p.waitForTimeout(600);
  const active1 = await active();
  await p.click(`${tid('combustion-system')}:has-text("RB-03 Sidewell C")`);
  await p.waitForTimeout(600);
  const active3 = await active();
  check('FMEA follows the readings', active3 > active1, `RB-01 ${active1} live, RB-03 ${active3} live`);

  await p.click(tid('full-matrix'));
  await p.waitForTimeout(800);
  const rows = await count(`${tid('fmea-matrix')} tbody tr`);
  check('full matrix opens', rows >= 10, `${rows} rows`);
  await p.click(tid('matrix-filter-action'));
  await p.waitForTimeout(500);
  const filtered = await count(`${tid('fmea-matrix')} tbody tr`);
  check('matrix filter works', filtered > 0 && filtered <= rows, `${filtered} of ${rows}`);
  await p.click(tid('modal-close'));
  await p.waitForTimeout(400);
  check('matrix closes', (await count(tid('fmea-matrix'))) === 0);

  // A toast, not a native alert()
  await p.click(tid('yield-tab-monitor'));
  await p.waitForTimeout(600);
  let sawDialog = false;
  const onDialog = async (d) => {
    sawDialog = true;
    await d.dismiss();
  };
  p.on('dialog', onDialog);
  await p.click(tid('trace-best'));
  await p.waitForTimeout(2400);
  check('toast shows', (await count(tid('toast'))) === 1);
  check('no native alert()', !sawDialog);
  p.off('dialog', onDialog);

  check('no horizontal scroll', !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  check('no console or runtime errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  if (OUT) await p.screenshot({ path: `${OUT}/yield-${vp.width}x${vp.height}-${vp.scheme}.png` });
  await ctx.close();
}

await browser.close();
server.kill();
console.log(failures ? `\n${failures} failure(s)` : '\nall passed');
process.exitCode = failures ? 1 : 0;
