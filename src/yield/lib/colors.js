import { useSyncExternalStore } from 'react';

/**
 * HMI colors for charts and SVG: grays for structure, color only for state.
 *
 * Classes and inline styles use the theme's CSS variables (src/theme.css), but
 * Recharts and hand-drawn SVG take colors as attributes, which need real
 * values — so the appearance is picked here and follows the device.
 */
const light = {
    accent: '#1d4f91',
    green: '#1e7b34',
    orange: '#e0a000',
    red: '#c8102e',
    yellow: '#f2c200',
    indigo: '#4a4fa8',
    purple: '#6c4a9e',
    teal: '#2a7f8f',
    pink: '#b0407a',
    ink: '#1a1a1a',
    ink2: '#4a4a4a',
    ink3: '#6b6b6b',
    grid: '#c4c4c4',
    surface: '#ececec',
    field: '#ffffff',
    fill: '#e0e0e0',
};

const dark = {
    accent: '#6a9fe0',
    green: '#3ea65a',
    orange: '#f0b400',
    red: '#e5484d',
    yellow: '#f5cf2e',
    indigo: '#8a8ef0',
    purple: '#b08ce0',
    teal: '#4fb3c2',
    pink: '#e07aa8',
    ink: '#e8e8e8',
    ink2: '#b3b3b3',
    ink3: '#8f8f8f',
    grid: '#444444',
    surface: '#2a2a2a',
    field: '#1f1f1f',
    fill: '#333333',
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

/** Recharts tooltip in the HMI look. The box is HTML, so it takes CSS variables; the cursor is SVG, so it takes `c`. */
export const tooltipProps = (c) => ({
    contentStyle: {
        background: 'var(--color-raised)',
        border: '1px solid var(--color-line)',
        borderRadius: 2,
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
