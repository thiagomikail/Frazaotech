import { Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { t } from '../strings';
import {
  addInput,
  addOutput,
  removeElement,
  removeInput,
  removeOutput,
  renameInput,
  renameOutput,
  updateArc,
  updatePlace,
  updateTransition,
} from '../model/edit';
import { parseExpr, varsOf } from '../model/expr';
import { isPlaceId } from '../model/net';
import type { Arc, InputKind, PetriNet, Place, Transition } from '../model/types';
import { useStore, useToast } from '../state/store';

/** Text that commits on blur or Enter: one undo step per edit, not per keystroke. */
function TextField({
  value,
  onCommit,
  multiline,
  mono,
  placeholder,
  testId,
  inputRef,
  onDraft,
}: {
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  mono?: boolean;
  placeholder?: string;
  testId?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onDraft?: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  const cls = `w-full rounded-sm border border-line bg-field px-2 py-1.5 text-[13px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none ${mono ? 'font-mono text-[12px]' : ''}`;
  if (multiline)
    return (
      <textarea
        value={draft}
        rows={2}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        className={`${cls} resize-y`}
        data-testid={testId}
      />
    );
  return (
    <input
      ref={inputRef}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        setDraft(e.target.value);
        onDraft?.(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(value);
      }}
      className={cls}
      data-testid={testId}
    />
  );
}

function NumberField({
  value,
  onCommit,
  min = 0,
  max = 999,
  step = 1,
  testId,
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  testId?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft.replace(',', '.'));
    if (!Number.isFinite(n)) return setDraft(String(value));
    const v = Math.min(max, Math.max(min, step >= 1 ? Math.round(n) : n));
    setDraft(String(v));
    if (v !== value) onCommit(v);
  };
  return (
    <input
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="w-full rounded-sm border border-line bg-field px-2 py-1.5 font-mono text-[12px] tabular-nums text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
      data-testid={testId}
    />
  );
}

function Row({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">{label}</span>
      {children}
      {help && <span className="mt-1 block text-[11px] leading-snug text-ink-3">{help}</span>}
    </label>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-sm border border-line bg-surface">
      <div className="flex h-8 items-center justify-between gap-2 border-b border-line bg-strip px-3">
        <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">{title}</h3>
        {action}
      </div>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  );
}

export default function Inspector() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const { net, selection } = state;
  const edit = (fn: (n: PetriNet) => PetriNet) => dispatch({ type: 'net/update', fn });

  const place = selection?.kind === 'place' ? net.places.find((p) => p.id === selection.id) : undefined;
  const transition = selection?.kind === 'transition' ? net.transitions.find((x) => x.id === selection.id) : undefined;
  const arc = selection?.kind === 'arc' ? net.arcs.find((a) => a.id === selection.id) : undefined;

  const remove = () => selection && edit((n) => removeElement(n, selection.kind, selection.id));
  const deleteButton = (
    <button
      onClick={remove}
      className="flex h-6 items-center gap-1 rounded-sm border border-red/60 bg-raised px-2 text-[10px] font-bold uppercase tracking-[0.04em] text-red-ink transition-colors hover:bg-red hover:text-white"
      data-testid="inspector-delete"
    >
      <Trash2 size={12} />
      {t('insp.delete')}
    </button>
  );

  return (
    <div className="h-full overflow-y-auto pb-2" data-testid="inspector">
      {place && (
        <Section title={t('insp.place', { id: place.id })} action={deleteButton}>
          <PlaceForm place={place} net={net} edit={edit} />
        </Section>
      )}
      {transition && (
        <Section title={t('insp.transition', { id: transition.id })} action={deleteButton}>
          <TransitionForm tr={transition} net={net} edit={edit} />
        </Section>
      )}
      {arc && (
        <Section title={t('insp.arc', { from: arc.from, to: arc.to })} action={deleteButton}>
          <ArcForm arc={arc} edit={edit} />
        </Section>
      )}
      {!selection && (
        <p className="mx-2 mt-2 rounded-sm border border-line border-l-4 border-l-accent bg-field p-3 text-[13px] leading-snug text-ink-2">
          {t('insp.nothing')}
        </p>
      )}

      <Section
        title={t('insp.signals')}
        action={
          <div className="flex gap-1.5">
            <button
              onClick={() => edit((n) => addInput(n))}
              className="flex h-6 items-center gap-0.5 rounded-sm border border-line bg-raised px-2 text-[10px] font-bold uppercase tracking-[0.04em] text-ink transition-colors hover:bg-fill-strong"
            >
              <Plus size={11} />
              {t('insp.addInput')}
            </button>
            <button
              onClick={() => edit((n) => addOutput(n))}
              className="flex h-6 items-center gap-0.5 rounded-sm border border-line bg-raised px-2 text-[10px] font-bold uppercase tracking-[0.04em] text-ink transition-colors hover:bg-fill-strong"
            >
              <Plus size={11} />
              {t('insp.addOutput')}
            </button>
          </div>
        }
      >
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">{t('io.inputs')}</div>
          <div className="space-y-1.5">
            {net.inputs.map((s) => (
              <div key={s.name} className="grid grid-cols-[1fr_1.4fr_auto_auto] items-center gap-1.5">
                <TextField
                  value={s.name}
                  mono
                  onCommit={(v) => {
                    const next = renameInput(net, s.name, v);
                    if (next) dispatch({ type: 'net/replace', net: next });
                    else toast(t('insp.badName', { name: v }), 'warn');
                  }}
                />
                <TextField
                  value={s.description}
                  placeholder={t('field.description')}
                  onCommit={(v) =>
                    edit((n) => ({
                      ...n,
                      inputs: n.inputs.map((x) => (x.name === s.name ? { ...x, description: v } : x)),
                    }))
                  }
                />
                <select
                  value={s.kind}
                  onChange={(e) =>
                    edit((n) => ({
                      ...n,
                      inputs: n.inputs.map((x) =>
                        x.name === s.name ? { ...x, kind: e.target.value as InputKind } : x,
                      ),
                    }))
                  }
                  className="rounded-sm border border-line bg-field px-1 py-1.5 text-[12px] text-ink focus:border-accent focus:outline-none"
                  title={t('field.kind')}
                >
                  {(['button', 'sensor', 'switch'] as const).map((k) => (
                    <option key={k} value={k}>
                      {t(`kind.${k}`)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => edit((n) => removeInput(n, s.name))}
                  className="rounded-sm p-1.5 text-ink-3 transition-colors hover:bg-red hover:text-white"
                  aria-label={t('insp.delete')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">{t('io.outputs')}</div>
          <div className="space-y-1.5">
            {net.outputs.map((s) => (
              <div key={s.name} className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-1.5">
                <TextField
                  value={s.name}
                  mono
                  onCommit={(v) => {
                    const next = renameOutput(net, s.name, v);
                    if (next) dispatch({ type: 'net/replace', net: next });
                    else toast(t('insp.badName', { name: v }), 'warn');
                  }}
                />
                <TextField
                  value={s.description}
                  placeholder={t('field.description')}
                  onCommit={(v) =>
                    edit((n) => ({
                      ...n,
                      outputs: n.outputs.map((x) => (x.name === s.name ? { ...x, description: v } : x)),
                    }))
                  }
                />
                <button
                  onClick={() => edit((n) => removeOutput(n, s.name))}
                  className="rounded-sm p-1.5 text-ink-3 transition-colors hover:bg-red hover:text-white"
                  aria-label={t('insp.delete')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t('insp.net')}>
        <Row label={t('field.name')}>
          <TextField value={net.name} onCommit={(v) => edit((n) => ({ ...n, name: v }))} testId="net-name" />
        </Row>
        <Row label={t('field.description')}>
          <TextField value={net.description} multiline onCommit={(v) => edit((n) => ({ ...n, description: v }))} />
        </Row>
      </Section>
    </div>
  );
}

type Edit = (fn: (n: PetriNet) => PetriNet) => void;

function PlaceForm({ place, net, edit }: { place: Place; net: PetriNet; edit: Edit }) {
  const set = (patch: Partial<Place>) => edit((n) => updatePlace(n, place.id, patch));
  return (
    <>
      <Row label={t('field.name')}>
        <TextField value={place.name} onCommit={(v) => set({ name: v.trim() || place.id })} testId="place-name" />
      </Row>
      <Row label={t('field.description')}>
        <TextField value={place.description} multiline onCommit={(v) => set({ description: v })} />
      </Row>
      <div className="grid grid-cols-2 gap-3">
        <Row label={t('field.tokens')}>
          <NumberField value={place.tokens} onCommit={(v) => set({ tokens: v })} testId="place-tokens" />
        </Row>
        <Row label={t('field.capacity')} help={t('field.capacityHelp')}>
          <NumberField value={place.capacity} onCommit={(v) => set({ capacity: v })} />
        </Row>
      </div>
      <Row label={t('field.actions')}>
        {net.outputs.length === 0 ? (
          <span className="text-[12px] text-ink-3">{t('insp.noOutputs')}</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {net.outputs.map((o) => {
              const on = place.actions.some((a) => a.toLowerCase() === o.name.toLowerCase());
              return (
                <button
                  key={o.name}
                  type="button"
                  onClick={() =>
                    set({
                      actions: on
                        ? place.actions.filter((a) => a.toLowerCase() !== o.name.toLowerCase())
                        : [...place.actions, o.name],
                    })
                  }
                  className={`flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[12px] transition-colors ${
                    on ? 'border-green bg-green/15 text-green-ink' : 'border-line bg-raised text-ink-2 hover:bg-fill-strong'
                  }`}
                  aria-pressed={on}
                >
                  {o.name}
                </button>
              );
            })}
          </div>
        )}
      </Row>
    </>
  );
}

function TransitionForm({ tr, net, edit }: { tr: Transition; net: PetriNet; edit: Edit }) {
  const set = (patch: Partial<Transition>) => edit((n) => updateTransition(n, tr.id, patch));
  const [guardDraft, setGuardDraft] = useState(tr.guard);
  useEffect(() => setGuardDraft(tr.guard), [tr.guard]);
  const guardRef = useRef<HTMLInputElement>(null);

  const parsed = parseExpr(guardDraft);
  const known = new Set(net.inputs.map((s) => s.name.toLowerCase()));
  const unknown = parsed.ok ? [...varsOf(parsed.expr)].filter((v) => !known.has(v)) : [];
  const problem = !parsed.ok ? parsed.error.message : unknown.length ? unknown.join(', ') : '';

  const insert = (name: string) => {
    const el = guardRef.current;
    const at = el?.selectionStart ?? guardDraft.length;
    const before = guardDraft.slice(0, at).replace(/\s+$/, '');
    const after = guardDraft.slice(at).replace(/^\s+/, '');
    const glue = before && !/(\(|AND|OR|XOR|NOT)$/i.test(before) ? ' AND ' : before ? ' ' : '';
    const next = `${before}${glue}${name}${after ? ` ${after}` : ''}`;
    set({ guard: next });
  };

  return (
    <>
      <Row label={t('field.name')}>
        <TextField value={tr.name} onCommit={(v) => set({ name: v.trim() || tr.id })} testId="transition-name" />
      </Row>
      <Row label={t('field.guard')} help={t('field.guardHelp')}>
        <TextField
          value={tr.guard}
          mono
          inputRef={guardRef}
          onDraft={setGuardDraft}
          onCommit={(v) => set({ guard: v.trim() })}
          placeholder="TRUE"
          testId="transition-guard"
        />
        {problem && <span className="mt-1 block font-mono text-[11px] text-red-ink">⚠ {problem}</span>}
        {net.inputs.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {net.inputs.map((s) => (
              <button
                key={s.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(s.name)}
                className="rounded-sm border border-line bg-raised px-1.5 py-0.5 font-mono text-[11px] text-ink hover:bg-fill-strong"
              >
                {s.name}
              </button>
            ))}
            {['AND', 'OR', 'NOT'].map((op) => (
              <button
                key={op}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const base = guardDraft.trim();
                  const open = !base || /(\(|AND|OR|XOR|NOT)$/i.test(base);
                  set({ guard: `${base} ${op === 'NOT' && !open ? 'AND NOT' : op}`.trim() });
                }}
                className="rounded-sm border border-dashed border-line px-1.5 py-0.5 font-mono text-[11px] text-ink-2 hover:bg-fill"
              >
                {op}
              </button>
            ))}
          </div>
        )}
      </Row>
      <div className="grid grid-cols-2 gap-3">
        <Row label={t('field.delay')} help={t('field.delayHelp')}>
          <NumberField
            value={tr.delayMs / 1000}
            step={0.1}
            max={86_400}
            onCommit={(v) => set({ delayMs: Math.round(v * 1000) })}
            testId="transition-delay"
          />
        </Row>
        <Row label={t('field.priority')} help={t('field.priorityHelp')}>
          <NumberField value={tr.priority} onCommit={(v) => set({ priority: v })} />
        </Row>
      </div>
      <Row label={t('field.description')}>
        <TextField value={tr.description} multiline onCommit={(v) => set({ description: v })} />
      </Row>
    </>
  );
}

function ArcForm({ arc, edit }: { arc: Arc; edit: Edit }) {
  const set = (patch: Partial<Arc>) => edit((n) => updateArc(n, arc.id, patch));
  return (
    <div className="grid grid-cols-2 gap-3">
      <Row label={t('field.weight')}>
        <NumberField value={arc.weight} min={1} max={99} onCommit={(v) => set({ weight: v })} />
      </Row>
      {isPlaceId(arc.from) && (
        <Row label={t('field.inhibitor')} help={t('field.inhibitorHelp')}>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(arc.inhibitor)}
            onClick={() => set({ inhibitor: !arc.inhibitor })}
            className={`relative block h-6 w-11 rounded-sm border transition-colors ${arc.inhibitor ? 'border-green bg-green' : 'border-line bg-field'}`}
          >
            <span
              className={`absolute top-[3px] h-4 w-4 rounded-[1px] border border-black/25 bg-white transition-[left] ${arc.inhibitor ? 'left-[22px]' : 'left-[3px]'}`}
            />
          </button>
        </Row>
      )}
    </div>
  );
}
