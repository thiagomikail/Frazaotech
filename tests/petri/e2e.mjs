/**
 * PetriPLC driven in a real Chrome, against the production build.
 *
 *   npm run test:petri:e2e
 *
 * CHROME_PATH points at another Chrome (container, CI); without it, the Mac one.
 * Gemini is never called: its endpoint is intercepted and answered here.
 */
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4179;
const ROOT = `http://localhost:${PORT}/`;
const BASE = `${ROOT}petri/`;
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('vite preview did not start');
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(`ok   ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}\n     ${String(e.message ?? e).split('\n')[0]}`);
    process.exitCode = 1;
  }
}

await waitForServer();
const browser = await chromium.launch({ executablePath: CHROME });
const errors = [];

async function freshPage(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', acceptDownloads: true, ...options });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  return page;
}

const nodes = (page) => page.$$eval('[data-node]', (els) => els.map((e) => e.getAttribute('data-node')).sort());
const on = (page, output) => page.getAttribute(`[data-testid="output-${output}"]`, 'data-on');

await check('example loads and the click fires the transition', async () => {
  const page = await freshPage();
  await page.click('[data-testid="example-drill"]');
  await page.waitForSelector('[data-node="T4"]');
  assert.equal(await page.getAttribute('[data-node="T1"]', 'data-status'), 'blocked');
  await page.click('[data-node="T1"] > rect >> nth=0', { force: true }); // the hit area, not the label
  assert.equal(await on(page, 'feed_down'), 'true');
  assert.equal(await on(page, 'spindle'), 'true');
  await page.context().close();
});

await check('running scans: sensor, timer, outputs', async () => {
  const page = await freshPage();
  await page.click('[data-testid="example-drill"]');
  await page.click('[data-node="T1"] > rect >> nth=0', { force: true });
  await page.click('[data-testid="input-limit_up"]'); // the drill has left the top
  await page.click('[data-testid="input-limit_down"]');
  await page.click('[data-testid="sim-run"]');
  await page.waitForSelector('[data-node="T3"][data-status="timing"]', { timeout: 3000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="output-retract"]')?.getAttribute('data-on') === 'true', null, { timeout: 4000 });
  await page.click('[data-testid="sim-run"]');
  await page.context().close();
});

await check('analysis and code generation in four dialects', async () => {
  const page = await freshPage();
  await page.click('[data-testid="example-buffer"]');
  await page.click('[data-testid="tab-check"]');
  await page.waitForSelector('[data-testid="analysis-clean"]');
  await page.click('[data-testid="tab-code"]');
  for (const d of ['siemens', 'rockwell', 'plcopen']) await page.check(`[data-testid="dialect-${d}"]`);
  await page.click('[data-testid="code-generate"]');
  for (const [tab, needle] of [
    ['iec', 'FUNCTION_BLOCK FB_Buffered_conveyor'],
    ['siemens', 'FUNCTION_BLOCK "FB_Buffered_conveyor"'],
    ['rockwell', 'IF S:FS OR Reset THEN'],
    ['plcopen', 'tc6_0201'],
  ]) {
    await page.click(`[data-testid="code-tab-${tab}"]`);
    assert.ok((await page.textContent('[data-testid="code-view"]')).includes(needle), `${tab} lacks ${needle}`);
  }
  await page.context().close();
});

await check('chat: Gemini answer becomes the net, failures offer a retry', async () => {
  const page = await freshPage();
  await page.evaluate(() => localStorage.setItem('petriplc:apiKey', 'test-key'));
  await page.reload();
  const net = {
    name: 'Press',
    inputs: [{ name: 'two_hand', description: '', kind: 'button' }],
    outputs: [{ name: 'press_down', description: '' }],
    places: [
      { id: 'P1', name: 'Up', tokens: 1, actions: [] },
      { id: 'P2', name: 'Going down', tokens: 0, actions: ['press_down'] },
    ],
    transitions: [
      { id: 'T1', name: 'Start', guard: 'two_hand', delayMs: 0, priority: 1 },
      { id: 'T2', name: 'Return', guard: 'limit_down', delayMs: 0, priority: 2 },
    ],
    arcs: [{ from: 'P1', to: 'T1' }, { from: 'T1', to: 'P2' }, { from: 'P2', to: 'T2' }, { from: 'T2', to: 'P1' }],
  };
  let fail = false;
  const seen = [];
  await page.route('https://generativelanguage.googleapis.com/**', (route) => {
    seen.push(JSON.parse(route.request().postData()));
    if (fail) return route.fulfill({ status: 503, body: '{"error":{"message":"busy"}}' });
    const text = JSON.stringify({ reply: 'Done.', net });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) });
  });
  await page.fill('[data-testid="chat-input"]', 'Press with two-hand control');
  await page.press('[data-testid="chat-input"]', 'Enter');
  await page.waitForSelector('[data-node="T2"]');
  assert.deepEqual(await nodes(page), ['P1', 'P2', 'T1', 'T2']);
  assert.ok(await page.isVisible('[data-testid="input-limit_down"]'), 'missing input was created');
  fail = true;
  await page.fill('[data-testid="chat-input"]', 'faster');
  await page.press('[data-testid="chat-input"]', 'Enter');
  await page.waitForSelector('text=Try again', { timeout: 20000 });
  assert.equal(await page.textContent('[data-testid="error-detail"]'), '503 busy', "Google's reason is shown");
  assert.ok(seen.at(-1).contents.at(-1).parts[0].text.includes('CURRENT NET'), 'second request carries the net');
  await page.click('text=Undo this change');
  assert.deepEqual(await nodes(page), []);
  await page.context().close();
});

await check('edit: add, connect, rename, undo, persist', async () => {
  const page = await freshPage();
  await page.click('[data-testid="example-drill"]');
  await page.click('[data-testid="mode-edit"]');
  const box = await page.locator('[data-testid="net-canvas"]').boundingBox();
  await page.click('[data-testid="tool-place"]');
  await page.mouse.click(box.x + box.width - 140, box.y + 200);
  await page.click('[data-testid="tool-transition"]');
  await page.mouse.click(box.x + box.width - 140, box.y + 320);
  await page.click('[data-testid="tool-arc"]');
  await page.click('[data-node="P5"] > circle >> nth=0', { force: true });
  await page.click('[data-node="T5"]', { force: true });
  assert.equal(await page.$$eval('[data-arc]', (els) => els.length), 9);
  await page.click('[data-testid="tab-edit"]');
  const name = await page.locator('[data-testid="inspector"] input[value="start"]').first().elementHandle();
  await name.fill('start_btn');
  await name.press('Enter');
  assert.ok((await page.textContent('[data-node="T1"]')).includes('start_btn AND part_present'));
  await page.click('[data-testid="undo"]');
  assert.ok((await page.textContent('[data-node="T1"]')).includes('start AND part_present'));
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForSelector('[data-node="P5"]');
  await page.context().close();
});

await check('files: save JSON, open it back, export SVG', async () => {
  const page = await freshPage();
  await page.click('[data-testid="example-mixer"]');
  await page.click('text=File');
  const [json] = await Promise.all([page.waitForEvent('download'), page.click('text=Save .json')]);
  const path = await json.path();
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).places.length, 7);
  await page.click('text=File');
  await page.click('text=New net');
  assert.deepEqual(await nodes(page), []);
  await page.click('text=File');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('text=Open .json')]);
  await chooser.setFiles(path);
  await page.waitForSelector('[data-node="T6"]');
  await page.click('text=File');
  const [svg] = await Promise.all([page.waitForEvent('download'), page.click('text=Export diagram (SVG)')]);
  assert.ok(readFileSync(await svg.path(), 'utf8').startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  await page.context().close();
});

await check('home page opens both apps', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(ROOT);
  await page.click('[data-testid="home-petri"]');
  await page.waitForSelector('[data-testid="net-canvas"]');
  await page.goto(ROOT);
  await page.click('[data-testid="home-fmea"]');
  await page.waitForSelector('text=Critical Risks Dashboard');
  await ctx.close();
});

await check('the canvas follows the device appearance', async () => {
  const canvasBg = (page) => page.$eval('[data-testid="net-canvas"]', (el) => getComputedStyle(el.parentElement).backgroundColor);
  const light = await freshPage({ colorScheme: 'light' });
  assert.equal(await canvasBg(light), 'rgb(255, 255, 255)');
  await light.context().close();
  const dark = await freshPage({ colorScheme: 'dark' });
  assert.equal(await canvasBg(dark), 'rgb(28, 28, 30)');
  await dark.context().close();
});

await check('phone: tabs, no horizontal scroll', async () => {
  const page = await freshPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.tap('[data-testid="example-robots"]');
  await page.waitForSelector('[data-node="T4"]'); // jumped to the Net tab by itself
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await page.tap('[data-testid="tab-check"]');
  await page.waitForSelector('text=Token conflicts');
  await page.context().close();
});

await browser.close();
stop();
console.log(results.join('\n'));
if (errors.length) {
  console.log('page errors:', errors);
  process.exitCode = 1;
}
