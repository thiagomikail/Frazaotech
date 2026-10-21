import { useSyncExternalStore } from 'react';

/**
 * Apple system colors for charts and SVG.
 *
 * Classes and inline styles use the theme's CSS variables (src/theme.css), but
 * Recharts and hand-drawn SVG take colors as attributes, which need real
 * values — so the appearance is picked here and follows the device.
 */
const light = {
    accent: '#0071e3',
    green: '#34c759',
    orange: '#ff9500',
    red: '#ff3b30',
    yellow: '#ffcc00',
    indigo: '#5856d6',
    purple: '#af52de',
    teal: '#30b0c7',
    pink: '#ff2d55',
    ink: '#1d1d1f',
    ink2: '#6e6e73',
    ink3: '#86868b',
    grid: '#e5e5ea',
    surface: '#ffffff',
    fill: '#f2f2f7',
};

const dark = {
    accent: '#0a84ff',
    green: '#30d158',
    orange: '#ff9f0a',
    red: '#ff453a',
    yellow: '#ffd60a',
    indigo: '#5e5ce6',
    purple: '#bf5af2',
    teal: '#40c8e0',
    pink: '#ff375f',
    ink: '#f5f5f7',
    ink2: '#a1a1a6',
    ink3: '#86868b',
    grid: '#38383a',
    surface: '#1c1c1e',
    fill: '#2c2c2e',
};

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

const subscribe = (onChange) => {
    const mq = darkQuery();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
};

const current = () => (darkQuery().matches ? dark : light);

/** The palette for the device's appearance, following it when it changes. */
export const useColors = () => useSyncExternalStore(subscribe, current, () => light);

/** Recharts tooltip in the system look. The box is HTML, so it takes CSS variables; the cursor is SVG, so it takes `c`. */
export const tooltipProps = (c) => ({
    contentStyle: {
        background: 'var(--color-raised)',
        border: '0.5px solid var(--color-line)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-pop)',
        color: 'var(--color-ink)',
        fontSize: 12,
        padding: '8px 12px',
    },
    labelStyle: { color: 'var(--color-ink-2)', marginBottom: 4 },
    itemStyle: { color: 'var(--color-ink)', padding: 0 },
    cursor: { fill: c.fill, stroke: c.grid },
});

/** Axis props shared by every chart: small secondary text, no tick lines. */
export const axisProps = (c) => ({
    tick: { fill: c.ink2, fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: c.grid },
});
