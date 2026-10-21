import { AlertTriangle, Check, ChevronDown, Copy, Download, FileCode2, RefreshCw } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { DIALECTS, generateCode, sanitizeFbName, type Dialect } from '../codegen';
import { t, type TKey } from '../strings';
import { structuralJson, toIdent } from '../model/net';
import { useDerived, useStore } from '../state/store';
import { copyText, downloadText } from '../util/files';

const ST_TOKENS =
  /(\(\*[\s\S]*?\*\))|(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*')|(\bT#[0-9a-z_]+)|\b(IF|THEN|ELSE|ELSIF|END_IF|FUNCTION_BLOCK|END_FUNCTION_BLOCK|VAR_INPUT|VAR_OUTPUT|VAR|END_VAR|AND|OR|NOT|XOR|TRUE|FALSE|BEGIN|REGION|END_REGION|VERSION|BOOL|INT|DINT|TON|TONR|TON_TIME|FBD_TIMER)\b|(\b\d+\b)|(#[A-Za-z_]\w*)/gi;
const XML_TOKENS = /(<!--[\s\S]*?-->)|(<\/?[\w:.-]+)|(\s[\w:.-]+=)("[^"]*")|(\/?>)/g;

/** Small, dependency-free highlighter: comments, keywords, literals. */
function highlight(code: string, xml: boolean): React.ReactNode[] {
  const re = xml ? XML_TOKENS : ST_TOKENS;
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of code.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push(code.slice(last, at));
    let cls = '';
    if (xml)
      cls = m[1] ? 'text-slate-500' : m[2] || m[5] ? 'text-sky-300' : m[3] ? 'text-amber-200' : 'text-emerald-300';
    else
      cls =
        m[1] || m[2]
          ? 'text-slate-500'
          : m[3]
            ? 'text-emerald-300'
            : m[4] || m[6]
              ? 'text-amber-300'
              : m[5]
                ? 'text-sky-300 font-semibold'
                : 'text-violet-200';
    out.push(
      <span key={k++} className={cls}>
        {m[0]}
      </span>,
    );
    last = at + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export default function CodePanel() {
  const { state, dispatch } = useStore();
  const { compiled, analysis } = useDerived();
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(!state.generated);

  const errors = compiled.issues.filter((i) => i.level === 'error');
  const warnings =
    compiled.issues.filter((i) => i.level === 'warning').length +
    analysis.deadlockCount +
    (analysis.bounded === false ? 1 : 0);
  const defaultName = `FB_${toIdent(state.net.name || 'PetriNet')}`;
  const netKey = useMemo(() => structuralJson(state.net), [state.net]);
  const generated = state.generated;
  const stale = generated && generated.netKey !== netKey;
  const empty = compiled.places.length + compiled.transitions.length === 0;
  const unbounded = Object.entries(analysis.bounds)
    .filter(([, b]) => b === null)
    .map(([p]) => p);

  const toggle = (d: Dialect) =>
    dispatch({
      type: 'code/dialects',
      dialects: state.dialects.includes(d) ? state.dialects.filter((x) => x !== d) : [...state.dialects, d],
    });

  const generate = () => {
    const files = generateCode(compiled, analysis, state.dialects, {
      fbName: sanitizeFbName(state.fbName || defaultName),
      date: new Date().toISOString().slice(0, 10),
    });
    dispatch({ type: 'code/generated', generated: { files, netKey } });
    setActive(0);
    setShowOptions(false);
  };

  const file = generated?.files[Math.min(active, (generated?.files.length ?? 1) - 1)];
  const lines = file ? file.content.split('\n').length : 0;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="code-panel">
      <div className="space-y-3 border-b border-slate-800 p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-100">{t('code.title')}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{t('code.subtitle')}</p>
          </div>
          {generated && (
            <button
              onClick={() => setShowOptions((v) => !v)}
              aria-expanded={showOptions}
              className="flex shrink-0 items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              {t('code.options')}
              <ChevronDown size={12} className={showOptions ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
        {showOptions && (
          <>
            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-slate-400">{t('code.targets')}</legend>
              <div className="grid gap-1.5">
                {DIALECTS.map((d) => (
                  <label
                    key={d}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 ${
                      state.dialects.includes(d)
                        ? 'border-sky-500/60 bg-sky-500/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={state.dialects.includes(d)}
                      onChange={() => toggle(d)}
                      className="mt-0.5 h-4 w-4 accent-sky-500"
                      data-testid={`dialect-${d}`}
                    />
                    <span>
                      <span className="block text-sm text-slate-100">{t(`dialect.${d}` as TKey)}</span>
                      <span className="block text-[11px] text-slate-500">{t(`dialect.${d}.help` as TKey)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">{t('code.fbName')}</span>
              <input
                value={state.fbName}
                placeholder={defaultName}
                onChange={(e) => dispatch({ type: 'code/fbName', fbName: e.target.value })}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </label>
          </>
        )}

        {errors.length > 0 ? (
          <p className="flex items-start gap-1.5 text-xs text-red-300">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {t('code.blocked')}
          </p>
        ) : (
          <>
            {unbounded.length > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-red-300">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {t('code.unbounded', { places: unbounded.join(', ') })}
              </p>
            )}
            {warnings > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-amber-300">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {t('code.warn', { n: warnings })}
              </p>
            )}
          </>
        )}
        {state.dialects.length === 0 && <p className="text-xs text-amber-300">{t('code.pick')}</p>}

        <button
          onClick={generate}
          disabled={empty || errors.length > 0 || state.dialects.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-40"
          data-testid="code-generate"
        >
          {generated ? <RefreshCw size={15} /> : <FileCode2 size={15} />}
          {t(generated ? 'code.regenerate' : 'code.generate')}
        </button>
        {stale && <p className="text-center text-xs text-amber-300">{t('code.stale')}</p>}
      </div>

      {generated && file && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 px-2 pt-2">
            {generated.files.map((f, i) => (
              <button
                key={f.filename}
                onClick={() => setActive(i)}
                className={`rounded-t-md px-2.5 py-1.5 text-xs ${
                  f === file ? 'bg-slate-950 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
                data-testid={`code-tab-${f.dialect}`}
              >
                {t(`dialect.${f.dialect}.short` as TKey)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-slate-950 px-3 py-2 text-xs">
            <span className="font-mono text-slate-300">{file.filename}</span>
            <span className="text-slate-600">{t('code.lines', { n: lines })}</span>
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={async () => {
                  if (await copyText(file.content)) {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }
                }}
                className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-slate-200 hover:bg-slate-800"
                data-testid="code-copy"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {t(copied ? 'code.copied' : 'code.copy')}
              </button>
              <button
                onClick={() =>
                  downloadText(
                    file.filename,
                    file.content,
                    file.dialect === 'plcopen' ? 'application/xml' : 'text/plain;charset=utf-8',
                  )
                }
                className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-slate-200 hover:bg-slate-800"
              >
                <Download size={12} />
                {t('code.download')}
              </button>
              {generated.files.length > 1 && (
                <button
                  onClick={() =>
                    generated.files.forEach((f, i) =>
                      window.setTimeout(
                        () =>
                          downloadText(
                            f.filename,
                            f.content,
                            f.dialect === 'plcopen' ? 'application/xml' : 'text/plain;charset=utf-8',
                          ),
                        i * 400,
                      ),
                    )
                  }
                  className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-slate-200 hover:bg-slate-800"
                >
                  <Download size={12} />
                  {t('code.downloadAll')}
                </button>
              )}
            </div>
          </div>
          <p className="bg-slate-950 px-3 pb-2 text-[11px] text-slate-500">{t(`howto.${file.dialect}` as TKey)}</p>
          <div
            className="flex min-h-0 flex-1 overflow-auto bg-slate-950 font-mono text-[12px] leading-[1.55]"
            data-testid="code-view"
          >
            <pre className="select-none border-r border-slate-800 px-2 py-2 text-right text-slate-600">
              {Array.from({ length: lines }, (_, i) => i + 1).join('\n')}
            </pre>
            <pre className="min-w-0 flex-1 px-3 py-2 text-slate-200">
              {highlight(file.content, file.dialect === 'plcopen')}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
