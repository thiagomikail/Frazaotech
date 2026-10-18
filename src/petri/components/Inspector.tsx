import { Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
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
  const cls = `w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none ${mono ? 'font-mono' : ''}`;
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
      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
      data-testid={testId}
    />
  );
}

function Row({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      {children}
      {help && <span className="mt-1 block text-[11px] text-slate-500">{help}</span>}
    </label>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-b border-slate-800 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function Inspector() {
  const { state, dispatch } = useStore();
  const t = useT();
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
      className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200"
      data-testid="inspector-delete"
    >
      <Trash2 size={12} />
      {t('insp.delete')}
    </button>
  );

  return (
    <div className="h-full overflow-y-auto" data-testid="inspector">
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
      {!selection && <p className="border-b border-slate-800 p-3 text-sm text-slate-400">{t('insp.nothing')}</p>}

      <Section
        title={t('insp.signals')}
        action={
          <div className="flex gap-1.5">
            <button
              onClick={() => edit((n) => addInput(n))}
              className="flex items-center gap-0.5 rounded border border-slate-700 px-1.5 py-0.5 text-[11px] text-slate-300 hover:border-sky-500"
            >
              <Plus size={11} />
              {t('insp.addInput')}
            </button>
            <button
              onClick={() => edit((n) => addOutput(n))}
              className="flex items-center gap-0.5 rounded border border-slate-700 px-1.5 py-0.5 text-[11px] text-slate-300 hover:border-sky-500"
            >
              <Plus size={11} />
              {t('insp.addOutput')}
            </button>
          </div>
        }
      >
        <div>
          <div className="mb-1 text-xs font-medium text-slate-400">{t('io.inputs')}</div>
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
                  className="rounded-md border border-slate-700 bg-slate-950 px-1 py-1.5 text-xs text-slate-200"
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
                  className="p-1 text-slate-500 hover:text-red-300"
                  aria-label={t('insp.delete')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-slate-400">{t('io.outputs')}</div>
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
                  className="p-1 text-slate-500 hover:text-red-300"
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
  const t = useT();
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
          <span className="text-xs text-slate-500">{t('insp.noOutputs')}</span>
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
                  className={`rounded-full border px-2 py-0.5 font-mono text-xs ${
                    on
                      ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
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
  const t = useT();
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
        {problem && <span className="mt-1 block font-mono text-[11px] text-red-300">⚠ {problem}</span>}
        {net.inputs.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {net.inputs.map((s) => (
              <button
                key={s.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(s.name)}
                className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[11px] text-slate-300 hover:border-sky-500"
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
                className="rounded border border-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 hover:border-slate-600"
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
  const t = useT();
  const set = (patch: Partial<Arc>) => edit((n) => updateArc(n, arc.id, patch));
  return (
    <div className="grid grid-cols-2 gap-3">
      <Row label={t('field.weight')}>
        <NumberField value={arc.weight} min={1} max={99} onCommit={(v) => set({ weight: v })} />
      </Row>
      {isPlaceId(arc.from) && (
        <Row label={t('field.inhibitor')} help={t('field.inhibitorHelp')}>
          <input
            type="checkbox"
            checked={Boolean(arc.inhibitor)}
            onChange={(e) => set({ inhibitor: e.target.checked })}
            className="h-4 w-4 accent-sky-500"
          />
        </Row>
      )}
    </div>
  );
}
