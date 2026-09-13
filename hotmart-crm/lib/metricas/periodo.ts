/** Selecao de periodo. Puro — o seletor na barra do painel e componente cliente. */

import { somarDias, inicioDoMes, somarMeses } from "../datas";

export const PERIODOS = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  "12m": "12 meses",
  tudo: "Tudo",
} as const;

export type ChavePeriodo = keyof typeof PERIODOS;

export interface Periodo {
  de: Date;
  ate: Date;
  /** Mesma duracao, imediatamente antes. E o que da sentido a variacao %. */
  deAnterior: Date;
  ateAnterior: Date;
  /** Serie diaria fica ilegivel acima de ~90 dias. */
  granularidade: "dia" | "mes";
}

export function resolverPeriodo(chave: ChavePeriodo, agora = new Date()): Periodo {
  const ate = agora;

  const de = (() => {
    switch (chave) {
      case "7d":
        return somarDias(ate, -7);
      case "30d":
        return somarDias(ate, -30);
      case "90d":
        return somarDias(ate, -90);
      case "12m":
        return somarMeses(inicioDoMes(ate), -11);
      case "tudo":
        // A Hotmart nasceu em 2011; nenhum historico comeca antes disso.
        return new Date(Date.UTC(2011, 0, 1));
    }
  })();

  const duracao = ate.getTime() - de.getTime();

  return {
    de,
    ate,
    deAnterior: new Date(de.getTime() - duracao),
    ateAnterior: de,
    granularidade: chave === "7d" || chave === "30d" || chave === "90d" ? "dia" : "mes",
  };
}

export function ehChaveValida(valor: string | undefined): valor is ChavePeriodo {
  return !!valor && valor in PERIODOS;
}
