/**
 * Renderiza quadros soltos das composicoes, para conferir o enquadramento.
 *
 * Existe porque nao da para inspecionar o mp4 aqui: o Chromium do container
 * nao decodifica h264 e o ffmpeg do Playwright e uma build reduzida. Render
 * de still passa longe dos dois problemas.
 *
 *   node quadros.mjs consultor 30 100 200
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const NAVEGADOR =
  process.env.REMOTION_CHROMIUM ??
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

const id = process.argv[2];
const frames = process.argv.slice(3).map(Number);
const SAIDA = process.env.SAIDA ?? "/tmp/quadros";
mkdirSync(SAIDA, { recursive: true });

const pacote = await bundle({ entryPoint: resolve("src/index.ts") });
const composicao = await selectComposition({ serveUrl: pacote, id, browserExecutable: NAVEGADOR });
console.log(
  `${id}: ${composicao.durationInFrames} frames (${(composicao.durationInFrames / composicao.fps).toFixed(1)}s)`,
);

for (const frame of frames) {
  const caminho = `${SAIDA}/${id}-${String(frame).padStart(4, "0")}.png`;
  await renderStill({
    composition: composicao,
    serveUrl: pacote,
    output: caminho,
    frame,
    browserExecutable: NAVEGADOR,
    overwrite: true,
  });
  console.log(`  ${caminho}`);
}
