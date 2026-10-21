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
      className="pointer-events-none fixed inset-x-0 top-14 z-40 flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {state.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-md rounded-md border px-3 py-2 text-sm shadow-lg ${
            toast.tone === 'warn'
              ? 'border-amber-500/50 bg-amber-950/95 text-amber-100'
              : 'border-slate-700 bg-slate-900/95 text-slate-100'
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
          ? `relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] ${on ? 'text-sky-300' : 'text-slate-400'}`
          : `relative flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium ${
              on ? 'border-sky-400 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`
      }
      aria-current={on ? 'page' : undefined}
      data-testid={`tab-${tab}`}
    >
      <Icon size={compact ? 18 : 14} />
      {t(label)}
      {attention && (
        <span
          className={`absolute ${compact ? 'right-1/4 top-1' : 'right-0.5 top-1.5'} h-2 w-2 rounded-full bg-red-400`}
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
    <div className="flex h-[100dvh] flex-col bg-slate-950 text-slate-200">
      <Header onOpenKey={() => setKeyOpen(true)} />
      {medium ? (
        <main
          className={`grid min-h-0 flex-1 ${wide ? 'grid-cols-[minmax(300px,360px)_1fr_minmax(340px,420px)]' : 'grid-cols-[1fr_minmax(320px,380px)]'}`}
        >
          {wide && (
            <aside className="flex min-h-0 flex-col border-r border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-1.5 border-b border-slate-800 px-3 py-2.5 text-xs font-medium text-slate-300">
                <Bot size={14} />
                {t('tab.chat')}
              </div>
              <div className="min-h-0 flex-1">{panel('chat')}</div>
            </aside>
          )}
          <section className="min-h-0 min-w-0">{panel('net')}</section>
          <aside className="flex min-h-0 flex-col border-l border-slate-800 bg-slate-900/60">
            <nav className="flex border-b border-slate-800 px-1">
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
          <main className="min-h-0 flex-1">{panel(mobile)}</main>
          <nav className="flex border-t border-slate-800 bg-slate-950 pb-[env(safe-area-inset-bottom)]">
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
