/**
 * Home page: start the 3D energy terrain once the page is up. The 3D code
 * loads as its own chunk, so the text and the tools render first; without
 * WebGL the hero keeps its plain dark background.
 */
const canvas = document.querySelector<HTMLCanvasElement>('#terrain');

if (canvas) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = () =>
    import('./terrain')
      .then(({ mountTerrain }) => {
        mountTerrain(canvas, { still });
        canvas.dataset.ready = 'true';
      })
      .catch((e) => console.warn('[OT Workbench] 3D terrain unavailable:', e));
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1200 });
  else setTimeout(start, 200);
}
