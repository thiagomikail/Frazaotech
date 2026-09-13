/** Datas. Puro — mesma regra do lib/dinheiro.ts, sem `server-only`. */

/** A Hotmart fala em epoch de milissegundos em toda a API. */
export function deEpoch(ms: number | string | null | undefined): Date | null {
  if (ms === null || ms === undefined || ms === "") return null;
  const n = typeof ms === "string" ? Number(ms) : ms;
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n);
}

export function paraEpoch(data: Date): number {
  return data.getTime();
}

/** Chave de agrupamento mensal: "2026-09". Usada em MRR e cohort. */
export function chaveMes(data: Date): string {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function chaveDia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function inicioDoMes(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

export function somarMeses(data: Date, meses: number): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + meses, data.getUTCDate()));
}

export function somarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 86_400_000);
}

export function diasEntre(de: Date, ate: Date): number {
  return Math.floor((ate.getTime() - de.getTime()) / 86_400_000);
}

/** Data absoluta, nunca "semana passada". */
export function formatarData(data: Date | null | undefined): string {
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
}

export function formatarDataHora(data: Date | null | undefined): string {
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(data);
}

export function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" })
    .format(data)
    .replace(".", "");
}

/**
 * Quebra um intervalo longo em janelas. A Hotmart limita o alcance de cada
 * consulta de historico, entao o backfill de anos precisa andar em pedacos —
 * e cada pedaco que fecha vira um marco em SincronizacaoLog, pra que uma
 * queda no meio nao obrigue a recomecar do zero.
 */
export function janelas(de: Date, ate: Date, dias = 30): Array<{ inicio: Date; fim: Date }> {
  const saida: Array<{ inicio: Date; fim: Date }> = [];
  let cursor = new Date(de.getTime());
  while (cursor < ate) {
    const fim = new Date(Math.min(somarDias(cursor, dias).getTime(), ate.getTime()));
    saida.push({ inicio: new Date(cursor.getTime()), fim });
    cursor = fim;
  }
  return saida;
}
