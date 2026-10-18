import { useRef } from 'react';
import { useLang, useT } from '../i18n';
import { generateJson, LlmError, reasons } from '../llm/gemini';
import { analysisSummary, buildTurns, readAnswer, RESPONSE_SCHEMA, SYSTEM_PROMPT } from '../llm/prompt';
import type { Example } from '../model/examples';
import { layoutNet } from '../model/layout';
import { fireManual } from '../model/simulate';
import type { PetriNet } from '../model/types';
import { newId, useDerived, useStore, useToast } from './store';

/** Only one request at a time; the controller lives outside React so any panel can cancel it. */
let inflight: AbortController | null = null;

const summaryOf = (net: PetriNet) => ({ places: net.places.length, transitions: net.transitions.length });

export function useActions() {
  const { state, dispatch } = useStore();
  const { compiled, analysis } = useDerived();
  const { lang } = useLang();
  const t = useT();
  const toast = useToast();
  const latest = useRef({ state, compiled, analysis });
  latest.current = { state, compiled, analysis };

  /** Replaces the net (one undo step) with a fresh layout, keeping the current direction. */
  const applyNet = (net: PetriNet) => {
    const dir = latest.current.state.net.layout?.direction ?? 'TB';
    dispatch({ type: 'net/replace', net: layoutNet(net, dir), fit: true });
  };

  const loadExample = (ex: Example) => {
    const before = latest.current.state.net;
    applyNet(ex.net);
    dispatch({ type: 'ui/mode', mode: 'sim' });
    dispatch({ type: 'ui/select', selection: null });
    dispatch({ type: 'chat/add', msg: { id: newId(), role: 'user', text: ex.prompt } });
    dispatch({
      type: 'chat/add',
      msg: {
        id: newId(),
        role: 'assistant',
        text: t('chat.exampleLoaded', { name: ex.title }),
        before,
        summary: summaryOf(ex.net),
      },
    });
  };

  const send = async (text: string) => {
    const request = text.trim();
    if (!request || latest.current.state.busy) return;
    const { state: now, analysis: a, compiled: c } = latest.current;
    const history = now.messages.filter((m) => !m.welcome && !m.error).map((m) => ({ role: m.role, text: m.text }));

    dispatch({ type: 'chat/add', msg: { id: newId(), role: 'user', text: request } });
    dispatch({ type: 'chat/busy', busy: { model: '', since: Date.now() } });
    inflight = new AbortController();

    try {
      const { data, model } = await generateJson({
        system: SYSTEM_PROMPT,
        turns: buildTurns(history, request, now.net, analysisSummary(a, c.issues), lang),
        schema: RESPONSE_SCHEMA,
        signal: inflight.signal,
        onAttempt: (m) =>
          dispatch({ type: 'chat/busy', busy: { model: m, since: latest.current.state.busy?.since ?? Date.now() } }),
      });
      const answer = readAnswer(data);
      const before = latest.current.state.net;
      const notes: string[] = [];
      if (answer.net) {
        applyNet(answer.net);
        dispatch({ type: 'ui/select', selection: null });
        const created = [...(answer.report?.createdInputs ?? []), ...(answer.report?.createdOutputs ?? [])];
        if (created.length) notes.push(t('chat.created', { names: created.join(', ') }));
        if (answer.report?.droppedArcs) notes.push(t('chat.dropped', { n: answer.report.droppedArcs }));
      }
      dispatch({
        type: 'chat/add',
        msg: {
          id: newId(),
          role: 'assistant',
          text: answer.reply || (answer.net ? '' : t('chat.noChange')),
          assumptions: answer.assumptions,
          questions: answer.questions,
          notes,
          model,
          ...(answer.net ? { before, summary: summaryOf(answer.net) } : {}),
        },
      });
    } catch (e) {
      const kind = e instanceof LlmError ? e.kind : 'overloaded';
      if (kind !== 'aborted') console.warn('[PetriPLC] Gemini failed:', e);
      dispatch({
        type: 'chat/add',
        msg: {
          id: newId(),
          role: 'assistant',
          text: t(`err.${kind}`),
          error: kind,
          detail: kind === 'aborted' || !(e instanceof Error) ? undefined : reasons(e.message),
          retry: kind === 'aborted' ? undefined : request,
        },
      });
    } finally {
      inflight = null;
      dispatch({ type: 'chat/busy', busy: null });
    }
  };

  const abort = () => inflight?.abort();

  /** Undo one assistant change from the chat, even if other edits came after it. */
  const undoMessage = (id: string) => {
    const msg = latest.current.state.messages.find((m) => m.id === id);
    if (!msg?.before) return;
    dispatch({ type: 'net/replace', net: msg.before, fit: true });
    dispatch({ type: 'chat/patch', id, patch: { undone: true } });
  };

  const fire = (transitionId: string) => {
    const r = fireManual(latest.current.compiled, latest.current.state.sim, transitionId);
    if (!r.ok) {
      toast(t(`fire.${r.reason}`, { id: transitionId }), 'warn');
      return;
    }
    dispatch({ type: 'sim/set', sim: r.state });
    if (r.changedInputs.length) toast(t('fire.inputs', { names: r.changedInputs.join(', '), id: transitionId }));
  };

  return { applyNet, loadExample, send, abort, undoMessage, fire };
}
