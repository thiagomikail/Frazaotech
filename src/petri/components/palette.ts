import { useSyncExternalStore } from 'react';

/**
 * Diagram colors in the HMI look, one set per appearance: grays for structure,
 * color only for state. SVG attributes, not classes, so an exported SVG keeps
 * them — which is why the appearance is picked here, in JS.
 */
const light = {
  bg: '#f4f4f4',
  grid: '#d9d9d9',
  placeFill: '#ffffff',
  placeStroke: '#555555',
  marked: '#1d4f91',
  token: '#1a1a1a',
  text: '#1a1a1a',
  muted: '#4a4a4a',
  arc: '#6b6b6b',
  ready: '#1e7b34',
  blocked: '#e0a000',
  timing: '#4a4fa8',
  disabled: '#a6a6a6',
  invalid: '#c8102e',
  selected: '#6c4a9e',
  outOn: '#186b2b',
  outOff: '#6b6b6b',
  /** The thin dark edge around an amber (blocked) bar, as on an HMI alarm tile. */
  outline: '#1a1a1a',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#262626',
  grid: '#333333',
  placeFill: '#2a2a2a',
  placeStroke: '#9a9a9a',
  marked: '#6a9fe0',
  token: '#e8e8e8',
  text: '#e8e8e8',
  muted: '#b3b3b3',
  arc: '#7a7a7a',
  ready: '#3ea65a',
  blocked: '#f0b400',
  timing: '#8a8ef0',
  disabled: '#555555',
  invalid: '#e5484d',
  selected: '#b08ce0',
  outOn: '#6fd08a',
  outOff: '#8f8f8f',
  outline: '#000000',
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
