import { Bot, Code2, Network, PencilRuler, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AnalysisPanel from './components/AnalysisPanel';
import ChatPanel, { welcomeMessage } from './components/ChatPanel';
import CodePanel from './components/CodePanel';
import Header from './components/Header';
import Inspector from './components/Inspector';
import KeyDialog from './components/KeyDialog';
import NetCanvas from './components/NetCanvas';
import { IoPanel, SimBar, useSimLoop } from './components/SimPanel';
import { t, type TKey } from './strings';
import { StoreProvider, useDerived, useStore } from './state/store';

type Tab = 'chat' | 'net' | 'edit' | 'check' | 'code';

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

const TAB_META: Record<Tab, { icon: typeof Bot; label: TKey }> = {
  chat: { icon: Bot, label: 'tab.chat' },
  net: { icon: Network, label: 'tab.net' },
  edit: { icon: PencilRuler, label: 'tab.edit' },
  check: { icon: ShieldCheck, label: 'tab.check' },
  code: { icon: Code2, label: 'tab.code' },
};

function NetArea() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <NetCanvas />
      </div>
      <SimBar />
      <IoPanel />
    </div>
  );
}

function Toasts() {
  const { state } = useStore();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-1.5 z-40 flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {state.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex max-w-md items-center rounded-sm border border-line border-l-4 bg-raised px-3 py-1.5 text-[13px] text-ink shadow-pop ${
            toast.tone === 'warn' ? 'border-l-orange' : 'border-l-accent'
          }`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}

function TabButton({
  tab,
  current,
  onPick,
  attention,
  compact,
}: {
  tab: Tab;
  current: Tab;
  onPick: (t: Tab) => void;
  /** Red dot: the net has errors or can lock up. */
  attention?: boolean;
  compact?: boolean;
}) {
  const { icon: Icon, label } = TAB_META[tab];
  const on = tab === current;
  return (
    <button
      onClick={() => onPick(tab)}
      className={
        compact
          ? `relative flex flex-1 flex-col items-center gap-0.5 border-t-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.06em] ${
              on ? 'border-t-on-bar bg-bar-raised text-on-bar' : 'border-t-transparent text-on-bar-2'
            }`
          : `relative flex flex-1 items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors ${
              on ? 'bg-thumb text-on-thumb' : 'text-ink-2 hover:bg-fill'
            }`
      }
      aria-current={on ? 'page' : undefined}
      data-testid={`tab-${tab}`}
    >
      <Icon size={compact ? 20 : 13} strokeWidth={compact ? 1.8 : 2.2} />
      {t(label)}
      {attention && (
        <span
          className={`absolute ${compact ? 'right-[calc(50%-18px)] top-1' : 'right-1.5 top-1.5'} h-2 w-2 rounded-full border border-black/30 bg-red`}
        />
      )}
    </button>
  );
}

function Shell() {
  useSimLoop();
  const { state } = useStore();
  const { compiled, analysis } = useDerived();
  const wide = useMedia('(min-width: 1280px)');
  const medium = useMedia('(min-width: 860px)');
  const [side, setSide] = useState<Tab>(wide ? 'check' : 'chat');
  const [mobile, setMobile] = useState<Tab>(state.net.places.length ? 'net' : 'chat');
  const [keyOpen, setKeyOpen] = useState(false);

  // On a phone, a new net from the chat or an example takes you to the diagram.
  const lastFit = useRef(state.fitToken);
  useEffect(() => {
    if (state.fitToken !== lastFit.current) {
      lastFit.current = state.fitToken;
      if (!medium && state.net.places.length + state.net.transitions.length > 0) setMobile('net');
    }
  }, [state.fitToken, medium, state.net]);

  // Selecting something in edit mode opens the inspector beside the diagram.
  useEffect(() => {
    if (state.selection && state.mode === 'edit' && medium) setSide('edit');
  }, [state.selection, state.mode, medium]);

  useEffect(() => {
    if (wide && side === 'chat') setSide('check');
  }, [wide, side]);

  const attention = compiled.issues.some((i) => i.level === 'error') || analysis.deadlockCount > 0;
  const panel = (tab: Tab) => {
    switch (tab) {
      case 'chat':
        return <ChatPanel onOpenKey={() => setKeyOpen(true)} />;
      case 'net':
        return <NetArea />;
      case 'edit':
        return <Inspector />;
      case 'check':
        return <AnalysisPanel onShowNet={() => setMobile('net')} />;
      case 'code':
        return <CodePanel />;
    }
  };

  const sideTabs: Tab[] = wide ? ['edit', 'check', 'code'] : ['chat', 'edit', 'check', 'code'];

  return (
    <div className="flex h-[100dvh] flex-col bg-canvas text-ink">
      <Header onOpenKey={() => setKeyOpen(true)} />
      {medium ? (
        <main
          className={`grid min-h-0 flex-1 gap-1.5 p-1.5 ${wide ? 'grid-cols-[minmax(300px,360px)_1fr_minmax(340px,420px)]' : 'grid-cols-[1fr_minmax(320px,380px)]'}`}
        >
          {wide && (
            <aside className="flex min-h-0 flex-col overflow-hidden rounded-sm border border-line bg-surface">
              <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line bg-strip px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
                <Bot size={14} />
                {t('tab.chat')}
              </div>
              <div className="min-h-0 flex-1">{panel('chat')}</div>
            </aside>
          )}
          <section className="min-h-0 min-w-0 overflow-hidden rounded-sm border border-line bg-surface">{panel('net')}</section>
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-sm border border-line bg-surface">
            <nav className="flex h-8 shrink-0 divide-x divide-line border-b border-line bg-strip">
              {sideTabs.map((tab) => (
                <TabButton
                  key={tab}
                  tab={tab}
                  current={side}
                  onPick={setSide}
                  attention={tab === 'check' && attention}
                />
              ))}
            </nav>
            <div className="min-h-0 flex-1">{panel(sideTabs.includes(side) ? side : sideTabs[0])}</div>
          </aside>
        </main>
      ) : (
        <>
          <main className="min-h-0 flex-1 bg-surface">{panel(mobile)}</main>
          <nav className="flex border-t border-black/40 bg-bar pb-[env(safe-area-inset-bottom)]">
            {(['chat', 'net', 'edit', 'check', 'code'] as Tab[]).map((tab) => (
              <TabButton
                key={tab}
                tab={tab}
                current={mobile}
                onPick={setMobile}
                attention={tab === 'check' && attention}
                compact
              />
            ))}
          </nav>
        </>
      )}
      <Toasts />
      {keyOpen && <KeyDialog onClose={() => setKeyOpen(false)} />}
    </div>
  );
}

export default function PetriApp() {
  const [welcome] = useState(welcomeMessage);
  return (
    <StoreProvider welcome={welcome}>
      <Shell />
    </StoreProvider>
  );
}
