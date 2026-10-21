import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Yield's building blocks, in the workbench's industrial HMI look
 * (src/theme.css): gray panels with a title strip, square corners, uppercase
 * labels, color only for state. Every module uses these, so a panel, a button
 * or a sheet looks the same in Monitor, Combustion, Optimization and Reports.
 */

/** An outlined gray panel on the page: the unit every screen is made of. */
export const Panel = ({ className = '', children, ...rest }) => (
    <section
        className={`flex min-h-0 flex-col overflow-hidden rounded-sm border border-line bg-surface ${className}`}
        {...rest}
    >
        {children}
    </section>
);

/** The panel's title strip: uppercase title, optional subtitle, actions on the right. */
export const PanelHeader = ({ icon: Icon, title, subtitle, action, className = '' }) => (
    <header
        className={`flex min-h-8 shrink-0 items-center gap-2 border-b border-line bg-strip px-3 py-1 ${className}`}
    >
        {Icon && <Icon size={14} className="shrink-0 text-ink-2" />}
        <h2 className="shrink-0 truncate text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">{title}</h2>
        {subtitle && (
            <>
                <span className="h-3 w-px shrink-0 bg-line" aria-hidden="true" />
                <p className="min-w-0 truncate text-[12px] font-medium text-ink-3">{subtitle}</p>
            </>
        )}
        {action && <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>}
    </header>
);

export const PanelBody = ({ className = '', children }) => (
    <div className={`min-h-0 flex-1 overflow-y-auto p-3 ${className}`}>{children}</div>
);

/** Small uppercase heading inside a panel. */
export const SectionTitle = ({ className = '', children }) => (
    <h3 className={`mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2 ${className}`}>{children}</h3>
);

const BUTTON = {
    primary: 'border-accent-hover bg-accent text-on-accent hover:bg-accent-hover',
    secondary: 'border-line bg-raised text-ink hover:bg-fill-strong',
    tinted: 'border-line bg-raised text-accent hover:bg-fill-strong',
    plain: 'border-transparent text-accent hover:bg-fill',
    run: 'border-green bg-green text-white hover:opacity-90 dark:text-black',
    danger: 'border-red bg-red text-white hover:opacity-90',
};

const SIZE = {
    sm: 'h-7 px-2.5 text-[11px]',
    md: 'h-8 px-3 text-[12px]',
    lg: 'h-10 px-4 text-[13px]',
};

/** Square push button. `primary` for the one main action of a view, `run` to start something, `secondary`/`tinted` for the rest. */
export const Button = ({ variant = 'secondary', size = 'md', className = '', children, ...rest }) => (
    <button
        type="button"
        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm border font-semibold uppercase tracking-[0.04em] transition-colors disabled:pointer-events-none disabled:opacity-40 ${BUTTON[variant]} ${SIZE[size]} ${className}`}
        {...rest}
    >
        {children}
    </button>
);

const TONE = {
    gray: 'bg-fill-strong text-ink-2',
    blue: 'bg-accent/15 text-accent',
    green: 'bg-green/15 text-green-ink',
    orange: 'bg-orange/20 text-orange-ink',
    red: 'bg-red/15 text-red-ink',
    indigo: 'bg-indigo/15 text-indigo-ink',
    purple: 'bg-purple/15 text-purple-ink',
};

/** Status chip: short uppercase text on a tint of its state color. */
export const Badge = ({ tone = 'gray', className = '', children, ...rest }) => (
    <span
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${TONE[tone]} ${className}`}
        {...rest}
    >
        {children}
    </span>
);

const VALUE_TONE = {
    ink: 'text-ink',
    blue: 'text-accent',
    green: 'text-green-ink',
    orange: 'text-orange-ink',
    red: 'text-red-ink',
    indigo: 'text-indigo-ink',
    purple: 'text-purple-ink',
};

/** A reading with its tag: uppercase label above, value in mono. */
export const Stat = ({ label, value, unit, tone = 'ink', hint, className = '' }) => (
    <div className={`min-w-0 ${className}`}>
        <div className="truncate text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">{label}</div>
        <div className={`mt-0.5 font-mono text-[20px] font-medium leading-tight tabular-nums ${VALUE_TONE[tone]}`}>
            {value}
            {unit && <span className="ml-1 font-sans text-[12px] font-medium text-ink-2">{unit}</span>}
        </div>
        {hint && <div className="mt-0.5 text-[11px] text-ink-3">{hint}</div>}
    </div>
);

const STRIP = {
    surface: {
        box: 'border-line bg-raised',
        on: 'bg-thumb text-on-thumb',
        off: 'text-ink-2 hover:bg-fill',
        divider: 'not-first:border-line',
    },
    bar: {
        box: 'border-bar-line bg-bar-raised',
        on: 'bg-thumb text-on-thumb',
        off: 'text-on-bar-2 hover:bg-bar-line hover:text-on-bar',
        divider: 'not-first:border-bar-line',
    },
};

/** HMI tab strip: one bordered row, the selected tab filled. `options` = [{ value, label, icon? }]; `tone="bar"` on the dark title bar. */
export const Segmented = ({ options, value, onChange, testId, tone = 'surface', className = '' }) => {
    const s = STRIP[tone];
    return (
        <div className={`flex overflow-hidden rounded-sm border ${s.box} ${className}`} role="tablist">
            {options.map((o) => {
                const on = o.value === value;
                const Icon = o.icon;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => onChange(o.value)}
                        data-testid={testId ? `${testId}-${o.value}` : undefined}
                        className={`flex h-7 flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors not-first:border-l ${s.divider} ${
                            on ? s.on : s.off
                        }`}
                    >
                        {Icon && <Icon size={13} />}
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
};

/** A sheet over the page. Closes with the X, Escape or a click outside. */
export function Modal({ title, subtitle, icon, onClose, size = 'md', footer, children }) {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const width = size === 'lg' ? 'max-w-6xl' : size === 'sm' ? 'max-w-lg' : 'max-w-3xl';
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onPointerDown={onClose}
            data-testid="modal"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onPointerDown={(e) => e.stopPropagation()}
                className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-sm border border-line bg-raised shadow-pop ${width}`}
            >
                <header className="flex min-h-10 shrink-0 items-center gap-2.5 border-b border-line bg-strip px-3 py-1.5">
                    {icon}
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[12px] font-bold uppercase tracking-[0.08em] text-ink">{title}</h2>
                        {subtitle && <p className="truncate text-[12px] text-ink-2">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        data-testid="modal-close"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-line bg-raised text-ink-2 transition-colors hover:bg-fill-strong"
                    >
                        <X size={15} strokeWidth={2.5} />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                {footer && (
                    <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-3 py-2">
                        {footer}
                    </footer>
                )}
            </div>
        </div>
    );
}

/** Icon on a square tile. Colored only when the tone is a state; decorative tones stay gray. */
export const IconBadge = ({ icon: Icon, tone = 'blue', size = 36 }) => {
    const tint = {
        blue: 'bg-accent/15 text-accent',
        green: 'bg-green/15 text-green',
        orange: 'bg-orange/20 text-orange-ink',
        red: 'bg-red/15 text-red',
        indigo: 'bg-fill-strong text-ink-2',
        purple: 'bg-fill-strong text-ink-2',
        gray: 'bg-fill-strong text-ink-2',
    }[tone];
    return (
        <span
            className={`flex shrink-0 items-center justify-center rounded-sm border border-line ${tint}`}
            style={{ width: size, height: size }}
        >
            <Icon size={Math.round(size * 0.5)} />
        </span>
    );
};
