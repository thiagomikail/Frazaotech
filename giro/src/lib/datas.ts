/** Datas sempre absolutas na interface — "22 ago", nunca "semana passada". */

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function formatarData(d: Date | string): string {
  const data = typeof d === "string" ? new Date(d) : d;
  return `${data.getDate()} ${MESES[data.getMonth()]}`;
}

export function formatarDataAno(d: Date | string): string {
  const data = typeof d === "string" ? new Date(d) : d;
  return `${formatarData(data)} ${data.getFullYear()}`;
}

export function diasAtras(dias: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dias);
  return d;
}

export function diasEntre(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

/** Competencia de cobranca: "2026-09". */
export function competenciaAtual(agora = new Date()): string {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

export function inicioDoMes(offsetMeses = 0): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offsetMeses, 1);
}

export function paraInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
