import React from 'react';
import { Activity, List, GitGraph } from 'lucide-react';

const BAR_BUTTON =
    'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-sm border px-3 text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors disabled:pointer-events-none disabled:opacity-40';
const ON_BAR = `${BAR_BUTTON} border-bar-line bg-bar-raised text-on-bar hover:bg-bar-line`;
const PRIMARY = `${BAR_BUTTON} border-accent-hover bg-accent text-on-accent hover:bg-accent-hover`;

/** The command strip under every tab. On a phone the two secondary actions keep only their icons. */
const BottomBar = ({ onOpenSankey, onOpenBacklog, onTraceValues, isTracing }) => (
    <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-black/40 bg-bar px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex gap-2">
            <button
                type="button"
                onClick={onTraceValues}
                disabled={isTracing}
                aria-label="Trace best values"
                title="Trace best values"
                data-testid="trace-best"
                className={ON_BAR}
            >
                <Activity size={14} />
                <span className="hidden sm:inline">{isTracing ? 'Tracing…' : 'Trace best values'}</span>
            </button>
            <button
                type="button"
                onClick={onOpenBacklog}
                aria-label="Action backlog"
                title="Action backlog"
                data-testid="open-backlog"
                className={ON_BAR}
            >
                <List size={14} />
                <span className="hidden sm:inline">Action backlog</span>
            </button>
        </div>
        <button type="button" onClick={onOpenSankey} data-testid="open-sankey" className={PRIMARY}>
            <GitGraph size={14} />
            View plant Sankey
        </button>
    </footer>
);

export default BottomBar;
