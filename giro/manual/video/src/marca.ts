import { staticFile, delayRender, continueRender } from "remotion";

/**
 * Identidade dos videos — a mesma do app e do manual, escurecida para video.
 * Fundo claro em tela cheia cansa; o produto continua reconhecivel pelo brasa.
 */
export const CORES = {
  fundo: "#14110e",
  fundoAlto: "#1e1a15",
  tinta: "#f4efe7",
  suave: "#a49c90",
  brasa: "#e8763f",
  mata: "#4bb98a",
  linha: "#302a23",
};

export const FONTES = {
  titulo: '"Archivo", ui-sans-serif, system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
};

/**
 * Fontes vem de public/fontes: render nao pode depender da rede, senao o
 * video sai com fallback do sistema sem ninguem perceber.
 */
const espera = delayRender("carregando fontes");

// `document.fonts.add` existe em todo navegador, mas a lib de tipos do TS
// descreve FontFaceSet sem ele. Um ponto so de conversao evita espalhar casts.
function registrar(fonte: FontFace): void {
  (document.fonts as unknown as { add(f: FontFace): void }).add(fonte);
}

Promise.all(
  [
    { arquivo: "fontes/archivo-600.woff2", peso: "600" },
    { arquivo: "fontes/archivo-700.woff2", peso: "700" },
  ].map(({ arquivo, peso }) => {
    const f = new FontFace("Archivo", `url(${staticFile(arquivo)}) format("woff2")`, {
      weight: peso,
    });
    return f.load().then(registrar);
  }).concat([
    new FontFace("IBM Plex Mono", `url(${staticFile("fontes/plex-mono-400.woff2")}) format("woff2")`)
      .load()
      .then(registrar),
  ]),
)
  .then(() => continueRender(espera))
  .catch(() => continueRender(espera));
