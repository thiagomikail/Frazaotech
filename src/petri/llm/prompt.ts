import type { Lang } from '../i18n';
import type { Analysis } from '../model/analyze';
import { normalizeNet, structuralJson, type Issue, type NormalizeReport } from '../model/net';
import type { PetriNet } from '../model/types';
import type { Turn } from './gemini';

/**
 * What the model is told. The net it returns is executed — simulated, then
 * compiled to PLC code — so the conventions below are the contract, not style.
 */
export const SYSTEM_PROMPT = `You are PetriPLC, an assistant for industrial automation engineers. You turn a plain-language description of a machine or process into an interpreted (control) Petri net. The net is simulated in the browser and then compiled to IEC 61131-3 PLC code, so it must be executable, not just a drawing.

MODEL CONVENTIONS — follow them strictly
- Places ("P1", "P2", …) are states or conditions of the machine, or resources and counters. While a place is marked, every output listed in its "actions" is ON (continuous action, like a Grafcet step). An output that stays on across several states is listed in each of those places.
- Transitions ("T1", "T2", …) are events. A transition fires when every input place holds enough tokens AND its guard is true for at least delayMs milliseconds.
- Guards are boolean expressions over INPUT names only, in IEC 61131-3 syntax: AND, OR, NOT, XOR, parentheses, TRUE. Example: "start AND NOT estop". Never use comparisons, output names or place names in a guard. An analog condition becomes a boolean input (e.g. level_high). An empty guard means always true.
- Time: "wait 3 s", "mix for 10 s" = a transition with delayMs (3000, 10000) leaving that state, usually with an empty guard.
- Arcs go place→transition or transition→place, never place→place or transition→transition. "weight" is 1 unless several tokens move at once. "inhibitor": true only on place→transition arcs; the transition is blocked while the place holds "weight" tokens or more.
- Initial marking ("tokens"): usually 1 token in the initial/idle state of each independent part of the machine. A shared resource (robot, zone, crane, operator) is a place with 1 token that transitions take and give back.
- Concurrency: a transition with two output places starts two parallel branches; a transition with two input places waits for both.
- Counters and buffers: a place may hold several tokens; "capacity" limits it (0 = unlimited).
- Priority: lower number fires first when transitions compete for the same token. Stop/fault paths get the lowest numbers.
- The normal cycle must come back to the initial state: no deadlock, bounded, preferably at most 1 token per place except counters and resources.
- Emergency stop: model only the PLC reaction (e.g. moving states → a "Stopped" place when the e-stop input drops, and a reset back to idle), and only if the user asks. It never replaces the hardwired safety circuit.

NAMES
- Keep the ids of everything that did not change. New elements take the next free number.
- Input and output names are short IEC identifiers in the user's language: letters, digits and underscore, starting with a letter, no accents or spaces (e.g. "start", "limit_up", "motor_fwd" / "partida", "fc_alto", "motor_avanco").
- Place and transition "name": 1 to 3 readable words (accents allowed). "description": one short sentence, or empty.
- Input "kind": "button" for a momentary push button, "sensor" for limit switches, photocells, level and pressure switches, "switch" for a maintained selector.

CONVERSATION
- The user describes a new machine or asks to change the CURRENT NET. When a current net is given, return the complete updated net (not a diff).
- If the message only asks a question and needs no change, leave "net" out.
- If something essential is ambiguous, make a reasonable assumption, list it in "assumptions", and ask at most 2 short "questions".
- "reply": 1 to 3 plain sentences (no markdown) in the language the user wrote in, saying what you modeled or changed.`;

const str = { type: 'string' };
const int = { type: 'integer' };

export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: '1 to 3 plain sentences in the language the user wrote in.' },
    assumptions: { type: 'array', items: str },
    questions: { type: 'array', items: str },
    net: {
      type: 'object',
      properties: {
        name: str,
        description: str,
        inputs: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: str, description: str, kind: { type: 'string', enum: ['button', 'sensor', 'switch'] } },
            required: ['name', 'description', 'kind'],
          },
        },
        outputs: {
          type: 'array',
          items: { type: 'object', properties: { name: str, description: str }, required: ['name', 'description'] },
        },
        places: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: str,
              name: str,
              description: str,
              tokens: int,
              capacity: int,
              actions: { type: 'array', items: str },
            },
            required: ['id', 'name', 'tokens', 'actions'],
          },
        },
        transitions: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: str, name: str, description: str, guard: str, delayMs: int, priority: int },
            required: ['id', 'name', 'guard', 'delayMs', 'priority'],
          },
        },
        arcs: {
          type: 'array',
          items: {
            type: 'object',
            properties: { from: str, to: str, weight: int, inhibitor: { type: 'boolean' } },
            required: ['from', 'to', 'weight'],
          },
        },
      },
      required: ['name', 'inputs', 'outputs', 'places', 'transitions', 'arcs'],
    },
  },
  required: ['reply'],
};

export interface HistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

const LANG_NAME: Record<Lang, string> = { pt: 'Brazilian Portuguese', en: 'English' };

/** One line per fact the model can act on. */
export function analysisSummary(a: Analysis | null, issues: Issue[]): string {
  const lines: string[] = [];
  for (const i of issues.filter((x) => x.level === 'error'))
    lines.push(`error ${i.code} ${JSON.stringify(i.params ?? {})}`);
  if (a) {
    lines.push(
      `bounded: ${a.bounded ?? 'unknown'}; safe: ${a.safe ?? 'unknown'}; reversible: ${a.reversible ?? 'unknown'}`,
    );
    if (a.deadlockCount)
      lines.push(`deadlocks: ${a.deadlockCount}, e.g. after ${a.deadlocks[0].path.join(' ') || '(start)'}`);
    if (a.deadTransitions.length) lines.push(`never enabled: ${a.deadTransitions.join(', ')}`);
    const unbounded = Object.entries(a.bounds)
      .filter(([, b]) => b === null)
      .map(([p]) => p);
    if (unbounded.length) lines.push(`unbounded places: ${unbounded.join(', ')}`);
  }
  return lines.join('\n');
}

/**
 * The conversation as Gemini turns. Earlier answers go in as their text only;
 * the current net travels once, in the last turn, so a long chat stays cheap.
 */
export function buildTurns(
  history: HistoryItem[],
  request: string,
  current: PetriNet | null,
  analysis: string,
  lang: Lang,
): Turn[] {
  const turns: Turn[] = history.slice(-10).map((h) => ({ role: h.role === 'user' ? 'user' : 'model', text: h.text }));
  const parts: string[] = [];
  if (current && (current.places.length || current.transitions.length)) {
    parts.push('CURRENT NET:', structuralJson(current));
    if (analysis) parts.push('', 'ANALYSIS OF THE CURRENT NET:', analysis);
    parts.push('');
  }
  parts.push(
    `(Interface language: ${LANG_NAME[lang]}. Reply in the language of the request.)`,
    '',
    'REQUEST:',
    request,
  );
  turns.push({ role: 'user', text: parts.join('\n') });
  // Gemini wants turns that alternate and start with the user: a request that
  // failed leaves two user turns in a row, so they are merged.
  const merged: Turn[] = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.text += `\n\n${t.text}`;
    else merged.push({ ...t });
  }
  while (merged.length && merged[0].role !== 'user') merged.shift();
  return merged;
}

export interface AssistantAnswer {
  reply: string;
  assumptions: string[];
  questions: string[];
  net: PetriNet | null;
  report: NormalizeReport | null;
}

const texts = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];

export function readAnswer(data: unknown): AssistantAnswer {
  const r = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const rawNet = r.net && typeof r.net === 'object' ? r.net : null;
  const normalized = rawNet ? normalizeNet(rawNet) : null;
  const usable = normalized && normalized.net.places.length + normalized.net.transitions.length > 0;
  return {
    reply: typeof r.reply === 'string' ? r.reply.trim() : '',
    assumptions: texts(r.assumptions).slice(0, 6),
    questions: texts(r.questions).slice(0, 3),
    net: usable ? normalized!.net : null,
    report: usable ? normalized!.report : null,
  };
}
