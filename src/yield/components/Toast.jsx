import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

/**
 * Notification in the app's own look, above the bottom bar.
 *
 * Replaces the native alert() that "Trace best values" used to fire: alert()
 * blocks the whole page and looks like nothing else on screen.
 */
const Toast = ({ message, onClose, duration = 4000 }) => {
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(onClose, duration);
        return () => clearTimeout(t);
    }, [message, onClose, duration]);

    if (!message) return null;

    return (
        <div
            className="fixed bottom-20 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-raised/95 py-2 pl-3.5 pr-2 text-[13px] text-ink shadow-pop backdrop-blur-xl"
            role="status"
            aria-live="polite"
            data-testid="toast"
        >
            <CheckCircle2 size={16} className="shrink-0 text-green" />
            <span>{message}</span>
            <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-fill hover:text-ink"
            >
                <X size={13} />
            </button>
        </div>
    );
};

export default Toast;
