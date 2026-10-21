/**
 * The generated IEC ST and the simulator must be the same machine. This runs
 * both side by side — the ST through a small interpreter — on every example
 * and on hundreds of random nets (weights, capacities, inhibitor arcs, timers,
 * priorities, resets), comparing marking, outputs and fired transitions after
 * every scan.
 */
import assert from 'node:assert/strict';
import { analyze } from '../../src/petri/model/analyze';
import { examples } from '../../src/petri/model/examples';
import { compile } from '../../src/petri/model/net';
import { initialSim, outputsOf, scan } from '../../src/petri/model/simulate';
import type { PetriNet } from '../../src/petri/model/types';
import { buildProgram } from '../../src/petri/codegen/ir';
import { printIec } from '../../src/petri/codegen/iec';
import { FunctionBlock } from './st-interp';

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rnd: () => number, xs: T[]) => xs[Math.floor(rnd() * xs.length)];

function randomGuard(rnd: () => number, depth = 0): string {
  const r = rnd();
  if (depth > 1 || r < 0.35) return pick(rnd, ['a', 'b', 'c', 'NOT a', 'NOT b', 'TRUE']);
  const op = pick(rnd, ['AND', 'OR', 'XOR']);
  return `(${randomGuard(rnd, depth + 1)} ${op} ${randomGuard(rnd, depth + 1)})`;
}

/**
 * Random nets that actually move: one to three cycles (state machines) with
 * tokens in them, shared resources that cycles grab and release (conflicts),
 * a buffer from one cycle to another (INT places, sometimes with capacity),
 * plus the odd inhibitor arc, read arc and double-weight arc.
 */
export function randomNet(rnd: () => number): PetriNet {
  const places: PetriNet['places'] = [];
  const transitions: PetriNet['transitions'] = [];
  const arcs: PetriNet['arcs'] = [];
  const seen = new Set<string>();
  const P = (tokens: number, capacity = 0) => {
    const id = `P${places.length + 1}`;
    places.push({
      id,
      name: id.toLowerCase(),
      description: '',
      tokens,
      capacity,
      actions: ['y1', 'y2'].filter(() => rnd() < 0.3),
    });
    return id;
  };
  const T = () => {
    const id = `T${transitions.length + 1}`;
    transitions.push({
      id,
      name: id.toLowerCase(),
      description: '',
      guard: rnd() < 0.25 ? '' : randomGuard(rnd),
      delayMs: rnd() < 0.25 ? 100 * (1 + Math.floor(rnd() * 5)) : 0,
      priority: 1 + Math.floor(rnd() * 4),
    });
    return id;
  };
  const add = (from: string, to: string, weight = 1, inhibitor = false) => {
    const key = `${from}>${to}>${inhibitor}`;
    if (seen.has(key)) return;
    seen.add(key);
    arcs.push({ id: `A${arcs.length + 1}`, from, to, weight, ...(inhibitor ? { inhibitor } : {}) });
  };

  const cycles: { ps: string[]; ts: string[] }[] = [];
  const nCycles = 1 + Math.floor(rnd() * 3);
  for (let c = 0; c < nCycles; c++) {
    const len = 2 + Math.floor(rnd() * 4);
    const double = rnd() < 0.15;
    const ps = Array.from({ length: len }, (_, i) => P(i === 0 ? (double ? 2 : rnd() < 0.2 ? 2 : 1) : 0));
    const ts = ps.map(() => T());
    ts.forEach((t, i) => {
      add(ps[i], t, double && i === 0 ? 2 : 1);
      add(t, ps[(i + 1) % len], double && i === len - 1 ? 2 : 1);
    });
    cycles.push({ ps, ts });
  }
  const nResources = Math.floor(rnd() * 3);
  for (let r = 0; r < nResources; r++) {
    const res = P(rnd() < 0.3 ? 2 : 1);
    for (const cyc of cycles.filter(() => rnd() < 0.7)) {
      const a = Math.floor(rnd() * cyc.ts.length);
      const b = (a + 1 + Math.floor(rnd() * (cyc.ts.length - 1))) % cyc.ts.length;
      add(res, cyc.ts[a]);
      add(cyc.ts[b === a ? (a + 1) % cyc.ts.length : b], res);
    }
  }
  if (cycles.length >= 2 && rnd() < 0.7) {
    const buffer = P(0, rnd() < 0.5 ? 1 + Math.floor(rnd() * 3) : 0);
    add(pick(rnd, cycles[0].ts), buffer);
    add(buffer, pick(rnd, cycles[1].ts));
  }
  if (rnd() < 0.4) add(pick(rnd, places).id, pick(rnd, transitions).id, 1 + Math.floor(rnd() * 2), true);
  if (rnd() < 0.3) {
    const p = pick(rnd, places).id;
    const t = pick(rnd, transitions).id;
    add(p, t);
    add(t, p);
  }
  return {
    name: 'random',
    description: '',
    inputs: ['a', 'b', 'c'].map((name) => ({ name, description: '', kind: 'sensor' as const })),
    outputs: ['y1', 'y2'].map((name) => ({ name, description: '' })),
    places,
    transitions,
    arcs,
  };
}

export function runSideBySide(
  net: PetriNet,
  seed: number,
  scans = 300,
): { boolPlaces: number; intPlaces: number; fired: number } {
  const c = compile(net);
  assert.ok(!c.issues.some((i) => i.level === 'error'), JSON.stringify(c.issues));
  const a = analyze(c);
  const prog = buildProgram(c, a, { fbName: 'FB_Test', date: '2026-10-18' });
  const fb = new FunctionBlock(printIec(prog));
  const names = (g: string) => prog.decls.filter((d) => d.group === g).map((d) => d.name);
  const placeNames = names('place');
  const inputNames = names('input');
  const outputNames = names('output');
  const firedNames = names('fired');

  const rnd = rng(seed);
  const dt = 100;
  let s = initialSim(c);
  let fired = 0;
  for (let k = 0; k < scans; k++) {
    const inputs = { ...s.inputs };
    for (const sig of net.inputs) if (rnd() < 0.3) inputs[sig.name] = !inputs[sig.name];
    const reset = rnd() < 0.02;
    s = { ...s, inputs };

    fb.now = s.time;
    net.inputs.forEach((sig, i) => fb.set(inputNames[i], inputs[sig.name]));
    fb.set(prog.reset, reset);
    fb.run();
    s = reset ? { ...initialSim(c, inputs), time: s.time + dt, scans: s.scans + 1 } : scan(c, s, dt);

    if (!reset) fired += s.lastFired.length;
    const where = `seed ${seed}, scan ${k}${reset ? ' (reset)' : ''}`;
    c.places.forEach((p, i) => {
      const v = fb.get(placeNames[i]);
      assert.equal(typeof v === 'boolean' ? Number(v) : v, s.marking[p.id], `${p.id} at ${where}`);
    });
    const outs = outputsOf(c, s.marking);
    net.outputs.forEach((sig, i) => assert.equal(fb.get(outputNames[i]), outs[sig.name], `${sig.name} at ${where}`));
    if (!reset)
      c.transitions.forEach((t, i) =>
        assert.equal(fb.get(firedNames[i]), s.lastFired.includes(t.id), `${t.id} fired at ${where}`),
      );
  }
  return { boolPlaces: prog.stats.boolPlaces, intPlaces: prog.stats.intPlaces, fired };
}

// Importing this file (the mutation check does) must not rerun the whole suite.
if (process.argv[1]?.endsWith('equivalence.test.ts')) {
  let runs = 0;
  let bools = 0;
  let ints = 0;
  let fired = 0;
  for (const ex of examples())
    for (let seed = 1; seed <= 20; seed++) {
      fired += runSideBySide(ex.net, seed, 400).fired;
      runs++;
    }

  const gen = rng(2026);
  for (let n = 0; n < 400; n++) {
    const r = runSideBySide(randomNet(gen), 1000 + n);
    bools += r.boolPlaces;
    ints += r.intPlaces;
    fired += r.fired;
    runs++;
  }
  console.log(
    `equivalence: ${runs} runs, ${fired} firings, identical (random nets: ${bools} BOOL and ${ints} INT places)`,
  );
}
