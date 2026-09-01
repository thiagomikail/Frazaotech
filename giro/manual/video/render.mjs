/**
 * Renderiza os quatro clipes para manual/video/saida.
 *
 *   node render.mjs            # todos
 *   node render.mjs consultor  # so um
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const NAVEGADOR =
  process.env.REMOTION_CHROMIUM ??
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

const TODOS = ["tour", "primeiro-lancamento", "consultor", "diagnostico"];
const pedidos = process.argv.slice(2).length ? process.argv.slice(2) : TODOS;

mkdirSync("saida", { recursive: true });

console.log("empacotando...");
const pacote = await bundle({ entryPoint: resolve("src/index.ts") });

for (const id of pedidos) {
  const composicao = await selectComposition({ serveUrl: pacote, id, browserExecutable: NAVEGADOR });
  const segundos = (composicao.durationInFrames / composicao.fps).toFixed(1);
  process.stdout.write(`  ${id} (${segundos}s) `);

  await renderMedia({
    composition: composicao,
    serveUrl: pacote,
    codec: "h264",
    outputLocation: `saida/${id}.mp4`,
    browserExecutable: NAVEGADOR,
    imageFormat: "jpeg",
    jpegQuality: 92,
    // Pan lento sobre captura estatica comprime muito bem: crf 30 com preset
    // lento corta o arquivo pela metade sem borrar o texto na tela.
    crf: Number(process.env.CRF ?? 30),
    x264Preset: "slow",
    // As composicoes sao 1280x720 para o texto ficar confortavel de compor,
    // mas o manual exibe os clipes numa coluna estreita. 0,75 devolve
    // 960x540 e corta o peso da pagina pela metade.
    scale: Number(process.env.ESCALA ?? 0.75),
    concurrency: 2,
  });

  console.log("ok");
}

console.log("\nvideos em manual/video/saida");
