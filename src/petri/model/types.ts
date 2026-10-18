/**
 * PetriPLC data model — an interpreted (control) Petri net, the kind that
 * maps one-to-one onto PLC code:
 *
 * - places carry the machine state; while a place is marked, the outputs in
 *   its `actions` are ON (continuous action, like a Grafcet step);
 * - transitions fire when their input places are marked AND their guard (a
 *   boolean expression over the inputs) is true for at least `delayMs`;
 * - arcs carry weights; an inhibitor arc (place → transition) blocks the
 *   transition while the place holds `weight` tokens or more.
 */

export type InputKind = 'button' | 'sensor' | 'switch';

export interface InputSignal {
  /** IEC identifier, unique (case-insensitive) among all signals. */
  name: string;
  description: string;
  /** `button` = momentary push button; the simulator releases it by itself. */
  kind: InputKind;
}

export interface OutputSignal {
  name: string;
  description: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Place {
  /** P1, P2… — stable across edits, shown on the diagram and in the code. */
  id: string;
  name: string;
  description: string;
  /** Initial marking. */
  tokens: number;
  /** 0 = unlimited. */
  capacity: number;
  /** Output names that are ON while this place is marked. */
  actions: string[];
  x?: number;
  y?: number;
}

export interface Transition {
  /** T1, T2… */
  id: string;
  name: string;
  description: string;
  /** Boolean expression over input names. Empty or TRUE = always. */
  guard: string;
  /** On-delay: the transition must stay enabled this long before firing. */
  delayMs: number;
  /** Lower fires first when two transitions compete for the same token. */
  priority: number;
  x?: number;
  y?: number;
}

export interface Arc {
  id: string;
  from: string;
  to: string;
  weight: number;
  /** Only place → transition. */
  inhibitor?: boolean;
}

export type Direction = 'TB' | 'LR';

export interface NetLayout {
  direction: Direction;
  /** Bend points computed by the auto layout, per arc id. Dropped when a node moves. */
  routes: Record<string, Point[]>;
  /** Arcs whose route is drawn square with rounded corners (the return channels). */
  orthogonal?: string[];
}

export interface PetriNet {
  name: string;
  description: string;
  inputs: InputSignal[];
  outputs: OutputSignal[];
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
  layout?: NetLayout;
}

export type Marking = Record<string, number>;

export const emptyNet = (): PetriNet => ({
  name: '',
  description: '',
  inputs: [],
  outputs: [],
  places: [],
  transitions: [],
  arcs: [],
});
