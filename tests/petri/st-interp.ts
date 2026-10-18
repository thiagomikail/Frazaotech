/**
 * A tiny interpreter for the IEC ST subset PetriPLC generates — just enough to
 * execute the function block and compare it, scan by scan, with the simulator.
 * Not shipped; tests only.
 */

type Value = boolean | number;

interface Tok {
  t: 'id' | 'num' | 'time' | 'op' | 'end';
  v: string;
}

const KEYWORDS = new Set(['AND', 'OR', 'XOR', 'NOT', 'TRUE', 'FALSE', 'IF', 'THEN', 'ELSE', 'END_IF', 'MOD']);

function tokenize(src: string): Tok[] {
  const code = src.replace(/\(\*[\s\S]*?\*\)/g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const toks: Tok[] = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const time = /^T#([0-9a-z]+)/i.exec(code.slice(i));
    if (time) {
      toks.push({ t: 'time', v: time[1] });
      i += time[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j++;
      toks.push({ t: 'id', v: code.slice(i, j) });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < code.length && /[0-9]/.test(code[j])) j++;
      toks.push({ t: 'num', v: code.slice(i, j) });
      i = j;
      continue;
    }
    const two = code.slice(i, i + 2);
    if ([':=', '>=', '<=', '<>'].includes(two)) {
      toks.push({ t: 'op', v: two });
      i += 2;
      continue;
    }
    if ('();:,.+-<>='.includes(c)) {
      toks.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new Error(`st-interp: unexpected "${c}"`);
  }
  toks.push({ t: 'end', v: '' });
  return toks;
}

function parseTime(lit: string): number {
  let ms = 0;
  const re = /(\d+)(ms|d|h|m|s)/gi;
  let m: RegExpExecArray | null;
  let consumed = '';
  while ((m = re.exec(lit))) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    ms += n * { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1000, ms: 1 }[unit as 'd']!;
    consumed += m[0];
  }
  if (consumed.length !== lit.length) throw new Error(`st-interp: bad TIME literal T#${lit}`);
  return ms;
}

type Expr =
  | { k: 'lit'; v: Value }
  | { k: 'var'; name: string }
  | { k: 'member'; name: string; member: string }
  | { k: 'un'; op: 'NOT' | '-'; e: Expr }
  | { k: 'bin'; op: string; a: Expr; b: Expr };

type Stmt =
  | { k: 'assign'; name: string; e: Expr }
  | { k: 'if'; cond: Expr; then: Stmt[]; else: Stmt[] }
  | { k: 'call'; name: string; args: Record<string, Expr> };

interface VarDecl {
  name: string;
  type: string;
  init?: Value;
  section: string;
}

interface Timer {
  running: boolean;
  start: number;
  Q: boolean;
  ET: number;
}

export class FunctionBlock {
  name = '';
  vars = new Map<string, VarDecl>();
  private values = new Map<string, Value>();
  private timers = new Map<string, Timer>();
  private body: Stmt[] = [];
  private toks: Tok[] = [];
  private p = 0;
  now = 0;

  constructor(src: string) {
    this.toks = tokenize(src);
    this.parseUnit();
    this.reset();
  }

  /** Cold start: every variable back to its declared initial value. */
  reset() {
    for (const d of this.vars.values()) {
      const key = d.name.toLowerCase();
      if (d.type === 'TON') this.timers.set(key, { running: false, start: 0, Q: false, ET: 0 });
      else this.values.set(key, d.init ?? (d.type === 'BOOL' ? false : 0));
    }
  }

  set(name: string, v: Value) {
    const key = name.toLowerCase();
    if (!this.values.has(key)) throw new Error(`st-interp: no variable ${name}`);
    this.values.set(key, v);
  }

  get(name: string): Value {
    const key = name.toLowerCase();
    if (!this.values.has(key)) throw new Error(`st-interp: no variable ${name}`);
    return this.values.get(key)!;
  }

  run() {
    this.exec(this.body);
  }

  // ─── parsing ───────────────────────────────────────────────────────────────

  private peek(): Tok {
    return this.toks[this.p];
  }
  private next(): Tok {
    return this.toks[this.p++];
  }
  private isWord(w: string) {
    const t = this.peek();
    return t.t === 'id' && t.v.toUpperCase() === w;
  }
  private expectWord(w: string) {
    if (!this.isWord(w)) throw new Error(`st-interp: expected ${w}, got "${this.peek().v}"`);
    this.p++;
  }
  private isOp(o: string) {
    const t = this.peek();
    return t.t === 'op' && t.v === o;
  }
  private expectOp(o: string) {
    if (!this.isOp(o)) throw new Error(`st-interp: expected "${o}", got "${this.peek().v}"`);
    this.p++;
  }

  private parseUnit() {
    this.expectWord('FUNCTION_BLOCK');
    this.name = this.next().v;
    while (['VAR_INPUT', 'VAR_OUTPUT', 'VAR'].some((w) => this.isWord(w))) {
      const section = this.next().v.toUpperCase();
      while (!this.isWord('END_VAR')) {
        const name = this.next().v;
        this.expectOp(':');
        const type = this.next().v.toUpperCase();
        let init: Value | undefined;
        if (this.isOp(':=')) {
          this.p++;
          const lit = this.parseExpr();
          init = this.eval(lit);
        }
        this.expectOp(';');
        if (this.vars.has(name.toLowerCase())) throw new Error(`st-interp: ${name} declared twice`);
        this.vars.set(name.toLowerCase(), { name, type, init, section });
      }
      this.expectWord('END_VAR');
    }
    this.body = this.parseStmts(['END_FUNCTION_BLOCK']);
    this.expectWord('END_FUNCTION_BLOCK');
  }

  private parseStmts(until: string[]): Stmt[] {
    const out: Stmt[] = [];
    while (!until.some((w) => this.isWord(w))) {
      if (this.peek().t === 'end') throw new Error('st-interp: unexpected end of code');
      out.push(this.parseStmt());
    }
    return out;
  }

  private parseStmt(): Stmt {
    if (this.isWord('IF')) {
      this.p++;
      const cond = this.parseExpr();
      this.expectWord('THEN');
      const then = this.parseStmts(['ELSE', 'END_IF']);
      let els: Stmt[] = [];
      if (this.isWord('ELSE')) {
        this.p++;
        els = this.parseStmts(['END_IF']);
      }
      this.expectWord('END_IF');
      this.expectOp(';');
      return { k: 'if', cond, then, else: els };
    }
    const name = this.next().v;
    if (!this.vars.has(name.toLowerCase())) throw new Error(`st-interp: undeclared ${name}`);
    if (this.isOp('(')) {
      this.p++;
      const args: Record<string, Expr> = {};
      while (!this.isOp(')')) {
        const param = this.next().v.toUpperCase();
        this.expectOp(':=');
        args[param] = this.parseExpr();
        if (this.isOp(',')) this.p++;
      }
      this.expectOp(')');
      this.expectOp(';');
      return { k: 'call', name, args };
    }
    this.expectOp(':=');
    const e = this.parseExpr();
    this.expectOp(';');
    return { k: 'assign', name, e };
  }

  private parseExpr(): Expr {
    return this.binary(['OR'], () => this.binary(['XOR'], () => this.binary(['AND'], () => this.parseCmp())));
  }

  private binary(ops: string[], next: () => Expr): Expr {
    let a = next();
    while (ops.some((o) => this.isWord(o))) {
      const op = this.next().v.toUpperCase();
      a = { k: 'bin', op, a, b: next() };
    }
    return a;
  }

  private parseCmp(): Expr {
    const a = this.parseAdd();
    for (const op of ['>=', '<=', '<>', '<', '>', '='])
      if (this.isOp(op)) {
        this.p++;
        return { k: 'bin', op, a, b: this.parseAdd() };
      }
    return a;
  }

  private parseAdd(): Expr {
    let a = this.parseUnary();
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.next().v;
      a = { k: 'bin', op, a, b: this.parseUnary() };
    }
    return a;
  }

  private parseUnary(): Expr {
    if (this.isWord('NOT')) {
      this.p++;
      return { k: 'un', op: 'NOT', e: this.parseUnary() };
    }
    if (this.isOp('-')) {
      this.p++;
      return { k: 'un', op: '-', e: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const t = this.next();
    if (t.t === 'op' && t.v === '(') {
      const e = this.parseExpr();
      this.expectOp(')');
      return e;
    }
    if (t.t === 'num') return { k: 'lit', v: Number(t.v) };
    if (t.t === 'time') return { k: 'lit', v: parseTime(t.v) };
    if (t.t === 'id') {
      const up = t.v.toUpperCase();
      if (up === 'TRUE' || up === 'FALSE') return { k: 'lit', v: up === 'TRUE' };
      if (KEYWORDS.has(up)) throw new Error(`st-interp: unexpected keyword ${t.v}`);
      if (this.isOp('.')) {
        this.p++;
        return { k: 'member', name: t.v, member: this.next().v.toUpperCase() };
      }
      if (!this.vars.has(t.v.toLowerCase())) throw new Error(`st-interp: undeclared ${t.v}`);
      return { k: 'var', name: t.v };
    }
    throw new Error(`st-interp: unexpected "${t.v}"`);
  }

  // ─── execution ─────────────────────────────────────────────────────────────

  private exec(stmts: Stmt[]) {
    for (const s of stmts) {
      if (s.k === 'assign') {
        const decl = this.vars.get(s.name.toLowerCase())!;
        const v = this.eval(s.e);
        if (decl.type === 'BOOL' && typeof v !== 'boolean') throw new Error(`st-interp: ${s.name} BOOL := ${v}`);
        if (decl.type === 'INT') {
          if (typeof v !== 'number') throw new Error(`st-interp: ${s.name} INT := ${v}`);
          if (v < -32768 || v > 32767) throw new Error(`st-interp: INT overflow in ${s.name}`);
        }
        this.values.set(s.name.toLowerCase(), v);
      } else if (s.k === 'if') {
        const c = this.eval(s.cond);
        if (typeof c !== 'boolean') throw new Error('st-interp: IF needs BOOL');
        this.exec(c ? s.then : s.else);
      } else {
        const decl = this.vars.get(s.name.toLowerCase())!;
        if (decl.type !== 'TON') throw new Error(`st-interp: ${s.name} is not a TON`);
        const input = this.eval(s.args.IN);
        const pt = this.eval(s.args.PT);
        if (typeof input !== 'boolean' || typeof pt !== 'number') throw new Error('st-interp: bad TON call');
        const tm = this.timers.get(s.name.toLowerCase())!;
        if (!input) Object.assign(tm, { running: false, Q: false, ET: 0 });
        else {
          if (!tm.running) Object.assign(tm, { running: true, start: this.now });
          tm.ET = Math.min(pt, this.now - tm.start);
          tm.Q = tm.ET >= pt;
        }
      }
    }
  }

  private eval(e: Expr): Value {
    switch (e.k) {
      case 'lit':
        return e.v;
      case 'var':
        return this.get(e.name);
      case 'member': {
        const tm = this.timers.get(e.name.toLowerCase());
        if (!tm) throw new Error(`st-interp: ${e.name} is not a timer`);
        if (e.member === 'Q') return tm.Q;
        if (e.member === 'ET') return tm.ET;
        throw new Error(`st-interp: unknown member ${e.member}`);
      }
      case 'un': {
        const v = this.eval(e.e);
        if (e.op === 'NOT') {
          if (typeof v !== 'boolean') throw new Error('st-interp: NOT needs BOOL');
          return !v;
        }
        if (typeof v !== 'number') throw new Error('st-interp: minus needs a number');
        return -v;
      }
      case 'bin': {
        const a = this.eval(e.a);
        const b = this.eval(e.b);
        if (['AND', 'OR', 'XOR'].includes(e.op)) {
          if (typeof a !== 'boolean' || typeof b !== 'boolean') throw new Error(`st-interp: ${e.op} needs BOOL`);
          return e.op === 'AND' ? a && b : e.op === 'OR' ? a || b : a !== b;
        }
        if (typeof a !== 'number' || typeof b !== 'number') throw new Error(`st-interp: ${e.op} needs numbers`);
        switch (e.op) {
          case '+':
            return a + b;
          case '-':
            return a - b;
          case '>=':
            return a >= b;
          case '<=':
            return a <= b;
          case '<':
            return a < b;
          case '>':
            return a > b;
          case '=':
            return a === b;
          case '<>':
            return a !== b;
        }
        throw new Error(`st-interp: unknown operator ${e.op}`);
      }
    }
  }
}
