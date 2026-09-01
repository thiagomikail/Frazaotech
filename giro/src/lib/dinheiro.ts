/**
 * Dinheiro no Giro e sempre Int em centavos. Este arquivo nao importa
 * `server-only` de proposito: componente cliente precisa formatar valor.
 */

export function formatarBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Versao curta para cartao e grafico: R$ 12,4 mil / R$ 1,2 mi */
export function formatarCurto(centavos: number): string {
  const reais = centavos / 100;
  const abs = Math.abs(reais);
  if (abs >= 1_000_000) return `R$ ${(reais / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (abs >= 1_000) return `R$ ${(reais / 1_000).toFixed(1).replace(".", ",")} mil`;
  return formatarBRL(centavos);
}

/**
 * Aceita o que o dono da padaria digita: "1.234,56", "1234.56", "R$ 80",
 * "80", "80,5". Devolve centavos. Retorna null quando nao da para ler.
 */
export function paraCentavos(entrada: string | number | null | undefined): number | null {
  if (entrada === null || entrada === undefined) return null;
  if (typeof entrada === "number") {
    return Number.isFinite(entrada) ? Math.round(entrada * 100) : null;
  }

  let texto = entrada.trim().replace(/r\$/i, "").replace(/\s/g, "");
  if (!texto) return null;

  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");

  if (temVirgula && temPonto) {
    // "1.234,56" (pt-BR) ou "1,234.56" (en) — manda quem aparece por ultimo.
    texto =
      texto.lastIndexOf(",") > texto.lastIndexOf(".")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto.replace(/,/g, "");
  } else if (temVirgula) {
    texto = texto.replace(",", ".");
  } else if (temPonto) {
    // "1.234" e mil e duzentos; "12.34" e doze e trinta e quatro centavos.
    const depois = texto.split(".").pop() ?? "";
    if (depois.length === 3) texto = texto.replace(/\./g, "");
  }

  const numero = Number(texto);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100);
}
