import { safeComment, timeLiteral, type Decl, type Program } from './ir';
import { headerLines, printStmts, sections, type Dialect, type StStyle } from './st';

/** Plain IEC 61131-3 ST: CODESYS, TwinCAT, Schneider, B&R, Beremiz… */
export const IEC_ST: StStyle = {
  ref: (n) => n,
  trueLit: 'TRUE',
  falseLit: 'FALSE',
  timerDone: (t) => `${t}.Q`,
  timerCall: (t, input, pt) => [`${t}(IN := ${input}, PT := ${timeLiteral(pt)});`],
  comment: (text) => `(* ${safeComment(text)} *)`,
  indent: '    ',
};

const TYPE = { BOOL: 'BOOL', INT: 'INT', TIMER: 'TON' } as const;

export const GROUP_TITLE = {
  pt: {
    place: 'Marcação: um lugar por variável',
    pending: 'Fichas a entrar no fim do ciclo',
    fired: 'Transições que dispararam neste ciclo',
    timer: 'Atrasos de habilitação',
  },
  en: {
    place: 'Marking: one variable per place',
    pending: 'Tokens landing at the end of the scan',
    fired: 'Transitions fired this scan',
    timer: 'Enabling delays',
  },
} as const;

export function initText(d: Decl, trueLit = 'TRUE'): string {
  if (d.init === undefined || d.init === false || d.init === 0) return '';
  return ` := ${d.init === true ? trueLit : d.init}`;
}

function declLines(decls: Decl[], indent: string): string[] {
  const width = Math.max(...decls.map((d) => d.name.length));
  return decls.map((d) => {
    const comment = d.comment ? ` (* ${safeComment(d.comment)} *)` : '';
    return `${indent}${d.name.padEnd(width)} : ${TYPE[d.type]}${initText(d)};${comment}`;
  });
}

export const inputDecls = (p: Program) => p.decls.filter((d) => d.group === 'reset' || d.group === 'input');
export const outputDecls = (p: Program) => p.decls.filter((d) => d.group === 'output');
export const localGroups = (p: Program) =>
  (['place', 'pending', 'fired', 'timer'] as const)
    .map((group) => ({ group, decls: p.decls.filter((d) => d.group === group) }))
    .filter((g) => g.decls.length > 0);

/** Statements only — also the body of the PLCopen XML export. */
export function iecBody(prog: Program): string[] {
  const st = IEC_ST;
  const sec = sections(prog);
  const lines = [
    `IF ${prog.reset} THEN`,
    st.indent + st.comment(sec.init.title),
    ...printStmts(sec.init.stmts, st, 1),
    'ELSE',
  ];
  sec.scan.forEach((s, i) => {
    if (i) lines.push('');
    lines.push(st.indent + st.comment(s.title), ...printStmts(s.stmts, st, 1));
  });
  lines.push('END_IF;', '', st.comment(sec.outputs.title), ...printStmts(sec.outputs.stmts, st, 0));
  return lines;
}

export function commentBlock(lines: string[]): string[] {
  return ['(*', ...lines.map((l) => (l ? `  ${safeComment(l)}` : '')), '*)'];
}

export function printIec(prog: Program, dialect: Dialect = 'iec'): string {
  const lines = [...commentBlock(headerLines(prog, dialect)), `FUNCTION_BLOCK ${prog.fbName}`];
  const ins = inputDecls(prog);
  const outs = outputDecls(prog);
  lines.push('VAR_INPUT', ...declLines(ins, '    '), 'END_VAR');
  if (outs.length) lines.push('VAR_OUTPUT', ...declLines(outs, '    '), 'END_VAR');
  const groups = localGroups(prog);
  if (groups.length) {
    lines.push('VAR');
    groups.forEach(({ group, decls }, i) => {
      if (i) lines.push('');
      lines.push(
        `    (* ${GROUP_TITLE[prog.lang][group as keyof (typeof GROUP_TITLE)['pt']]} *)`,
        ...declLines(decls, '    '),
      );
    });
    lines.push('END_VAR');
  }
  lines.push('', ...iecBody(prog), 'END_FUNCTION_BLOCK', '');
  return lines.join('\n');
}
