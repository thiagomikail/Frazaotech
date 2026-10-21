import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Yield's building blocks, in the workbench's Apple look (src/theme.css).
 * Every module uses these, so a card, a button or a sheet looks the same in
 * Monitor, Combustion, Optimization and Reports.
 */

/** A white card on the gray page: the unit every screen is made of. */
export const Panel = ({ className = '', children, ...rest }) => (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-2xl bg-surface shadow-card ${className}`} {...rest}>
        {children}
    </section>
);

export const PanelHeader = ({ icon: Icon, title, subtitle, action, className = '' }) => (
    <header className={`flex items-center gap-2.5 px-5 pb-2 pt-4 ${className}`}>
        {Icon && <Icon size={17} className="shrink-0 text-accent" />}
        <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
            {subtitle && <p className="truncate text-[12px] text-ink-2">{subtitle}</p>}
        </div>
        {action}
    </header>
);

export const PanelBody = ({ className = '', children }) => (
    <div className={`min-h-0 flex-1 overflow-y-auto px-5 pb-5 ${className}`}>{children}</div>
);

/** Small gray heading inside a card. Sentence case, never uppercase. */
export const SectionTitle = ({ className = '', children }) => (
    <h3 className={`mb-2 text-[13px] font-semibold text-ink-2 ${className}`}>{children}</h3>
);

const BUTTON = {
    primary: 'bg-accent text-on-accent hover:bg-accent-hover',
    secondary: 'bg-fill text-ink hover:bg-fill-strong',
    tinted: 'bg-accent/10 text-accent hover:bg-accent/15',
    plain: 'text-accent hover:bg-fill',
    danger: 'bg-red/10 text-red-ink hover:bg-red/15',
};

const SIZE = {
    sm: 'h-7 px-3 text-[12px]',
    md: 'h-8 px-3.5 text-[13px]',
    lg: 'h-10 px-5 text-[15px]',
};

/** Pill button. `primary` for the one main action of a view, `secondary`/`tinted` for the rest. */
export const Button = ({ variant = 'secondary', size = 'md', className = '', children, ...rest }) => (
    <button
        type="button"
        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${BUTTON[variant]} ${SIZE[size]} ${className}`}
        {...rest}
    >
        {children}
    </button>
);

const TONE = {
    gray: 'bg-fill text-ink-2',
    blue: 'bg-accent/12 text-accent',
    green: 'bg-green/15 text-green-ink',
    orange: 'bg-orange/15 text-orange-ink',
    red: 'bg-red/15 text-red-ink',
    indigo: 'bg-indigo/15 text-indigo-ink',
    purple: 'bg-purple/15 text-purple-ink',
};

/** Status pill: short text on a tint of its color. */
export const Badge = ({ tone = 'gray', className = '', children, ...rest }) => (
    <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TONE[tone]} ${className}`}
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

/** A number with its label: label small and gray above, value large. */
export const Stat = ({ label, value, unit, tone = 'ink', hint, className = '' }) => (
    <div className={`min-w-0 ${className}`}>
        <div className="truncate text-[12px] text-ink-2">{label}</div>
        <div className={`mt-0.5 text-[22px] font-semibold leading-tight tracking-tight tabular-nums ${VALUE_TONE[tone]}`}>
            {value}
            {unit && <span className="ml-1 text-[13px] font-normal text-ink-2">{unit}</span>}
        </div>
        {hint && <div className="mt-0.5 text-[11px] text-ink-3">{hint}</div>}
    </div>
);

/** iOS segmented control. `options` = [{ value, label, icon? }]. */
export const Segmented = ({ options, value, onChange, testId, className = '' }) => (
    <div className={`flex gap-0.5 rounded-[10px] bg-fill p-0.5 ${className}`} role="tablist">
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
                    className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-[13px] font-medium transition-colors ${
                        on ? 'bg-thumb text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-ink-2 hover:text-ink'
                    }`}
                >
                    {Icon && <Icon size={14} />}
                    {o.label}
                </button>
            );
        })}
    </div>
);

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
            onPointerDown={onClose}
            data-testid="modal"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onPointerDown={(e) => e.stopPropagation()}
                className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-pop ${width}`}
            >
                <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                    {icon}
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
                        {subtitle && <p className="truncate text-[12px] text-ink-2">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        data-testid="modal-close"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 transition-colors hover:bg-fill-strong"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                {footer && (
                    <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
                        {footer}
                    </footer>
                )}
            </div>
        </div>
    );
}

/** Icon in a tinted circle, for KPI tiles and list rows. */
export const IconBadge = ({ icon: Icon, tone = 'blue', size = 36 }) => {
    const tint = {
        blue: 'bg-accent/12 text-accent',
        green: 'bg-green/15 text-green',
        orange: 'bg-orange/15 text-orange',
        red: 'bg-red/12 text-red',
        indigo: 'bg-indigo/15 text-indigo',
        purple: 'bg-purple/15 text-purple',
        gray: 'bg-fill text-ink-2',
    }[tone];
    return (
        <span className={`flex shrink-0 items-center justify-center rounded-full ${tint}`} style={{ width: size, height: size }}>
            <Icon size={Math.round(size * 0.5)} />
        </span>
    );
};
