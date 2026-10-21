import { KeyRound, Loader2, RotateCcw, Send, Square, Trash2, Undo2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { t } from '../strings';
import { apiKey } from '../llm/gemini';
import { examples } from '../model/examples';
import { useActions } from '../state/actions';
import { newId, useStore, type ChatMessage } from '../state/store';

export function welcomeMessage(): ChatMessage {
  return { id: newId(), role: 'assistant', text: '', welcome: true };
}

export default function ChatPanel({ onOpenKey }: { onOpenKey: () => void }) {
  const { state, dispatch } = useStore();
  const actions = useActions();
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const hasNet = state.net.places.length + state.net.transitions.length > 0;
  const hasKey = Boolean(apiKey());

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages.length, state.busy]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || state.busy) return;
    void actions.send(draft);
    setDraft('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" data-testid="chat-list">
        {state.messages.map((m) => (
          <Message key={m.id} msg={m} onOpenKey={onOpenKey} />
        ))}
        {state.busy && <Thinking model={state.busy.model} since={state.busy.since} />}
      </div>

      {!hasKey && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">
          <KeyRound size={14} className="mt-0.5 shrink-0" />
          <div>
            {t('chat.noKey')}{' '}
            <button onClick={onOpenKey} className="font-semibold underline underline-offset-2">
              {t('chat.setKey')}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="border-t border-slate-800 p-3">
        <div className="flex items-end gap-2 rounded-lg border border-slate-700 bg-slate-950 p-2 focus-within:border-sky-500">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
            }}
            rows={3}
            placeholder={t(hasNet ? 'chat.placeholderEdit' : 'chat.placeholder')}
            className="max-h-48 min-h-[3.5rem] flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            data-testid="chat-input"
          />
          {state.busy ? (
            <button
              type="button"
              onClick={actions.abort}
              title={t('chat.stop')}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-700 text-slate-100 hover:bg-slate-600"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              title={t('chat.send')}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:opacity-40"
              data-testid="chat-send"
            >
              <Send size={15} />
            </button>
          )}
        </div>
        {state.messages.length > 1 && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'chat/clear', welcome: welcomeMessage() })}
            className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
          >
            <Trash2 size={11} />
            {t('chat.clear')}
          </button>
        )}
      </form>
    </div>
  );
}

function Message({ msg, onOpenKey }: { msg: ChatMessage; onOpenKey: () => void }) {
  const { state } = useStore();
  const actions = useActions();

  if (msg.welcome)
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">
        <p className="leading-relaxed">{t('chat.welcome')}</p>
        <p className="mb-2 mt-3 text-xs text-slate-400">{t('chat.examples')}</p>
        <div className="flex flex-wrap gap-1.5">
          {examples().map((ex) => (
            <button
              key={ex.id}
              onClick={() => actions.loadExample(ex)}
              className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:border-sky-500 hover:text-white"
              data-testid={`example-${ex.id}`}
            >
              {ex.title}
            </button>
          ))}
        </div>
      </div>
    );

  if (msg.role === 'user')
    return (
      <div className="ml-6 rounded-lg bg-sky-500/15 px-3 py-2 text-sm leading-relaxed text-sky-50 whitespace-pre-wrap">
        {msg.text}
      </div>
    );

  return (
    <div
      className={`mr-4 rounded-lg border px-3 py-2 text-sm leading-relaxed ${
        msg.error ? 'border-red-500/40 bg-red-500/10 text-red-100' : 'border-slate-800 bg-slate-900 text-slate-200'
      }`}
      data-testid="assistant-message"
    >
      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
      {msg.detail?.map((d) => (
        <p key={d} className="mt-1 break-words font-mono text-[11px] text-red-200/80" data-testid="error-detail">
          {d}
        </p>
      ))}
      {msg.summary && (
        <p className="mt-1.5 font-mono text-[11px] text-sky-300">
          {t('chat.netSummary', { places: msg.summary.places, transitions: msg.summary.transitions })}
        </p>
      )}
      {msg.notes?.map((n) => (
        <p key={n} className="mt-1 text-xs text-slate-400">
          {n}
        </p>
      ))}
      {!!msg.assumptions?.length && (
        <div className="mt-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t('chat.assumptions')}
          </div>
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs text-slate-300">
            {msg.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {!!msg.questions?.length && (
        <div className="mt-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">
            {t('chat.questions')}
          </div>
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs text-amber-100">
            {msg.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
        {msg.before &&
          (msg.undone ? (
            <span className="text-slate-500">{t('chat.changeUndone')}</span>
          ) : (
            <button
              onClick={() => actions.undoMessage(msg.id)}
              className="flex items-center gap-1 text-slate-400 hover:text-white"
            >
              <Undo2 size={11} />
              {t('chat.undoChange')}
            </button>
          ))}
        {msg.retry && (
          <button
            onClick={() => void actions.send(msg.retry!)}
            disabled={Boolean(state.busy)}
            className="flex items-center gap-1 font-semibold text-red-200 hover:text-white disabled:opacity-40"
          >
            <RotateCcw size={11} />
            {t('chat.retry')}
          </button>
        )}
        {(msg.error === 'auth' || msg.error === 'no-key') && (
          <button onClick={onOpenKey} className="flex items-center gap-1 font-semibold text-red-200 hover:text-white">
            <KeyRound size={11} />
            {t('chat.setKey')}
          </button>
        )}
        {msg.model && <span className="ml-auto font-mono text-slate-600">{t('chat.model', { model: msg.model })}</span>}
      </div>
    </div>
  );
}

function Thinking({ model, since }: { model: string; since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="mr-4 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
      <Loader2 size={14} className="animate-spin text-sky-400" />
      {t('chat.thinking', { model: model || 'Gemini' })}
      <span className="ml-auto font-mono text-[11px] text-slate-500">{Math.round((now - since) / 1000)} s</span>
    </div>
  );
}
