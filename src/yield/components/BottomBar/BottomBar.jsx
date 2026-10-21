import React from 'react';
import { Activity, List, GitGraph } from 'lucide-react';
import { Button } from '../ui';

/** One row on every screen: on a phone the two secondary actions keep only their icons. */
const BottomBar = ({ onOpenSankey, onOpenBacklog, onTraceValues, isTracing }) => (
    <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface/80 px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex gap-2">
            <Button
                variant="tinted"
                onClick={onTraceValues}
                disabled={isTracing}
                aria-label="Trace best values"
                title="Trace best values"
                data-testid="trace-best"
            >
                <Activity size={15} />
                <span className="hidden sm:inline">{isTracing ? 'Tracing…' : 'Trace best values'}</span>
            </Button>
            <Button onClick={onOpenBacklog} aria-label="Action backlog" title="Action backlog" data-testid="open-backlog">
                <List size={15} />
                <span className="hidden sm:inline">Action backlog</span>
            </Button>
        </div>
        <Button variant="primary" onClick={onOpenSankey} data-testid="open-sankey">
            <GitGraph size={15} />
            View plant Sankey
        </Button>
    </footer>
);

export default BottomBar;
