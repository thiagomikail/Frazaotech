// Writes the generated code for every example to a folder, for eyeballing and syntax checks.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { examples } from '../../src/petri/model/examples';
import { compile } from '../../src/petri/model/net';
import { analyze } from '../../src/petri/model/analyze';
import { DIALECTS, generateCode } from '../../src/petri/codegen';

const out = process.argv[2] ?? 'generated';
mkdirSync(out, { recursive: true });
for (const lang of ['pt', 'en'] as const)
  for (const ex of examples(lang)) {
    const c = compile(ex.net);
    const files = generateCode(c, analyze(c), DIALECTS, { fbName: `FB_${ex.net.name}`, lang, date: '2026-10-18' });
    for (const f of files) writeFileSync(join(out, `${lang}_${ex.id}_${f.filename}`), f.content);
  }
console.log('ok');
