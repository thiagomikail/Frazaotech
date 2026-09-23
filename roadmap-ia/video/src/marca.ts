import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Identidade Go Agentes — mesma paleta do site (roadmap-ia/app/globals.css).
export const C = {
  preto: "#1C1C1E",
  papel: "#F2F0EC",
  tinta: "#2C3E50",
  ouro: "#C8A84E",
  coral: "#D94F4F",
  oliva: "#8B9A46",
  branco: "#FFFFFF",
};

export const FONTE = "Montserrat, Arial, sans-serif";

// Fonte embutida em public/fonts (Fontsource, OFL) em vez do Google Fonts:
// a renderização não depende de rede.
for (const peso of ["400", "600", "700", "800"]) {
  loadFont({ family: "Montserrat", url: staticFile(`fonts/montserrat-latin-${peso}-normal.woff2`), weight: peso });
}
