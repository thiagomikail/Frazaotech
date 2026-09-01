/**
 * Converte as capturas PNG (2x, pesadas) para WebP no tamanho em que o manual
 * exibe. Sao 5 MB de PNG virando 1 MB de WebP — a diferenca inteira aparece
 * no tempo de abrir a pagina.
 *
 *   node scripts/converter-telas.mjs
 */
import sharp from "sharp";
import { readdirSync, mkdirSync } from "node:fs";

const ENTRADA = "manual/telas";
const SAIDA = "manual/web";
mkdirSync(SAIDA, { recursive: true });

// As capturas de celular sao estreitas e aparecem pequenas no manual.
const ehCelular = (nome) => nome.includes("celular");

let total = 0;
for (const arquivo of readdirSync(ENTRADA).filter((f) => f.endsWith(".png")).sort()) {
  const largura = ehCelular(arquivo) ? 560 : 1400;
  const destino = `${SAIDA}/${arquivo.replace(".png", ".webp")}`;
  const info = await sharp(`${ENTRADA}/${arquivo}`)
    .resize({ width: largura })
    .webp({ quality: 82 })
    .toFile(destino);
  total += info.size;
  console.log(`  ${destino} — ${(info.size / 1024).toFixed(0)} KB`);
}
console.log(`\n${(total / 1024 / 1024).toFixed(2)} MB de WebP`);
