/**
 * The Gemini client against a fake fetch: model fallback, retries, schema
 * fallback, auth errors — and the answer normalizer against the kind of JSON
 * LLMs actually send back.
 */
import assert from 'node:assert/strict';
import { generateJson, LlmError, MODEL_CHAIN } from '../../src/petri/llm/gemini';
import { buildTurns, readAnswer } from '../../src/petri/llm/prompt';
import { compile } from '../../src/petri/model/net';

const store = new Map<string, string>([['petriplc:apiKey', 'test-key']]);
(globalThis as { window?: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  },
};

type Reply = { status: number; body: unknown };
let script: Reply[] = [];
const calls: { model: string; schema: boolean; key: string | null }[] = [];
globalThis.fetch = (async (url: string, init: RequestInit) => {
  const model = /models\/([^:]+):/.exec(url)![1];
  const body = JSON.parse(String(init.body));
  calls.push({
    model,
    schema: 'responseSchema' in body.generationConfig,
    key: new Headers(init.headers).get('x-goog-api-key'),
  });
  const next = script.shift() ?? { status: 503, body: { error: { message: 'overloaded' } } };
  return new Response(JSON.stringify(next.body), { status: next.status });
}) as typeof fetch;

const ok = (obj: unknown): Reply => ({
  status: 200,
  body: { candidates: [{ content: { parts: [{ text: '```json\n' + JSON.stringify(obj) + '\n```' }] } }] },
});
const req = { system: 's', turns: [{ role: 'user' as const, text: 'hi' }], schema: { type: 'object' } };
const run = async (replies: Reply[]) => {
  script = replies;
  calls.length = 0;
  return generateJson(req);
};

// 1. First model answers.
let r = await run([ok({ reply: 'a' })]);
assert.deepEqual(r, { data: { reply: 'a' }, model: MODEL_CHAIN[0] });
assert.equal(calls[0].key, 'test-key');

// 2. 404 on the first model → second model.
r = await run([{ status: 404, body: { error: { message: 'not found' } } }, ok({ reply: 'b' })]);
assert.equal(r.model, MODEL_CHAIN[1]);

// 3. 503 then success on the same model (one retry).
r = await run([{ status: 503, body: {} }, ok({ reply: 'c' })]);
assert.equal(r.model, MODEL_CHAIN[0]);
assert.equal(calls.length, 2);

// 4. Schema rejected → same model again, without the schema.
r = await run([
  { status: 400, body: { error: { message: 'Invalid value at generation_config.response_schema' } } },
  ok({ reply: 'd' }),
]);
assert.equal(r.model, MODEL_CHAIN[0]);
assert.deepEqual(
  calls.map((c) => c.schema),
  [true, false],
);

// 5. Bad key stops at once.
await assert.rejects(
  run([{ status: 400, body: { error: { message: 'API key not valid. Please pass a valid API key.' } } }]),
  (e: unknown) => e instanceof LlmError && e.kind === 'auth',
);
assert.equal(calls.length, 1);

// 6. Quota on every model.
await assert.rejects(
  run(MODEL_CHAIN.map(() => ({ status: 429, body: { error: { message: 'quota' } } }))),
  (e: unknown) => e instanceof LlmError && e.kind === 'quota',
);

// 7. Everything overloaded.
await assert.rejects(run([]), (e: unknown) => e instanceof LlmError && e.kind === 'overloaded');
assert.equal(calls.length, MODEL_CHAIN.length * 2);

// 8. No key.
store.delete('petriplc:apiKey');
await assert.rejects(run([ok({})]), (e: unknown) => e instanceof LlmError && e.kind === 'no-key');
store.set('petriplc:apiKey', 'test-key');

// Answer normalization: sloppy ids, C-style guards, undeclared signals, a bad arc.
const answer = readAnswer({
  reply: 'Modelei a prensa.',
  assumptions: ['O cilindro tem fim de curso nos dois lados.', ''],
  net: {
    name: 'Prensa',
    inputs: [{ name: 'Botão Bimanual', description: 'bimanual', kind: 'button' }],
    outputs: [{ name: 'desce', description: '' }],
    places: [
      { id: 'p_idle', name: 'Repouso', tokens: 1, actions: [] },
      { id: 'P2', name: 'Descendo', tokens: 0, actions: ['desce', 'Lamp ON'] },
    ],
    transitions: [
      { id: 't1', name: 'Partida', guard: 'Botao_Bimanual && !emergencia', delayMs: 0, priority: 1 },
      { id: 'T7', name: 'Volta', guard: 'fim_curso', delayMs: '500', priority: 2 },
    ],
    arcs: [
      { from: 'p_idle', to: 't1', weight: 1 },
      { from: 't1', to: 'P2' },
      { from: 'P2', to: 'T7' },
      { from: 'T7', to: 'Repouso' },
      { from: 'p_idle', to: 'P2' },
    ],
  },
});
assert.equal(answer.reply, 'Modelei a prensa.');
assert.deepEqual(answer.assumptions, ['O cilindro tem fim de curso nos dois lados.']);
const net = answer.net!;
assert.deepEqual(
  net.places.map((p) => p.id),
  ['P3', 'P2'],
);
assert.deepEqual(
  net.transitions.map((t) => t.id),
  ['T1', 'T7'],
);
assert.equal(net.transitions[0].guard, 'Botao_Bimanual AND NOT emergencia');
assert.equal(net.transitions[1].delayMs, 500);
assert.deepEqual(
  net.inputs.map((i) => i.name),
  ['Botao_Bimanual', 'emergencia', 'fim_curso'],
);
assert.deepEqual(
  net.outputs.map((o) => o.name),
  ['desce', 'Lamp_ON'],
);
assert.deepEqual(answer.report, {
  createdInputs: ['emergencia', 'fim_curso'],
  createdOutputs: ['Lamp_ON'],
  droppedArcs: 1,
});
assert.deepEqual(
  net.arcs.map((a) => `${a.from}>${a.to}`),
  ['P3>T1', 'T1>P2', 'P2>T7', 'T7>P3'],
);
assert.ok(!compile(net).issues.some((i) => i.level === 'error'));

// A question-only answer leaves the net alone.
assert.equal(readAnswer({ reply: 'Uma rede segura tem no máximo uma ficha por lugar.' }).net, null);

// Turns alternate and start with the user, even after a failed request.
const turns = buildTurns(
  [
    { role: 'assistant', text: 'welcome' },
    { role: 'user', text: 'first try' },
    { role: 'user', text: 'second try' },
  ],
  'make it faster',
  null,
  '',
  'pt',
);
assert.deepEqual(
  turns.map((t) => t.role),
  ['user'],
);
assert.match(turns[0].text, /first try[\s\S]*second try[\s\S]*make it faster/);

console.log('llm: ok');
