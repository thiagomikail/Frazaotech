import "server-only";
import { GoogleGenAI } from "@google/genai";

/**
 * Copiado do Bancada: mesma chave Google, mesmo comportamento observado.
 *
 * O nivel gratuito e disputado: 503 ("high demand") acontece o tempo todo, e
 * alguns modelos simplesmente nao respondem em vez de dar erro. Por isso toda
 * chamada tem prazo, retentativa e uma fila de modelos — nao e paranoia, e o
 * comportamento observado.
 *
 * `MODELO_ANALISE` (opcional) entra na frente da fila — pra testar um modelo
 * mais forte sem mexer no código.
 */

/** Em ordem de preferencia. O primeiro que responder ganha. */
export const MODELOS_TEXTO = [
  ...(process.env.MODELO_ANALISE ? [process.env.MODELO_ANALISE] : []),
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];

let cliente: GoogleGenAI | null = null;

export function gemini() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY nao definida. Veja .env.example.");
  }
  cliente ??= new GoogleGenAI({ apiKey });
  return cliente;
}

export class SemIA extends Error {
  constructor(
    public readonly motivo: "sobrecarregado" | "sem_faturamento" | "falhou" | "limite_diario",
    mensagem: string,
  ) {
    super(mensagem);
  }
}

function comPrazo<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("sem resposta a tempo")), ms)),
  ]);
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tenta cada modelo da fila, com prazo e uma retentativa por modelo.
 * `chamada` recebe o nome do modelo e devolve o que a API devolver.
 */
export async function tentarModelos<T>(
  modelos: string[],
  chamada: (modelo: string) => Promise<T>,
  { prazoMs = 60_000, tentativasPorModelo = 2 } = {},
): Promise<T> {
  let ultimo = "";
  let semFaturamento = false;

  for (const modelo of modelos) {
    for (let tentativa = 1; tentativa <= tentativasPorModelo; tentativa++) {
      try {
        return await comPrazo(chamada(modelo), prazoMs);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ultimo = `${modelo}: ${msg.slice(0, 160)}`;

        // 429 aqui e quota/faturamento, nao rajada: nao adianta insistir.
        if (msg.includes('"code":429') || msg.includes("billing")) {
          semFaturamento = true;
          break;
        }
        if (tentativa < tentativasPorModelo) await dormir(1200 * tentativa);
      }
    }
  }

  if (semFaturamento) {
    throw new SemIA("sem_faturamento", "A cota do Google estourou (429). Tente mais tarde.");
  }
  throw new SemIA(
    "sobrecarregado",
    `Nenhum modelo respondeu. Último erro — ${ultimo}`,
  );
}
