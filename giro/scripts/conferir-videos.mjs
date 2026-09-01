/**
 * Confere os clipes renderizados: codec, duracao, dimensoes e peso.
 *
 * Nao da para simplesmente abrir o mp4 aqui — o Chromium do container nao
 * decodifica H.264 e o ffmpeg do Playwright e uma build reduzida. O probe do
 * proprio Remotion resolve, e de quebra confirma que o arquivo saiu integro.
 *
 *   node scripts/conferir-videos.mjs
 */
import { getVideoMetadata } from "../manual/video/node_modules/@remotion/renderer/dist/index.js";
import { readdirSync, statSync, existsSync } from "node:fs";

const PASTA = "manual/video/saida";
const LIMITE_MB = 3; // acima disso o manual passa a pesar demais para abrir

if (!existsSync(PASTA)) {
  console.error(`${PASTA} nao existe — rode 'npm run manual:video' antes.`);
  process.exit(1);
}

let total = 0;
let problemas = 0;

for (const arquivo of readdirSync(PASTA).filter((f) => f.endsWith(".mp4")).sort()) {
  const caminho = `${PASTA}/${arquivo}`;
  const mb = statSync(caminho).size / 1024 / 1024;
  total += mb;

  try {
    const m = await getVideoMetadata(caminho);
    const alerta = mb > LIMITE_MB ? "  ← pesado" : "";
    console.log(
      `  ${arquivo.padEnd(26)} ${`${m.width}x${m.height}`.padEnd(10)} ` +
        `${m.durationInSeconds.toFixed(1)}s  ${m.fps}fps  ${m.codec}  ${mb.toFixed(2)} MB${alerta}`,
    );
    if (m.codec !== "h264") {
      console.log("      codec inesperado — navegador antigo pode nao tocar");
      problemas++;
    }
  } catch (erro) {
    console.log(`  ${arquivo.padEnd(26)} ILEGIVEL: ${erro instanceof Error ? erro.message : erro}`);
    problemas++;
  }
}

console.log(`\n  ${total.toFixed(2)} MB no total (~${(total * 1.34).toFixed(2)} MB embutidos em base64)`);
if (total * 1.34 > 14) {
  console.log("  atencao: perto do teto de 16 MB da pagina publicada");
}
process.exit(problemas > 0 ? 1 : 0);
