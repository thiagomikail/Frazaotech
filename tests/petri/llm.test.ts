/**
 * The Gemini client against a fake fetch: model fallback, retries, schema
 * fallback, auth errors — and the answer normalizer against the kind of JSON
 * LLMs actually send back.
 */
import assert from 'node:assert/strict';
import {
  generateJson,
  keyFingerprint,
  LlmError,
  looksLikeGoogleKey,
  MODEL_CHAIN,
  ownKey,
  reasons,
} from '../../src/petri/llm/gemini';
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

// 5b. A 403 on one model is not the end: the key may just not reach that model.
r = await run([{ status: 403, body: { error: { message: 'Permission denied on this model' } } }, ok({ reply: 'e' })]);
assert.equal(r.model, MODEL_CHAIN[1]);

// 5c. Refused by every model (or refused and not found) is the key: say so, with Google's words.
const leaked = 'Your API key was reported as leaked. Please use another API key.';
await assert.rejects(
  run([
    { status: 403, body: { error: { message: leaked } } },
    { status: 404, body: { error: { message: 'models/x is not found' } } },
    ...MODEL_CHAIN.slice(2).map(() => ({ status: 403, body: { error: { message: leaked } } })),
  ]),
  (e: unknown) => e instanceof LlmError && e.kind === 'auth' && reasons(e.message)[0] === `403 ${leaked}`,
);
assert.equal(calls.length, MODEL_CHAIN.length, 'one call per model, no retries on 403/404');

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

// Answer normalization: sloppy ids, C-style guards, a tag typed with an accent and a space
// (the chat takes any language), undeclared signals, a bad arc.
const answer = readAnswer({
  reply: 'Modeled the press.',
  assumptions: ['The cylinder has a limit switch at each end.', ''],
  net: {
    name: 'Press',
    inputs: [{ name: 'Botão Bimanual', description: 'two-hand control', kind: 'button' }],
    outputs: [{ name: 'press_down', description: '' }],
    places: [
      { id: 'p_idle', name: 'Idle', tokens: 1, actions: [] },
      { id: 'P2', name: 'Going down', tokens: 0, actions: ['press_down', 'Lamp ON'] },
    ],
    transitions: [
      { id: 't1', name: 'Start', guard: 'Botao_Bimanual && !estop', delayMs: 0, priority: 1 },
      { id: 'T7', name: 'Return', guard: 'limit_down', delayMs: '500', priority: 2 },
    ],
    arcs: [
      { from: 'p_idle', to: 't1', weight: 1 },
      { from: 't1', to: 'P2' },
      { from: 'P2', to: 'T7' },
      { from: 'T7', to: 'Idle' },
      { from: 'p_idle', to: 'P2' },
    ],
  },
});
assert.equal(answer.reply, 'Modeled the press.');
assert.deepEqual(answer.assumptions, ['The cylinder has a limit switch at each end.']);
const net = answer.net!;
assert.deepEqual(
  net.places.map((p) => p.id),
  ['P3', 'P2'],
);
assert.deepEqual(
  net.transitions.map((t) => t.id),
  ['T1', 'T7'],
);
assert.equal(net.transitions[0].guard, 'Botao_Bimanual AND NOT estop');
assert.equal(net.transitions[1].delayMs, 500);
assert.deepEqual(
  net.inputs.map((i) => i.name),
  ['Botao_Bimanual', 'estop', 'limit_down'],
);
assert.deepEqual(
  net.outputs.map((o) => o.name),
  ['press_down', 'Lamp_ON'],
);
assert.deepEqual(answer.report, {
  createdInputs: ['estop', 'limit_down'],
  createdOutputs: ['Lamp_ON'],
  droppedArcs: 1,
});
assert.deepEqual(
  net.arcs.map((a) => `${a.from}>${a.to}`),
  ['P3>T1', 'T1>P2', 'P2>T7', 'T7>P3'],
);
assert.ok(!compile(net).issues.some((i) => i.level === 'error'));

// A question-only answer leaves the net alone.
assert.equal(readAnswer({ reply: 'A safe net holds at most one token per place.' }).net, null);

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
);
assert.deepEqual(
  turns.map((t) => t.role),
  ['user'],
);
assert.match(turns[0].text, /first try[\s\S]*second try[\s\S]*make it faster/);

// Keys pasted with quotes or a line break still work; the fingerprint never shows the middle.
store.set('petriplc:apiKey', ' "AIzaSyD-example_key_0123456789abcdefghi"\n');
assert.equal(ownKey(), 'AIzaSyD-example_key_0123456789abcdefghi');
assert.equal(looksLikeGoogleKey(ownKey()), true);
assert.equal(looksLikeGoogleKey('your_google_api_key_here'), false);
assert.equal(keyFingerprint(ownKey()), 'AIza…fghi (39)');

console.log('llm: ok');
