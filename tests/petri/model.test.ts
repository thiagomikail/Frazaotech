/**
 * The model on its own: guard expressions, the verdicts of the analysis on
 * every example, the simulator's scan semantics, and the layout's sanity.
 */
import assert from 'node:assert/strict';
import { analyze } from '../../src/petri/model/analyze';
import { examples } from '../../src/petri/model/examples';
import { evalExpr, parseExpr, printExpr, satisfy, simplify, varsOf } from '../../src/petri/model/expr';
import { layoutNet } from '../../src/petri/model/layout';
import { compile, normalizeNet } from '../../src/petri/model/net';
import { fireManual, initialSim, outputsOf, scan, statusOf } from '../../src/petri/model/simulate';
import type { PetriNet } from '../../src/petri/model/types';

// ─── Guards ──────────────────────────────────────────────────────────────────

const parsed = (src: string) => {
  const r = parseExpr(src);
  assert.ok(r.ok, `${src}: ${!r.ok && r.error.message}`);
  return r.expr;
};
assert.equal(printExpr(parsed('a && !b || c')), '(a AND NOT b) OR c');
assert.equal(printExpr(parsed('NOT (a OR b) AND c')), 'NOT (a OR b) AND c');
assert.equal(printExpr(parsed('a ^ b')), 'a XOR b');
assert.equal(printExpr(simplify(parsed('a AND TRUE AND (b OR FALSE)'))), 'a AND b');
assert.equal(printExpr(simplify(parsed('NOT NOT a'))), 'a');
assert.deepEqual([...varsOf(parsed('Start AND NOT eStop'))], ['start', 'estop']);
assert.equal(evalExpr(parsed('a AND NOT b'), (n) => n === 'a'), true);
assert.equal(evalExpr(parsed(''), () => false), true, 'empty guard is always true');
for (const bad of ['a AND', '(a OR b', 'a + b', 'a b', '10'])
  assert.equal(parseExpr(bad).ok, false, `"${bad}" should not parse`);
// The solver flips as few inputs as possible.
const sol = satisfy(parsed('a AND (b OR c)'), (n) => n === 'c');
assert.deepEqual(Object.fromEntries(sol!), { a: true, b: false, c: true });
assert.equal(satisfy(parsed('a AND NOT a'), () => false), null);

// ─── Analysis verdicts on the examples ──────────────────────────────────────

const expected: Record<string, { states: number; safe: boolean; conflicts: number }> = {
  drill: { states: 4, safe: true, conflicts: 0 },
  mixer: { states: 7, safe: true, conflicts: 0 },
  robots: { states: 3, safe: true, conflicts: 1 },
  buffer: { states: 24, safe: false, conflicts: 0 },
};
for (const lang of ['pt', 'en'] as const)
  for (const ex of examples(lang)) {
    const c = compile(ex.net);
    assert.deepEqual(c.issues, [], `${lang} ${ex.id} has issues`);
    const a = analyze(c);
    const want = expected[ex.id];
    assert.equal(a.states, want.states, `${ex.id} states`);
    assert.equal(a.bounded, true, `${ex.id} bounded`);
    assert.equal(a.safe, want.safe, `${ex.id} safe`);
    assert.equal(a.deadlockCount, 0, `${ex.id} deadlocks`);
    assert.equal(a.reversible, true, `${ex.id} reversible`);
    assert.deepEqual(a.deadTransitions, [], `${ex.id} dead transitions`);
    assert.equal(a.conflicts.length, want.conflicts, `${ex.id} conflicts`);
  }
assert.equal(analyze(compile(examples('en')[3].net)).bounds.P3, 3, 'buffer capacity bounds P3');
assert.deepEqual(analyze(compile(examples('en')[2].net)).conflicts[0], {
  place: 'P3',
  transitions: ['T1', 'T3'],
  exclusive: false,
  winner: 'T1',
});

const tiny = (arcs: [string, string][], tokens = [1, 0]): PetriNet =>
  normalizeNet({
    places: tokens.map((t, i) => ({ id: `P${i + 1}`, name: `p${i + 1}`, tokens: t, actions: [] })),
    transitions: [{ id: 'T1', name: 't', guard: '' }],
    arcs: arcs.map(([from, to]) => ({ from, to })),
  }).net;
const pump = analyze(compile(tiny([['P1', 'T1'], ['T1', 'P1'], ['T1', 'P2']])));
assert.equal(pump.bounded, false);
assert.equal(pump.bounds.P2, null);
const stuck = analyze(compile(tiny([['P1', 'T1'], ['T1', 'P2']])));
assert.equal(stuck.deadlockCount, 1);
assert.deepEqual(stuck.deadlocks[0], { marking: { P1: 0, P2: 1 }, path: ['T1'] });
assert.equal(stuck.reversible, false);
assert.equal(analyze(compile(normalizeNet({}).net)).deadlockCount, 0, 'an empty net is not a deadlock');

// ─── Simulation ──────────────────────────────────────────────────────────────

const drill = examples('en')[0].net;
const c = compile(drill);
let s = initialSim(c);
assert.equal(statusOf(c, s, 'T1').status, 'blocked');
const fired = fireManual(c, s, 'T1');
assert.ok(fired.ok);
assert.deepEqual(fired.changedInputs.sort(), ['limit_up', 'part_present', 'start']);
assert.equal(fired.state.inputs.start, false, 'push button released after the click');
assert.deepEqual(fired.state.marking, { P1: 0, P2: 1, P3: 0, P4: 0 });
assert.deepEqual(outputsOf(c, fired.state.marking), { feed_down: true, retract: false, spindle: true });
assert.deepEqual(fireManual(c, fired.state, 'T1'), { ok: false, reason: 'not-enabled' });

// One step per scan, and the 1.5 s dwell measured from when P3 got its token.
s = { ...fired.state, inputs: { ...fired.state.inputs, limit_up: false, limit_down: true } };
s = scan(c, s, 100);
assert.deepEqual(s.lastFired, ['T2']);
let dwell = 0;
while (!s.lastFired.includes('T3')) {
  s = scan(c, s, 100);
  dwell += 100;
  assert.ok(dwell < 5000, 'T3 never fired');
}
assert.equal(dwell, 1600, 'TON starts on the scan after P3 is marked and fires once ET >= PT');
assert.equal(statusOf(c, s, 'T4').status, 'blocked');

// ─── Layout ──────────────────────────────────────────────────────────────────

for (const ex of examples('pt'))
  for (const dir of ['TB', 'LR'] as const) {
    const laid = layoutNet(ex.net, dir);
    for (const n of [...laid.places, ...laid.transitions])
      assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y), `${ex.id} ${dir} ${n.id} has no position`);
    const routes = laid.layout!.routes;
    for (const id of laid.layout!.orthogonal ?? []) assert.ok(routes[id]?.length === 6, `${ex.id} ${dir} return ${id}`);
    // The marked start is on top (TB) or on the left (LR) of everything it feeds.
    const start = laid.places.find((p) => p.tokens > 0)!;
    const first = laid.transitions.find((t) => laid.arcs.some((a) => a.from === start.id && a.to === t.id))!;
    assert.ok(dir === 'TB' ? first.y! > start.y! : first.x! > start.x!, `${ex.id} ${dir} flows from the start`);
  }

console.log('model: ok');
