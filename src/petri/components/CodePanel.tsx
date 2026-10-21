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

/** Small, dependency-free highlighter in Xcode's colors: comments, keywords, literals. */
function highlight(code: string, xml: boolean): React.ReactNode[] {
  const re = xml ? XML_TOKENS : ST_TOKENS;
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of code.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push(code.slice(last, at));
    let cls = '';
    if (xml) cls = m[1] ? 'text-ink-3' : m[2] || m[5] ? 'text-purple-ink' : m[3] ? 'text-orange-ink' : 'text-red-ink';
    else
      cls =
        m[1] || m[2]
          ? 'text-ink-3'
          : m[3]
            ? 'text-red-ink'
            : m[4] || m[6]
              ? 'text-indigo-ink'
              : m[5]
                ? 'text-purple-ink font-semibold'
                : 'text-accent';
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
      <div className="m-2 overflow-hidden rounded-sm border border-line bg-surface">
        <div className="flex h-8 items-center gap-2 border-b border-line bg-strip pl-3 pr-1">
          <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
            {t('code.title')}
          </h3>
          {generated && (
            <button
              onClick={() => setShowOptions((v) => !v)}
              aria-expanded={showOptions}
              className="flex h-6 shrink-0 items-center gap-1 rounded-sm border border-line bg-raised px-2 text-[10px] font-bold uppercase tracking-[0.04em] text-ink transition-colors hover:bg-fill-strong"
            >
              {t('code.options')}
              <ChevronDown size={12} className={`transition-transform ${showOptions ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        <div className="space-y-3 p-3">
          <p className="text-[12px] leading-snug text-ink-2">{t('code.subtitle')}</p>
          {showOptions && (
            <>
              <fieldset>
                <legend className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">
                  {t('code.targets')}
                </legend>
                <div className="divide-y divide-line overflow-hidden rounded-sm border border-line bg-field">
                  {DIALECTS.map((d) => (
                    <label
                      key={d}
                      className={`flex cursor-pointer items-start gap-2.5 border-l-4 px-2.5 py-2 transition-colors ${
                        state.dialects.includes(d)
                          ? 'border-l-accent bg-accent/8'
                          : 'border-l-transparent hover:bg-fill'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={state.dialects.includes(d)}
                        onChange={() => toggle(d)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                        data-testid={`dialect-${d}`}
                      />
                      <span>
                        <span className="block text-[13px] font-semibold text-ink">{t(`dialect.${d}` as TKey)}</span>
                        <span className="block text-[11px] leading-snug text-ink-2">
                          {t(`dialect.${d}.help` as TKey)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">
                  {t('code.fbName')}
                </span>
                <input
                  value={state.fbName}
                  placeholder={defaultName}
                  onChange={(e) => dispatch({ type: 'code/fbName', fbName: e.target.value })}
                  className="w-full rounded-sm border border-line bg-field px-2 py-1.5 font-mono text-[12px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
                />
              </label>
            </>
          )}

          {errors.length > 0 ? (
            <p className="flex items-start gap-1.5 text-[12px] leading-snug text-red-ink">
              <AlertTriangle size={14} className="mt-px shrink-0" />
              {t('code.blocked')}
            </p>
          ) : (
            <>
              {unbounded.length > 0 && (
                <p className="flex items-start gap-1.5 text-[12px] leading-snug text-red-ink">
                  <AlertTriangle size={14} className="mt-px shrink-0" />
                  {t('code.unbounded', { places: unbounded.join(', ') })}
                </p>
              )}
              {warnings > 0 && (
                <p className="flex items-start gap-1.5 text-[12px] leading-snug text-orange-ink">
                  <AlertTriangle size={14} className="mt-px shrink-0" />
                  {t('code.warn', { n: warnings })}
                </p>
              )}
            </>
          )}
          {state.dialects.length === 0 && <p className="text-[12px] text-orange-ink">{t('code.pick')}</p>}

          <button
            onClick={generate}
            disabled={empty || errors.length > 0 || state.dialects.length === 0}
            className="flex h-8 w-full items-center justify-center gap-2 rounded-sm border border-accent-hover bg-accent px-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-40"
            data-testid="code-generate"
          >
            {generated ? <RefreshCw size={15} /> : <FileCode2 size={15} />}
            {t(generated ? 'code.regenerate' : 'code.generate')}
          </button>
          {stale && <p className="text-center text-[12px] text-orange-ink">{t('code.stale')}</p>}
        </div>
      </div>

      {generated && file && (
        <div className="mx-2 mb-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-line bg-surface">
          <div className="flex h-8 shrink-0 divide-x divide-line border-b border-line bg-strip">
            {generated.files.map((f, i) => (
              <button
                key={f.filename}
                onClick={() => setActive(i)}
                className={`flex-1 px-2 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors ${
                  f === file ? 'bg-thumb text-on-thumb' : 'text-ink-2 hover:bg-fill'
                }`}
                data-testid={`code-tab-${f.dialect}`}
              >
                {t(`dialect.${f.dialect}.short` as TKey)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-[12px]">
            <span className="font-mono text-ink">{file.filename}</span>
            <span className="text-ink-3">{t('code.lines', { n: lines })}</span>
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={async () => {
                  if (await copyText(file.content)) {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }
                }}
                className="flex items-center gap-1 rounded-sm border border-line bg-raised px-2 h-7 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink transition-colors hover:bg-fill-strong"
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
                className="flex items-center gap-1 rounded-sm border border-line bg-raised px-2 h-7 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink transition-colors hover:bg-fill-strong"
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
                  className="flex items-center gap-1 rounded-sm border border-line bg-raised px-2 h-7 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink transition-colors hover:bg-fill-strong"
                >
                  <Download size={12} />
                  {t('code.downloadAll')}
                </button>
              )}
            </div>
          </div>
          <p className="px-3 pb-2 text-[11px] leading-snug text-ink-2">{t(`howto.${file.dialect}` as TKey)}</p>
          <div
            className="flex min-h-0 flex-1 overflow-auto border-t border-line bg-field font-mono text-[12px] leading-[1.55]"
            data-testid="code-view"
          >
            <pre className="select-none border-r border-line bg-strip px-2 py-2 text-right text-ink-3">
              {Array.from({ length: lines }, (_, i) => i + 1).join('\n')}
            </pre>
            <pre className="min-w-0 flex-1 px-3 py-2 text-ink">
              {highlight(file.content, file.dialect === 'plcopen')}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
