import { ArrowUp, KeyRound, RotateCcw, Square, Trash2, Undo2 } from 'lucide-react';
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
      <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3" data-testid="chat-list">
        {state.messages.map((m) => (
          <Message key={m.id} msg={m} onOpenKey={onOpenKey} />
        ))}
        {state.busy && <Thinking model={state.busy.model} since={state.busy.since} />}
      </div>

      {!hasKey && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-xl bg-orange/10 px-3 py-2 text-[13px] leading-snug text-ink">
          <KeyRound size={15} className="mt-0.5 shrink-0 text-orange" />
          <div>
            {t('chat.noKey')}{' '}
            <button onClick={onOpenKey} className="font-semibold text-accent hover:underline">
              {t('chat.setKey')}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-[20px] border border-line bg-surface py-1.5 pl-3.5 pr-1.5 transition-colors focus-within:border-accent/60">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
            }}
            rows={3}
            placeholder={t(hasNet ? 'chat.placeholderEdit' : 'chat.placeholder')}
            className="max-h-48 min-h-[3.5rem] flex-1 resize-none bg-transparent py-1 text-[14px] leading-snug text-ink placeholder:text-ink-3 focus:outline-none"
            data-testid="chat-input"
          />
          {state.busy ? (
            <button
              type="button"
              onClick={actions.abort}
              title={t('chat.stop')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fill-strong text-ink hover:bg-fill"
            >
              <Square size={12} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              title={t('chat.send')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:bg-fill-strong disabled:text-ink-3"
              data-testid="chat-send"
            >
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          )}
        </div>
        {state.messages.length > 1 && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'chat/clear', welcome: welcomeMessage() })}
            className="mt-2 flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-2"
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
      <div className="mr-4 rounded-[18px] rounded-bl-md bg-fill px-3.5 py-2.5 text-[14px] leading-snug text-ink">
        <p>{t('chat.welcome')}</p>
        <p className="mb-2 mt-3 text-[12px] text-ink-2">{t('chat.examples')}</p>
        <div className="flex flex-wrap gap-1.5">
          {examples().map((ex) => (
            <button
              key={ex.id}
              onClick={() => actions.loadExample(ex)}
              className="rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-accent transition-colors hover:border-accent hover:bg-accent hover:text-on-accent"
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
      <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-[18px] rounded-br-md bg-accent px-3.5 py-2 text-[14px] leading-snug text-on-accent">
        {msg.text}
      </div>
    );

  return (
    <div
      className={`mr-4 rounded-[18px] rounded-bl-md px-3.5 py-2 text-[14px] leading-snug text-ink ${
        msg.error ? 'bg-red/10' : 'bg-fill'
      }`}
      data-testid="assistant-message"
    >
      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
      {msg.detail?.map((d) => (
        <p key={d} className="mt-1 break-words font-mono text-[11px] text-red-ink" data-testid="error-detail">
          {d}
        </p>
      ))}
      {msg.summary && (
        <p className="mt-1.5 font-mono text-[11px] text-accent">
          {t('chat.netSummary', { places: msg.summary.places, transitions: msg.summary.transitions })}
        </p>
      )}
      {msg.notes?.map((n) => (
        <p key={n} className="mt-1 text-[12px] text-ink-2">
          {n}
        </p>
      ))}
      {!!msg.assumptions?.length && (
        <div className="mt-2">
          <div className="text-[12px] font-semibold text-ink-2">{t('chat.assumptions')}</div>
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[13px] text-ink-2">
            {msg.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {!!msg.questions?.length && (
        <div className="mt-2">
          <div className="text-[12px] font-semibold text-orange-ink">{t('chat.questions')}</div>
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[13px] text-ink">
            {msg.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px]">
        {msg.before &&
          (msg.undone ? (
            <span className="text-ink-3">{t('chat.changeUndone')}</span>
          ) : (
            <button
              onClick={() => actions.undoMessage(msg.id)}
              className="flex items-center gap-1 text-accent hover:underline"
            >
              <Undo2 size={12} />
              {t('chat.undoChange')}
            </button>
          ))}
        {msg.retry && (
          <button
            onClick={() => void actions.send(msg.retry!)}
            disabled={Boolean(state.busy)}
            className="flex items-center gap-1 font-semibold text-accent hover:underline disabled:opacity-40"
          >
            <RotateCcw size={12} />
            {t('chat.retry')}
          </button>
        )}
        {(msg.error === 'auth' || msg.error === 'no-key') && (
          <button onClick={onOpenKey} className="flex items-center gap-1 font-semibold text-accent hover:underline">
            <KeyRound size={12} />
            {t('chat.setKey')}
          </button>
        )}
        {msg.model && (
          <span className="ml-auto font-mono text-[10px] text-ink-3">{t('chat.model', { model: msg.model })}</span>
        )}
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
    <div className="mr-4 flex items-center gap-2.5 rounded-[18px] rounded-bl-md bg-fill px-3.5 py-2.5 text-[13px] text-ink-2">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 0.2, 0.4].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-3"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </span>
      {t('chat.thinking', { model: model || 'Gemini' })}
      <span className="ml-auto font-mono text-[11px] text-ink-3">{Math.round((now - since) / 1000)} s</span>
    </div>
  );
}
