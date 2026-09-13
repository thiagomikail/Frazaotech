/**
 * Dinheiro em centavos, inteiro, sempre.
 *
 * Arquivo puro de proposito: e importado tanto por componente de servidor
 * quanto por grafico no cliente. Nao pode ganhar `server-only` nem importar
 * nada que tenha — senao arrasta o Prisma pro navegador e quebra o build.
 */

/** A API da Hotmart devolve `97.9` (reais). Aqui vira `9790`. */
export function paraCentavos(valor: number | string | null | undefined): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function formatar(centavos: number, moeda = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

/** Para eixo de grafico e cartao de destaque, onde o centavo e ruido. */
export function formatarCurto(centavos: number, moeda = "BRL"): string {
  const reais = centavos / 100;
  const abs = Math.abs(reais);
  const prefixo = moeda === "BRL" ? "R$ " : "";
  if (abs >= 1_000_000) return `${prefixo}${(reais / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefixo}${(reais / 1_000).toFixed(1)}k`;
  return `${prefixo}${reais.toFixed(0)}`;
}

export function percentual(parte: number, total: number, casas = 1): number {
  if (!total) return 0;
  return Number(((parte / total) * 100).toFixed(casas));
}

export function formatarPercentual(valor: number, casas = 1): string {
  return `${valor.toFixed(casas).replace(".", ",")}%`;
}

/** Variacao entre dois periodos. `null` quando nao havia base de comparacao. */
export function variacao(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return Number((((atual - anterior) / anterior) * 100).toFixed(1));
}
