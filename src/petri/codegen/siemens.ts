import { GROUP_TITLE, initText, inputDecls, localGroups, outputDecls } from './iec';
import { timeLiteral, type Decl, type Program } from './ir';
import { headerLines, printStmts, sections, type StStyle } from './st';

/**
 * TIA Portal external source (.scl): "External source files → Add new
 * external file", then "Generate blocks from source". Optimized FB, local
 * variables with #, multi-instance TON_TIME timers.
 */
const lineComment = (text: string) => `// ${text.replace(/[\r\n]+/g, ' ')}`;

export const SIEMENS_SCL: StStyle = {
  ref: (n) => `#${n}`,
  trueLit: 'TRUE',
  falseLit: 'FALSE',
  timerDone: (t) => `#${t}.Q`,
  timerCall: (t, input, pt) => [`#${t}(IN := ${input}, PT := ${timeLiteral(pt)});`],
  comment: lineComment,
  indent: '    ',
};

const TYPE = { BOOL: 'Bool', INT: 'Int', TIMER: 'TON_TIME' } as const;

const ascii = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '');

/** REGION titles: plain ASCII, up to the first colon. */
const regionTitle = (title: string) => ascii(title.split(':')[0]).trim();

function declLines(decls: Decl[]): string[] {
  const width = Math.max(...decls.map((d) => d.name.length));
  return decls.map((d) => {
    const attr = d.type === 'TIMER' ? " {InstructionName := 'TON_TIME'; LibVersion := '1.0'}" : '';
    const comment = d.comment ? `   ${lineComment(d.comment)}` : '';
    return `      ${d.name.padEnd(width)}${attr} : ${TYPE[d.type]}${initText(d)};${comment}`;
  });
}

export function printSiemens(prog: Program): string {
  const st = SIEMENS_SCL;
  const sec = sections(prog);
  const lines = [
    `FUNCTION_BLOCK "${prog.fbName}"`,
    "{ S7_Optimized_Access := 'TRUE' }",
    'VERSION : 0.1',
    ...headerLines(prog, 'siemens').map((l) => `//${l ? ` ${l}` : ''}`),
    '   VAR_INPUT ',
    ...declLines(inputDecls(prog)),
    '   END_VAR',
    '',
  ];
  const outs = outputDecls(prog);
  if (outs.length) lines.push('   VAR_OUTPUT ', ...declLines(outs), '   END_VAR', '');
  const groups = localGroups(prog);
  if (groups.length) {
    lines.push('   VAR ');
    groups.forEach(({ group, decls }) => {
      lines.push(`      ${lineComment(GROUP_TITLE[group])}`, ...declLines(decls));
    });
    lines.push('   END_VAR', '');
  }

  const region = (title: string, body: string[], pad: string) => [
    `${pad}REGION ${regionTitle(title)}`,
    ...body,
    `${pad}END_REGION`,
  ];

  lines.push('BEGIN');
  lines.push(`    IF #${prog.reset} THEN`);
  lines.push(...region(sec.init.title, printStmts(sec.init.stmts, st, 3), '        '));
  lines.push('    ELSE');
  // The full title goes in a comment only when the REGION name had to drop part of it.
  const titled = (title: string, pad: string) => (regionTitle(title) === title ? [] : [`${pad}${lineComment(title)}`]);
  sec.scan.forEach((s, i) => {
    if (i) lines.push('');
    lines.push(...region(s.title, [...titled(s.title, '            '), ...printStmts(s.stmts, st, 3)], '        '));
  });
  lines.push('    END_IF;', '');
  lines.push(
    ...region(
      sec.outputs.title,
      [...titled(sec.outputs.title, '        '), ...printStmts(sec.outputs.stmts, st, 2)],
      '    ',
    ),
  );
  lines.push('END_FUNCTION_BLOCK', '');
  return lines.join('\n');
}
