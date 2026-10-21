import { useSyncExternalStore } from 'react';

/**
 * Diagram colors, one set per appearance. SVG attributes, not classes, so an
 * exported SVG keeps them — which is why the appearance is picked here, in JS.
 */
const light = {
  bg: '#ffffff',
  grid: '#d8d8de',
  placeFill: '#ffffff',
  placeStroke: '#8e8e93',
  marked: '#0071e3',
  token: '#1d1d1f',
  text: '#1d1d1f',
  muted: '#6e6e73',
  arc: '#a1a1a6',
  ready: '#34c759',
  blocked: '#ff9500',
  timing: '#5856d6',
  disabled: '#d1d1d6',
  invalid: '#ff3b30',
  selected: '#af52de',
  outOn: '#248a3d',
  outOff: '#86868b',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#1c1c1e',
  grid: '#3a3a3c',
  placeFill: '#2c2c2e',
  placeStroke: '#8e8e93',
  marked: '#0a84ff',
  token: '#f5f5f7',
  text: '#f5f5f7',
  muted: '#a1a1a6',
  arc: '#636366',
  ready: '#30d158',
  blocked: '#ff9f0a',
  timing: '#7d7aff',
  disabled: '#48484a',
  invalid: '#ff453a',
  selected: '#bf5af2',
  outOn: '#30d158',
  outOff: '#8e8e93',
};

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

const subscribe = (onChange: () => void) => {
  const mq = darkQuery();
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};

export const currentPalette = (): Palette => (darkQuery().matches ? dark : light);

/** The palette for the device's appearance, following it when it changes. */
export const usePalette = () => useSyncExternalStore(subscribe, currentPalette, () => light);
