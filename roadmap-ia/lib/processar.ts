import "server-only";
import { analisar } from "./analise";
import { buscar, gravarAnalise, gravarErro } from "./diagnosticos";
import { SemIA } from "./gemini";
import { consumir } from "./limite";
import { TODAS_PERGUNTAS, respondida, type Respostas } from "./perguntas";

/** Só aceita o que o questionário conhece: id sabido, opção existente, texto com teto. */
export function limparRespostas(bruto: unknown): Respostas | null {
  if (!bruto || typeof bruto !== "object") return null;
  const b = bruto as Record<string, unknown>;
  const r: Respostas = {};

  for (const p of TODAS_PERGUNTAS) {
    const v = b[p.id];
    if (p.tipo === "unica" && typeof v === "string" && p.opcoes.some((o) => o.valor === v)) r[p.id] = v;
    if (p.tipo === "multipla" && Array.isArray(v)) {
      const ok = v.filter((x): x is string => typeof x === "string" && p.opcoes.some((o) => o.valor === x));
      r[p.id] = [...new Set(ok)].slice(0, p.max ?? ok.length);
    }
    if (p.tipo === "texto" && typeof v === "string") r[p.id] = v.trim().slice(0, 2000);
    if (p.tipo === "horas" && v && typeof v === "object") {
      const h: Record<string, string> = {};
      for (const a of p.areas) {
        const x = (v as Record<string, unknown>)[a];
        if (typeof x === "string" && ["0", "1-3", "3-8", "8-15", "15+"].includes(x)) h[a] = x;
      }
      r[p.id] = h;
    }
  }
  return TODAS_PERGUNTAS.every((p) => respondida(p, r)) ? r : null;
}

/**
 * Gera (ou regera) a análise de um diagnóstico já gravado. Nunca lança:
 * o relatório determinístico existe de qualquer jeito, e a falha vira
 * mensagem na tela com botão de tentar de novo.
 */
export async function gerarAnalise(id: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const d = await buscar(id);
  if (!d) return { ok: false, erro: "Diagnóstico não encontrado." };
  if (d.analise) return { ok: true };

  try {
    await consumir(d.email);
    const { analise, modelo } = await analisar(d.respostas, d.pontuacao, d);
    await gravarAnalise(id, analise, modelo);
    return { ok: true };
  } catch (e) {
    const erro =
      e instanceof SemIA
        ? e.message
        : "A IA não respondeu agora. Suas respostas estão salvas — tente de novo em alguns minutos.";
    console.error("analise falhou", id, e);
    await gravarErro(id, erro).catch(() => {});
    return { ok: false, erro };
  }
}
