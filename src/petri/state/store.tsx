import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Dialect, GeneratedFile } from '../codegen';
import type { LlmErrorKind } from '../llm/gemini';
import { analyze, type Analysis } from '../model/analyze';
import { semanticKey } from '../model/edit';
import { layoutNet, needsLayout } from '../model/layout';
import { compile, normalizeNet, type CompiledNet } from '../model/net';
import { initialSim, scan, type SimState } from '../model/simulate';
import { emptyNet, type PetriNet } from '../model/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  assumptions?: string[];
  questions?: string[];
  notes?: string[];
  model?: string;
  error?: LlmErrorKind;
  /** What Google said, verbatim, so the key or quota problem can be fixed. */
  detail?: string[];
  /** The net as it was before this answer changed it — the per-message undo. */
  before?: PetriNet;
  undone?: boolean;
  summary?: { places: number; transitions: number };
  /** The welcome message carries the example chips. */
  welcome?: boolean;
  /** For a failed request: what to send again. */
  retry?: string;
}

export type Mode = 'sim' | 'edit';
export type Tool = 'select' | 'place' | 'transition' | 'arc';
export type Selection = { kind: 'place' | 'transition' | 'arc'; id: string } | null;

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'warn';
}

export interface State {
  net: PetriNet;
  past: PetriNet[];
  future: PetriNet[];
  messages: ChatMessage[];
  selection: Selection;
  mode: Mode;
  tool: Tool;
  arcFrom: string | null;
  sim: SimState;
  running: boolean;
  speed: number;
  /** Push buttons pressed with a click: released after the next scan. */
  pulses: string[];
  /** Bumped to ask the canvas to frame the whole net. */
  fitToken: number;
  dialects: Dialect[];
  fbName: string;
  toasts: Toast[];
  /** The assistant is answering: which model, since when. */
  busy: { model: string; since: number } | null;
  /** Last generated code, and the net it came from (to tell when it went stale). */
  generated: { files: GeneratedFile[]; netKey: string } | null;
}

export type Action =
  | { type: 'net/replace'; net: PetriNet; record?: boolean; fit?: boolean }
  | { type: 'net/update'; fn: (n: PetriNet) => PetriNet; record?: boolean }
  | { type: 'net/undo' }
  | { type: 'net/redo' }
  | { type: 'chat/add'; msg: ChatMessage }
  | { type: 'chat/patch'; id: string; patch: Partial<ChatMessage> }
  | { type: 'chat/clear'; welcome: ChatMessage }
  | { type: 'chat/busy'; busy: State['busy'] }
  | { type: 'ui/select'; selection: Selection }
  | { type: 'ui/mode'; mode: Mode }
  | { type: 'ui/tool'; tool: Tool }
  | { type: 'ui/arcFrom'; id: string | null }
  | { type: 'ui/fit' }
  | { type: 'sim/set'; sim: SimState }
  | { type: 'sim/scan'; compiled: CompiledNet; dt: number }
  | { type: 'sim/reset'; compiled: CompiledNet }
  | { type: 'sim/run'; running: boolean }
  | { type: 'sim/speed'; speed: number }
  | { type: 'sim/input'; name: string; value: boolean; pulse?: boolean }
  | { type: 'code/dialects'; dialects: Dialect[] }
  | { type: 'code/fbName'; fbName: string }
  | { type: 'code/generated'; generated: State['generated'] }
  | { type: 'toast/add'; toast: Toast }
  | { type: 'toast/remove'; id: number };

const HISTORY = 80;

/** Positions for nodes that have none (LLM answers, imported files). */
export const ensureLayout = (net: PetriNet) => (needsLayout(net) ? layoutNet(net) : net);

function selectionExists(net: PetriNet, sel: Selection): boolean {
  if (!sel) return true;
  const pool = sel.kind === 'place' ? net.places : sel.kind === 'transition' ? net.transitions : net.arcs;
  return pool.some((x) => x.id === sel.id);
}

function withNet(state: State, net: PetriNet, record: boolean): State {
  if (net === state.net) return state;
  return {
    ...state,
    net,
    past: record ? [...state.past, state.net].slice(-HISTORY) : state.past,
    future: record ? [] : state.future,
    selection: selectionExists(net, state.selection) ? state.selection : null,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'net/replace': {
      const next = withNet(state, action.net, action.record ?? true);
      return action.fit ? { ...next, fitToken: state.fitToken + 1 } : next;
    }
    case 'net/update':
      return withNet(state, action.fn(state.net), action.record ?? true);
    case 'net/undo': {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        ...state,
        net: prev,
        past: state.past.slice(0, -1),
        future: [state.net, ...state.future].slice(0, HISTORY),
        selection: selectionExists(prev, state.selection) ? state.selection : null,
      };
    }
    case 'net/redo': {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        net: next,
        past: [...state.past, state.net].slice(-HISTORY),
        future: state.future.slice(1),
        selection: selectionExists(next, state.selection) ? state.selection : null,
      };
    }
    case 'chat/add':
      return { ...state, messages: [...state.messages, action.msg] };
    case 'chat/patch':
      return { ...state, messages: state.messages.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)) };
    case 'chat/clear':
      return { ...state, messages: [action.welcome] };
    case 'chat/busy':
      return { ...state, busy: action.busy };
    case 'ui/select':
      return { ...state, selection: action.selection };
    case 'ui/mode':
      return { ...state, mode: action.mode, tool: 'select', arcFrom: null };
    case 'ui/tool':
      return { ...state, tool: action.tool, arcFrom: null };
    case 'ui/arcFrom':
      return { ...state, arcFrom: action.id };
    case 'ui/fit':
      return { ...state, fitToken: state.fitToken + 1 };
    case 'sim/set':
      return { ...state, sim: action.sim };
    case 'sim/scan': {
      const after = scan(action.compiled, state.sim, action.dt);
      if (state.pulses.length === 0) return { ...state, sim: after };
      const inputs = { ...after.inputs };
      for (const name of state.pulses) inputs[name] = false;
      return { ...state, sim: { ...after, inputs }, pulses: [] };
    }
    case 'sim/reset':
      return { ...state, sim: initialSim(action.compiled, state.sim.inputs), pulses: [] };
    case 'sim/run':
      return { ...state, running: action.running };
    case 'sim/speed':
      return { ...state, speed: action.speed };
    case 'sim/input': {
      const pulses = action.pulse
        ? [...new Set([...state.pulses, action.name])]
        : state.pulses.filter((p) => p !== action.name);
      return { ...state, sim: { ...state.sim, inputs: { ...state.sim.inputs, [action.name]: action.value } }, pulses };
    }
    case 'code/dialects':
      return { ...state, dialects: action.dialects };
    case 'code/fbName':
      return { ...state, fbName: action.fbName };
    case 'code/generated':
      return { ...state, generated: action.generated };
    case 'toast/add':
      return { ...state, toasts: [...state.toasts.slice(-3), action.toast] };
    case 'toast/remove':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
  }
}

// ─── Persistence ────────────────────────────────────────────────────────────

// v2: English-only release; work saved by the bilingual version starts over.
const STORE_KEY = 'petriplc:v2';

interface Saved {
  net: unknown;
  messages: ChatMessage[];
  dialects: Dialect[];
  fbName: string;
}

function load(): Partial<Saved> {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Saved>) : {};
  } catch {
    return {};
  }
}

function save(state: State) {
  const data: Saved = {
    net: state.net,
    messages: state.messages.slice(-40),
    dialects: state.dialects,
    fbName: state.fbName,
  };
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // Full or blocked storage: the work stays on screen, it just won't survive a reload.
  }
}

const DIALECT_IDS: Dialect[] = ['iec', 'siemens', 'rockwell', 'plcopen'];

function initialState(welcome: ChatMessage): State {
  const saved = load();
  const net = saved.net ? ensureLayout(normalizeNet(saved.net).net) : emptyNet();
  const messages = Array.isArray(saved.messages) && saved.messages.length ? saved.messages : [welcome];
  const dialects = Array.isArray(saved.dialects)
    ? saved.dialects.filter((d) => DIALECT_IDS.includes(d))
    : ['iec' as const];
  return {
    net,
    past: [],
    future: [],
    messages,
    selection: null,
    mode: 'sim',
    tool: 'select',
    arcFrom: null,
    sim: initialSim(compile(net)),
    running: false,
    speed: 1,
    pulses: [],
    fitToken: 1,
    dialects,
    fbName: typeof saved.fbName === 'string' ? saved.fbName : '',
    toasts: [],
    busy: null,
    generated: null,
  };
}

// ─── Context ────────────────────────────────────────────────────────────────

interface Derived {
  compiled: CompiledNet;
  analysis: Analysis;
  semKey: string;
}

const StoreContext = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);
const DerivedContext = createContext<Derived | null>(null);

export function StoreProvider({ welcome, children }: { welcome: ChatMessage; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, welcome, initialState);

  const compiled = useMemo(() => compile(state.net), [state.net]);
  const semKey = useMemo(() => semanticKey(state.net), [state.net]);
  // Keyed on semantics on purpose: renaming or moving a node does not re-explore the state space,
  // and a different machine — not a different label — means a fresh simulation (inputs keep their values).
  const analysis = useMemo(() => analyze(compiled), [semKey]);
  useEffect(() => dispatch({ type: 'sim/reset', compiled }), [semKey]);

  useEffect(() => {
    const id = window.setTimeout(() => save(state), 400);
    return () => window.clearTimeout(id);
  }, [state.net, state.messages, state.dialects, state.fbName]);

  const store = useMemo(() => ({ state, dispatch }), [state]);
  const derived = useMemo(() => ({ compiled, analysis, semKey }), [compiled, analysis, semKey]);
  return (
    <StoreContext.Provider value={store}>
      <DerivedContext.Provider value={derived}>{children}</DerivedContext.Provider>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}

export function useDerived() {
  const ctx = useContext(DerivedContext);
  if (!ctx) throw new Error('useDerived outside StoreProvider');
  return ctx;
}

let toastSeq = 0;
export function useToast() {
  const { dispatch } = useStore();
  return (text: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastSeq;
    dispatch({ type: 'toast/add', toast: { id, text, tone } });
    window.setTimeout(() => dispatch({ type: 'toast/remove', id }), 3800);
  };
}

export const newId = () => Math.random().toString(36).slice(2, 10);
