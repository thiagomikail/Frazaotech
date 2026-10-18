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
  pt: {
    init: 'Marcação inicial',
    timers: 'Temporizadores: olham a marcação do início do ciclo',
    firing: 'Disparos, em ordem de prioridade',
    produce: 'As fichas produzidas entram agora',
    outputs: 'Saídas: ligadas enquanto um lugar que as aciona estiver marcado',
  },
  en: {
    init: 'Initial marking',
    timers: 'Timers: they see the marking as the scan started',
    firing: 'Firing, in priority order',
    produce: 'Produced tokens land now',
    outputs: 'Outputs: ON while a place that drives them is marked',
  },
} as const;

export interface Section {
  title: string;
  stmts: IStmt[];
}

/** The four numbered steps of a scan, skipping the empty ones. */
export function sections(prog: Program): { init: Section; scan: Section[]; outputs: Section } {
  const t = SECTIONS[prog.lang];
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
  pt: {
    timers: ['os temporizadores olham a marcação do início do ciclo;'],
    firing: [
      'as transições disparam em ordem de prioridade e só consomem fichas que',
      '   já estavam lá no início do ciclo: uma ficha anda no máximo um passo por',
      '   ciclo, e a ficha disputada vai para a transição de maior prioridade;',
    ],
    produce: ['as fichas produzidas entram no fim do ciclo;'],
    outputs: ['cada saída liga enquanto algum lugar que a aciona estiver marcado.'],
  },
  en: {
    timers: ['timers see the marking as the scan started;'],
    firing: [
      'transitions fire in priority order and only consume tokens that were',
      '   there when the scan started: a token moves at most one step per scan,',
      '   and a contested token goes to the higher-priority transition;',
    ],
    produce: ['produced tokens land at the end of the scan;'],
    outputs: ['each output is ON while any place that drives it is marked.'],
  },
} as const;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Header text, without comment markers. Its numbered steps match the code sections. */
export function headerLines(prog: Program, dialect: Dialect): string[] {
  const s = prog.stats;
  const pt = prog.lang === 'pt';
  const title = [prog.netName, prog.description].filter(Boolean).map(safeComment).join(' - ');
  const steps = STEPS[prog.lang];
  const present = [
    ...(prog.timers.length ? [steps.timers] : []),
    ...(prog.firing.length ? [steps.firing] : []),
    ...(prog.produce.length ? [steps.produce] : []),
    steps.outputs,
  ];
  const numbered = present.flatMap((lines, i) => lines.map((l, j) => (j === 0 ? `  ${i + 1}. ${l}` : `  ${l}`)));
  const resetLine =
    dialect === 'rockwell'
      ? pt
        ? `${prog.reset} = 1, ou o primeiro scan (S:FS), volta à marcação inicial.`
        : `${prog.reset} = 1, or the first scan (S:FS), brings back the initial marking.`
      : pt
        ? `${prog.reset} = TRUE volta à marcação inicial.`
        : `${prog.reset} = TRUE brings back the initial marking.`;
  const unbounded = prog.unbounded.length
    ? [
        '',
        pt
          ? `ATENÇÃO: a rede não é limitada. ${prog.unbounded.join(', ')} pode crescer até estourar o INT.`
          : `WARNING: the net is unbounded. ${prog.unbounded.join(', ')} can grow until the INT overflows.`,
      ]
    : [];
  const sizes = pt
    ? `${count(s.places, 'lugar', 'lugares')} (${s.boolPlaces} em BOOL, ${s.intPlaces} em INT), ${count(s.transitions, 'transição', 'transições')}, ${count(s.timers, 'temporizador', 'temporizadores')}.`
    : `${count(s.places, 'place', 'places')} (${s.boolPlaces} as BOOL, ${s.intPlaces} as INT), ${count(s.transitions, 'transition', 'transitions')}, ${count(s.timers, 'timer', 'timers')}.`;
  return [
    title || prog.fbName,
    pt
      ? `Rede de Petri convertida em ${DIALECT_LABEL[dialect]} pelo FrazaoTech PetriPLC em ${prog.date}.`
      : `Petri net converted to ${DIALECT_LABEL[dialect]} by FrazaoTech PetriPLC on ${prog.date}.`,
    sizes,
    '',
    pt ? 'A cada ciclo de varredura:' : 'Every scan:',
    ...numbered,
    resetLine,
    ...unbounded,
    '',
    ...(pt
      ? [
          'Lógica de processo, não de segurança: parada de emergência e proteções',
          'continuam no circuito de segurança (ISO 13849 / IEC 62061 / NR-12).',
        ]
      : [
          'Process logic, not safety logic: emergency stop and guarding stay in the',
          'safety circuit (ISO 13849 / IEC 62061).',
        ]),
  ];
}

export { timeLiteral };
