import type { Analysis } from '../model/analyze';
import type { CompiledNet } from '../model/net';
import { printIec } from './iec';
import { buildProgram, sanitizeFbName, type BuildOptions } from './ir';
import { printPlcopen } from './plcopen';
import { printRockwell } from './rockwell';
import { printSiemens } from './siemens';
import { DIALECT_LABEL, type Dialect } from './st';

export { DIALECT_LABEL, sanitizeFbName, type Dialect };

export const DIALECTS: Dialect[] = ['iec', 'siemens', 'rockwell', 'plcopen'];

export interface GeneratedFile {
  dialect: Dialect;
  filename: string;
  content: string;
}

export function generateCode(c: CompiledNet, a: Analysis, dialects: Dialect[], opts: BuildOptions): GeneratedFile[] {
  const prog = buildProgram(c, a, { ...opts, fbName: sanitizeFbName(opts.fbName) });
  const name = prog.fbName;
  return DIALECTS.filter((d) => dialects.includes(d)).map((dialect) => {
    switch (dialect) {
      case 'iec':
        return { dialect, filename: `${name}.st`, content: printIec(prog) };
      case 'siemens':
        return { dialect, filename: `${name}.scl`, content: printSiemens(prog) };
      case 'rockwell':
        return { dialect, filename: `${name}_Studio5000.st`, content: printRockwell(prog) };
      case 'plcopen':
        return { dialect, filename: `${name}.xml`, content: printPlcopen(prog) };
    }
  });
}
