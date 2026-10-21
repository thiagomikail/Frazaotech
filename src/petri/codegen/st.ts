import { safeComment, timeLiteral, type IExpr, type IStmt, type Program } from './ir';

/** What changes between ST flavours. Everything else is shared. */
export interface StStyle {
  ref: (name: string) => string;
  trueLit: string;
  falseLit: string;
  timerDone: (timer: string) => string;
  /** Lines that call/reset a timer. */
  timerCall: (timer: string, input: string, ptMs: number) => string[];
  comment: (text: string) => string;
  indent: string;
}

const atomic = (e: IExpr) => e.k === 'ref' || e.k === 'bool' || e.k === 'int' || e.k === 'timerDone';

export function printIExpr(e: IExpr, st: StStyle): string {
  switch (e.k) {
    case 'ref':
      return st.ref(e.name);
    case 'bool':
      return e.v ? st.trueLit : st.falseLit;
    case 'int':
      return String(e.v);
    case 'timerDone':
      return st.timerDone(e.timer);
    case 'not': {
      const inner = printIExpr(e.e, st);
      return atomic(e.e) ? `NOT ${inner}` : `NOT (${inner})`;
    }
    case 'and':
    case 'or':
    case 'xor':
      // Comparisons and other operators get parentheses: never lean on precedence in PLC code.
      return e.args
        .map((a) => {
          const s = printIExpr(a, st);
          return atomic(a) || a.k === 'not' || a.k === e.k ? s : `(${s})`;
        })
        .join(` ${e.k.toUpperCase()} `);
    case 'cmp':
      return `${printIExpr(e.a, st)} ${e.op} ${printIExpr(e.b, st)}`;
    case 'add':
    case 'sub':
      return `${printIExpr(e.a, st)} ${e.k === 'add' ? '+' : '-'} ${printIExpr(e.b, st)}`;
  }
}

export function printStmts(stmts: IStmt[], st: StStyle, depth: number): string[] {
  const pad = st.indent.repeat(depth);
  const out: string[] = [];
  for (const s of stmts) {
    switch (s.k) {
      case 'blank':
        out.push('');
        break;
      case 'comment':
        out.push(pad + st.comment(s.text));
        break;
      case 'assign':
        out.push(`${pad}${st.ref(s.name)} := ${printIExpr(s.e, st)};`);
        break;
      case 'timer':
        for (const line of st.timerCall(s.timer, printIExpr(s.in, st), s.ptMs)) out.push(pad + line);
        break;
      case 'if':
        out.push(`${pad}IF ${printIExpr(s.cond, st)} THEN`);
        out.push(...printStmts(s.then, st, depth + 1));
        if (s.else?.length) {
          out.push(`${pad}ELSE`);
          out.push(...printStmts(s.else, st, depth + 1));
        }
        out.push(`${pad}END_IF;`);
        break;
    }
  }
  return out;
}

const SECTIONS = {
  init: 'Initial marking',
  timers: 'Timers: they see the marking as the scan started',
  firing: 'Firing, in priority order',
  produce: 'Produced tokens land now',
  outputs: 'Outputs: ON while a place that drives them is marked',
} as const;

export interface Section {
  title: string;
  stmts: IStmt[];
}

/** The four numbered steps of a scan, skipping the empty ones. */
export function sections(prog: Program): { init: Section; scan: Section[]; outputs: Section } {
  const t = SECTIONS;
  const scan: Section[] = [
    { title: t.timers, stmts: prog.timers },
    { title: t.firing, stmts: prog.firing },
    { title: t.produce, stmts: prog.produce },
  ].filter((s) => s.stmts.length > 0);
  scan.forEach((s, i) => (s.title = `${i + 1}. ${s.title}`));
  return {
    init: { title: t.init, stmts: prog.init },
    scan,
    outputs: { title: `${scan.length + 1}. ${t.outputs}`, stmts: prog.outputs },
  };
}

export const DIALECT_LABEL = {
  iec: 'IEC 61131-3 Structured Text',
  siemens: 'Siemens TIA Portal SCL',
  rockwell: 'Rockwell Studio 5000 Structured Text',
  plcopen: 'PLCopen XML (TC6 2.01)',
} as const;

export type Dialect = keyof typeof DIALECT_LABEL;

const STEPS = {
  timers: ['timers see the marking as the scan started;'],
  firing: [
    'transitions fire in priority order and only consume tokens that were',
    '   there when the scan started: a token moves at most one step per scan,',
    '   and a contested token goes to the higher-priority transition;',
  ],
  produce: ['produced tokens land at the end of the scan;'],
  outputs: ['each output is ON while any place that drives it is marked.'],
} as const;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Header text, without comment markers. Its numbered steps match the code sections. */
export function headerLines(prog: Program, dialect: Dialect): string[] {
  const s = prog.stats;
  const title = [prog.netName, prog.description].filter(Boolean).map(safeComment).join(' - ');
  const present = [
    ...(prog.timers.length ? [STEPS.timers] : []),
    ...(prog.firing.length ? [STEPS.firing] : []),
    ...(prog.produce.length ? [STEPS.produce] : []),
    STEPS.outputs,
  ];
  const numbered = present.flatMap((lines, i) => lines.map((l, j) => (j === 0 ? `  ${i + 1}. ${l}` : `  ${l}`)));
  const unbounded = prog.unbounded.length
    ? ['', `WARNING: the net is unbounded. ${prog.unbounded.join(', ')} can grow until the INT overflows.`]
    : [];
  return [
    title || prog.fbName,
    `Petri net converted to ${DIALECT_LABEL[dialect]} by PetriPLC (OT Workbench) on ${prog.date}.`,
    `${count(s.places, 'place', 'places')} (${s.boolPlaces} as BOOL, ${s.intPlaces} as INT), ` +
      `${count(s.transitions, 'transition', 'transitions')}, ${count(s.timers, 'timer', 'timers')}.`,
    '',
    'Every scan:',
    ...numbered,
    dialect === 'rockwell'
      ? `${prog.reset} = 1, or the first scan (S:FS), brings back the initial marking.`
      : `${prog.reset} = TRUE brings back the initial marking.`,
    ...unbounded,
    '',
    'Process logic, not safety logic: emergency stop and guarding stay in the',
    'safety circuit (ISO 13849 / IEC 62061).',
  ];
}

export { timeLiteral };
