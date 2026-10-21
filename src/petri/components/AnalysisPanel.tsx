import { AlertTriangle, CheckCircle2, ChevronRight, CircleHelp, Eye, Sparkles, XCircle } from 'lucide-react';
import type React from 'react';
import { t, type TKey } from '../strings';
import { placeIsBool } from '../model/analyze';
import type { Issue } from '../model/net';
import { useActions } from '../state/actions';
import { useDerived, useStore } from '../state/store';

function Verdict({ ok, label, help }: { ok: boolean | null; label: string; help: string }) {
  const Icon = ok === null ? CircleHelp : ok ? CheckCircle2 : XCircle;
  const icon = ok === null ? 'text-ink-3' : ok ? 'text-green' : 'text-red';
  const tone = ok === null ? 'text-ink-3' : ok ? 'text-green-ink' : 'text-red-ink';
  return (
    <div className="rounded-xl bg-surface p-3 shadow-card">
      <div className="flex items-center gap-1.5">
        <Icon size={16} className={icon} />
        <span className="text-[14px] font-semibold text-ink">{label}</span>
        <span className={`ml-auto text-[12px] font-medium ${tone}`}>
          {t(ok === null ? 'an.unknown' : ok ? 'an.yes' : 'an.no')}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-ink-2">{help}</p>
    </div>
  );
}

export function issueText(i: Issue) {
  return t(`issue.${i.code}` as TKey, i.params);
}

export default function AnalysisPanel({ onShowNet }: { onShowNet?: () => void }) {
  const { state, dispatch } = useStore();
  const { compiled, analysis: a } = useDerived();
  const actions = useActions();
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
    ...errors.map((i) => issueText(i)),
    ...(a.deadlockCount ? [t('an.fixDeadlock', { marking: markingText(a.deadlocks[0].marking) })] : []),
    ...(unbounded.length ? [t('an.fixUnbounded', { places: unbounded.join(', ') })] : []),
    ...a.deadTransitions.map((id) => t('an.fixDead', { id })),
  ];
  const clean = !empty && errors.length === 0 && a.bounded === true && a.deadlockCount === 0 && a.reversible === true;

  if (empty) return <p className="p-4 text-[13px] text-ink-2">{t('canvas.empty')}</p>;

  return (
    <div className="h-full space-y-4 overflow-y-auto p-3" data-testid="analysis">
      <p className="px-1 text-[12px] leading-snug text-ink-2">{t('an.subtitle')}</p>

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
      <p className="px-1 font-mono text-[11px] text-ink-3">
        {t('an.states', { n: a.states })}
        {a.truncated && <span className="text-orange-ink"> · {t('an.truncated', { n: a.states })}</span>}
      </p>

      {clean && (
        <div
          className="flex items-start gap-2 rounded-xl bg-green/12 p-3 text-[13px] leading-snug text-ink"
          data-testid="analysis-clean"
        >
          <CheckCircle2 size={17} className="mt-px shrink-0 text-green" />
          {t('an.allGood')}
        </div>
      )}

      {problems.length > 0 && (
        <button
          onClick={() => void actions.send(t('an.fixPrompt', { problems: problems.join('; ') }))}
          disabled={Boolean(state.busy)}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-[14px] font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          <Sparkles size={14} />
          {t('an.askFix')}
        </button>
      )}

      {errors.length > 0 && (
        <List title={t('an.errors')} tone="error">
          {errors.map((i, k) => (
            <Item key={k} onClick={() => select(i.target)}>
              {issueText(i)}
            </Item>
          ))}
        </List>
      )}

      {a.deadlockCount > 0 && (
        <List title={`${t('an.deadlocks')} (${a.deadlockCount})`} tone="error">
          {a.deadlocks.map((d, k) => (
            <li key={k} className="px-3 py-2 text-[13px] text-ink">
              <div className="font-mono text-[12px]">{t('an.deadlockAt', { marking: markingText(d.marking) })}</div>
              <div className="mt-0.5 text-[12px] text-ink-2">
                {d.path.length ? t('an.deadlockPath', { path: d.path.join(' → ') }) : t('an.initial')}
              </div>
              <button
                onClick={() => showMarking(d.marking)}
                className="mt-1 flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
              >
                <Eye size={13} />
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
            <li key={c.place} className="px-3 py-2 text-[13px] text-ink">
              <div>{t('an.conflictOn', { transitions: c.transitions.join(', '), place: c.place })}</div>
              <div className="mt-0.5 text-[12px] text-ink-2">
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
              {issueText(i)}
            </Item>
          ))}
        </List>
      )}

      <div>
        <h3 className="mb-1.5 px-1 text-[13px] font-semibold text-ink-2">{t('an.bounds')}</h3>
        <table className="w-full overflow-hidden rounded-xl bg-surface text-[12px] shadow-card">
          <tbody className="divide-y divide-line">
            {compiled.places.map((p, i) => {
              const b = a.bounds[p.id];
              const bool = placeIsBool(compiled, a, i);
              return (
                <tr key={p.id}>
                  <td className="py-1.5 pl-3 pr-2 font-mono text-ink-3">{p.id}</td>
                  <td className="py-1.5 pr-2 text-[13px] text-ink">{p.name !== p.id ? p.name : ''}</td>
                  <td className="py-1.5 pr-2 text-right font-mono text-ink-2">
                    {b === null ? <span className="text-red-ink">{t('an.infinite')}</span> : `${t('an.max')} ${b}`}
                  </td>
                  <td className={`py-1.5 pr-3 text-right font-mono ${bool ? 'text-accent' : 'text-orange-ink'}`}>
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
  const color = tone === 'error' ? 'text-red-ink' : tone === 'warn' ? 'text-orange-ink' : 'text-accent';
  return (
    <div>
      <h3 className={`mb-1.5 flex items-center gap-1.5 px-1 text-[13px] font-semibold ${color}`}>
        <Icon size={14} />
        {title}
      </h3>
      <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-card">{children}</ul>
    </div>
  );
}

function Item({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-fill"
      >
        <span className="min-w-0 flex-1">{children}</span>
        <ChevronRight size={14} className="shrink-0 text-ink-3" />
      </button>
    </li>
  );
}
