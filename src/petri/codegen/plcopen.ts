import { iecBody, inputDecls, localGroups, outputDecls } from './iec';
import type { Decl, Program } from './ir';
import { headerLines } from './st';

/**
 * PLCopen XML (TC6 2.01), the exchange format CODESYS and TwinCAT import:
 * one function-block POU, interface declared as XML, body in ST.
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const XHTML = 'http://www.w3.org/1999/xhtml';

function typeXml(d: Decl): string {
  if (d.type === 'TIMER') return '<derived name="TON"/>';
  return d.type === 'BOOL' ? '<BOOL/>' : '<INT/>';
}

function variable(d: Decl, pad: string): string[] {
  const lines = [`${pad}<variable name="${esc(d.name)}">`, `${pad}  <type>${typeXml(d)}</type>`];
  if (d.init !== undefined && d.init !== false && d.init !== 0)
    lines.push(`${pad}  <initialValue><simpleValue value="${d.init === true ? 'TRUE' : d.init}"/></initialValue>`);
  if (d.comment) lines.push(`${pad}  <documentation><xhtml xmlns="${XHTML}">${esc(d.comment)}</xhtml></documentation>`);
  lines.push(`${pad}</variable>`);
  return lines;
}

export function printPlcopen(prog: Program, now = new Date()): string {
  const stamp = now.toISOString().slice(0, 19);
  const pad = '          ';
  const block = (tag: string, decls: Decl[]) =>
    decls.length ? [`        <${tag}>`, ...decls.flatMap((d) => variable(d, pad)), `        </${tag}>`] : [];
  const locals = localGroups(prog).flatMap((g) => g.decls);

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<project xmlns="http://www.plcopen.org/xml/tc6_0201">',
    `  <fileHeader companyName="FrazaoTech" productName="PetriPLC" productVersion="1.0" creationDateTime="${stamp}"/>`,
    `  <contentHeader name="${esc(prog.netName || prog.fbName)}" modificationDateTime="${stamp}">`,
    '    <coordinateInfo>',
    '      <fbd><scaling x="1" y="1"/></fbd>',
    '      <ld><scaling x="1" y="1"/></ld>',
    '      <sfc><scaling x="1" y="1"/></sfc>',
    '    </coordinateInfo>',
    '  </contentHeader>',
    '  <types>',
    '    <dataTypes/>',
    '    <pous>',
    `      <pou name="${esc(prog.fbName)}" pouType="functionBlock">`,
    '        <interface>',
    ...block('inputVars', inputDecls(prog)),
    ...block('outputVars', outputDecls(prog)),
    ...block('localVars', locals),
    '        </interface>',
    '        <body>',
    '          <ST>',
    `            <xhtml xmlns="${XHTML}">${esc(iecBody(prog).join('\n'))}</xhtml>`,
    '          </ST>',
    '        </body>',
    `        <documentation><xhtml xmlns="${XHTML}">${esc(headerLines(prog, 'plcopen').join('\n'))}</xhtml></documentation>`,
    '      </pou>',
    '    </pous>',
    '  </types>',
    '  <instances>',
    '    <configurations/>',
    '  </instances>',
    '</project>',
    '',
  ].join('\n');
}
