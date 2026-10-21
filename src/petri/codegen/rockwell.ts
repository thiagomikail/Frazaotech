import type { Program } from './ir';
import { headerLines, printStmts, sections, type StStyle } from './st';

/**
 * Studio 5000 (Logix) ST routine. Logix has no ST function blocks, so this is
 * the routine body plus the tag list to create — ideally in a program of its
 * own. BOOL literals are 1/0, places that need a count are DINT, and the
 * on-delays are FBD_TIMER tags driven by TONR.
 */
export const ROCKWELL_ST: StStyle = {
  ref: (n) => n,
  trueLit: '1',
  falseLit: '0',
  timerDone: (t) => `${t}.DN`,
  timerCall: (t, input, pt) => [`${t}.PRE := ${pt};`, `${t}.TimerEnable := ${input};`, `TONR(${t});`],
  comment: (text) => `// ${text.replace(/[\r\n]+/g, ' ')}`,
  indent: '    ',
};

const TYPE = { BOOL: 'BOOL', INT: 'DINT', TIMER: 'FBD_TIMER' } as const;

const USAGE = {
  title: 'Tags to create in the program scope (ideally a program of its own for this net).',
  io: 'Inputs and outputs: create them as aliases of the I/O points (e.g. Local:1:I.Data.0).',
  head: ['Tag', 'Type', 'Use'],
  initial: 'initial',
  group: {
    reset: 'reset',
    input: 'input',
    output: 'output',
    place: 'place',
    pending: 'internal',
    fired: 'internal',
    timer: 'timer',
  },
} as const;

export function printRockwell(prog: Program): string {
  const st = ROCKWELL_ST;
  const u = USAGE;
  const sec = sections(prog);
  const wName = Math.max(u.head[0].length, ...prog.decls.map((d) => d.name.length));
  const wType = Math.max(u.head[1].length, ...prog.decls.map((d) => TYPE[d.type].length));
  const row = (a: string, b: string, c: string) => `//   ${a.padEnd(wName)}  ${b.padEnd(wType)}  ${c}`.trimEnd();

  const lines = [
    '// ' + '='.repeat(76),
    ...headerLines(prog, 'rockwell').map((l) => `//${l ? ` ${l}` : ''}`),
    '//',
    `// ${u.title}`,
    `// ${u.io}`,
    row(u.head[0], u.head[1], u.head[2]),
    ...prog.decls.map((d) => {
      const extra = [d.init ? `${u.initial} ${d.init === true ? 1 : d.init}` : '', d.ptMs ? `PRE ${d.ptMs} ms` : '']
        .filter(Boolean)
        .join(', ');
      return row(
        d.name,
        TYPE[d.type],
        `${u.group[d.group]}${extra ? ` (${extra})` : ''}${d.detail ? `: ${d.detail}` : ''}`,
      );
    }),
    '// ' + '='.repeat(76),
    '',
    `IF S:FS OR ${prog.reset} THEN`,
    st.indent + st.comment(sec.init.title),
    ...printStmts(sec.init.stmts, st, 1),
    'ELSE',
  ];
  sec.scan.forEach((s, i) => {
    if (i) lines.push('');
    lines.push(st.indent + st.comment(s.title), ...printStmts(s.stmts, st, 1));
  });
  lines.push('END_IF;', '', st.comment(sec.outputs.title), ...printStmts(sec.outputs.stmts, st, 0), '');
  return lines.join('\n');
}
