import { AlertTriangle, CheckCircle2, CircleHelp, Eye, Sparkles, XCircle } from 'lucide-react';
import type React from 'react';
import { useT, type TKey } from '../i18n';
import { placeIsBool } from '../model/analyze';
import type { Issue } from '../model/net';
import { useActions } from '../state/actions';
import { useDerived, useStore } from '../state/store';

function Verdict({ ok, label, help }: { ok: boolean | null; label: string; help: string }) {
  const t = useT();
  const Icon = ok === null ? CircleHelp : ok ? CheckCircle2 : XCircle;
  const tone = ok === null ? 'text-slate-400' : ok ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon size={15} className={tone} />
        <span className="text-sm font-medium text-slate-100">{label}</span>
        <span className={`ml-auto text-xs ${tone}`}>{t(ok === null ? 'an.unknown' : ok ? 'an.yes' : 'an.no')}</span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">{help}</p>
    </div>
  );
}

export function issueText(t: ReturnType<typeof useT>, i: Issue) {
  return t(`issue.${i.code}` as TKey, i.params);
}

export default function AnalysisPanel({ onShowNet }: { onShowNet?: () => void }) {
  const { state, dispatch } = useStore();
  const { compiled, analysis: a } = useDerived();
  const actions = useActions();
  const t = useT();
  const errors = compiled.issues.filter((i) => i.level === 'error');
  const warnings = compiled.issues.filter((i) => i.level === 'warning');
  const empty = compiled.places.length + compiled.transitions.length === 0;

  const select = (target?: string) => {
    if (!target) return;
    const kind = compiled.pIndex.has(target)
      ? 'place'
      : compiled.tIndex.has(target)
        ? 'transition'
        : state.net.arcs.some((x) => x.id === target)
          ? 'arc'
          : null;
    if (kind) dispatch({ type: 'ui/select', selection: { kind, id: target } });
  };

  const showMarking = (marking: Record<string, number>) => {
    dispatch({ type: 'sim/run', running: false });
    dispatch({ type: 'sim/set', sim: { ...state.sim, marking, timerStart: {}, lastFired: [] } });
    onShowNet?.();
  };

  const markingText = (m: Record<string, number>) =>
    Object.entries(m)
      .filter(([, v]) => v > 0)
      .map(([p, v]) => (v > 1 ? `${p}×${v}` : p))
      .join(' + ') || '∅';

  const unbounded = Object.entries(a.bounds)
    .filter(([, b]) => b === null)
    .map(([p]) => p);
  const problems = [
    ...errors.map((i) => issueText(t, i)),
    ...(a.deadlockCount ? [t('an.fixDeadlock', { marking: markingText(a.deadlocks[0].marking) })] : []),
    ...(unbounded.length ? [t('an.fixUnbounded', { places: unbounded.join(', ') })] : []),
    ...a.deadTransitions.map((id) => t('an.fixDead', { id })),
  ];
  const clean = !empty && errors.length === 0 && a.bounded === true && a.deadlockCount === 0 && a.reversible === true;

  if (empty) return <p className="p-4 text-sm text-slate-400">{t('canvas.empty')}</p>;

  return (
    <div className="h-full space-y-4 overflow-y-auto p-3" data-testid="analysis">
      <p className="text-xs leading-relaxed text-slate-500">{t('an.subtitle')}</p>

      <div className="grid grid-cols-2 gap-2">
        <Verdict ok={a.bounded} label={t('an.bounded')} help={t('an.boundedHelp')} />
        <Verdict ok={a.safe} label={t('an.safe')} help={t('an.safeHelp')} />
        <Verdict
          ok={a.truncated && a.deadlockCount === 0 ? null : a.deadlockCount === 0}
          label={t('an.deadlock')}
          help={t('an.deadlockHelp')}
        />
        <Verdict ok={a.reversible} label={t('an.reversible')} help={t('an.reversibleHelp')} />
      </div>
      <p className="font-mono text-[11px] text-slate-500">
        {t('an.states', { n: a.states })}
        {a.truncated && <span className="text-amber-400"> · {t('an.truncated', { n: a.states })}</span>}
      </p>

      {clean && (
        <div
          className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-sm text-emerald-100"
          data-testid="analysis-clean"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          {t('an.allGood')}
        </div>
      )}

      {problems.length > 0 && (
        <button
          onClick={() => void actions.send(t('an.fixPrompt', { problems: problems.join('; ') }))}
          disabled={Boolean(state.busy)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-100 hover:bg-sky-500/20 disabled:opacity-40"
        >
          <Sparkles size={14} />
          {t('an.askFix')}
        </button>
      )}

      {errors.length > 0 && (
        <List title={t('an.errors')} tone="error">
          {errors.map((i, k) => (
            <Item key={k} onClick={() => select(i.target)}>
              {issueText(t, i)}
            </Item>
          ))}
        </List>
      )}

      {a.deadlockCount > 0 && (
        <List title={`${t('an.deadlocks')} (${a.deadlockCount})`} tone="error">
          {a.deadlocks.map((d, k) => (
            <li key={k} className="rounded-md border border-slate-800 p-2 text-xs text-slate-300">
              <div className="font-mono">{t('an.deadlockAt', { marking: markingText(d.marking) })}</div>
              <div className="mt-0.5 text-slate-500">
                {d.path.length ? t('an.deadlockPath', { path: d.path.join(' → ') }) : t('an.initial')}
              </div>
              <button
                onClick={() => showMarking(d.marking)}
                className="mt-1 flex items-center gap-1 text-sky-300 hover:text-sky-200"
              >
                <Eye size={12} />
                {t('an.show')}
              </button>
            </li>
          ))}
        </List>
      )}

      {a.deadTransitions.length > 0 && (
        <List title={t('an.dead')} tone="warn">
          {a.deadTransitions.map((id) => (
            <Item key={id} onClick={() => select(id)}>
              <span className="font-mono">{id}</span>{' '}
              {(() => {
                const name = compiled.transitions.find((x) => x.id === id)?.name;
                return name && name !== id ? name : '';
              })()}
            </Item>
          ))}
        </List>
      )}

      {a.conflicts.length > 0 && (
        <List title={t('an.conflicts')} tone="info">
          {a.conflicts.map((c) => (
            <li key={c.place} className="rounded-md border border-slate-800 p-2 text-xs text-slate-300">
              <div>{t('an.conflictOn', { transitions: c.transitions.join(', '), place: c.place })}</div>
              <div className="mt-0.5 text-slate-500">
                {c.exclusive === true
                  ? t('an.exclusive')
                  : c.exclusive === false
                    ? t('an.priority', { winner: c.winner })
                    : t('an.priorityUnknown', { winner: c.winner })}
              </div>
            </li>
          ))}
        </List>
      )}

      {warnings.length > 0 && (
        <List title={t('an.warnings')} tone="warn">
          {warnings.map((i, k) => (
            <Item key={k} onClick={() => select(i.target)}>
              {issueText(t, i)}
            </Item>
          ))}
        </List>
      )}

      <div>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('an.bounds')}</h3>
        <table className="w-full text-xs">
          <tbody>
            {compiled.places.map((p, i) => {
              const b = a.bounds[p.id];
              const bool = placeIsBool(compiled, a, i);
              return (
                <tr key={p.id} className="border-t border-slate-800">
                  <td className="py-1 pr-2 font-mono text-slate-400">{p.id}</td>
                  <td className="py-1 pr-2 text-slate-200">{p.name !== p.id ? p.name : ''}</td>
                  <td className="py-1 pr-2 text-right font-mono text-slate-300">
                    {b === null ? <span className="text-red-300">{t('an.infinite')}</span> : `${t('an.max')} ${b}`}
                  </td>
                  <td className={`py-1 text-right font-mono ${bool ? 'text-sky-300' : 'text-amber-300'}`}>
                    {bool ? 'BOOL' : 'INT'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function List({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'error' | 'warn' | 'info';
  children: React.ReactNode;
}) {
  const Icon = tone === 'error' ? XCircle : tone === 'warn' ? AlertTriangle : CircleHelp;
  const color = tone === 'error' ? 'text-red-400' : tone === 'warn' ? 'text-amber-400' : 'text-sky-400';
  return (
    <div>
      <h3 className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${color}`}>
        <Icon size={13} />
        {title}
      </h3>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function Item({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full rounded-md border border-slate-800 p-2 text-left text-xs text-slate-300 hover:border-slate-600"
      >
        {children}
      </button>
    </li>
  );
}
