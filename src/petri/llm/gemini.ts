/**
 * Gemini over plain fetch, like the FMEA app (src/utils/llm.ts): no SDK,
 * full control over models and errors.
 *
 * The free tier is contested: 503 "high demand" is routine and some models
 * just hang instead of failing. So every call has a deadline, one retry, and
 * a chain of models — first to answer wins.
 *
 * The key comes from VITE_GOOGLE_API_KEY (the same one the FMEA uses) or from
 * a key the user pasted, kept only in this browser. Either way it ships to
 * the browser: fine for a prototype, and the first thing to move behind a
 * server function if this becomes a product.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** In order of preference; same family the Bancada app runs in production. */
export const MODEL_CHAIN = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

const OWN_KEY = 'petriplc:apiKey';
const TIMEOUT_MS = 90_000;

export type LlmErrorKind = 'no-key' | 'auth' | 'quota' | 'overloaded' | 'network' | 'bad-response' | 'aborted';

export class LlmError extends Error {
  constructor(
    public readonly kind: LlmErrorKind,
    message: string,
  ) {
    super(message);
  }
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ownKey(): string {
  try {
    return storage()?.getItem(OWN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setOwnKey(key: string) {
  try {
    if (key.trim()) storage()?.setItem(OWN_KEY, key.trim());
    else storage()?.removeItem(OWN_KEY);
  } catch {
    // Private mode: the key lives only for this page.
  }
}

export function siteKey(): string {
  const key = import.meta.env?.VITE_GOOGLE_API_KEY as string | undefined;
  return key && key !== 'your_google_api_key_here' ? key : '';
}

export const apiKey = () => ownKey() || siteKey();

export interface Turn {
  role: 'user' | 'model';
  text: string;
}

export interface JsonRequest {
  system: string;
  turns: Turn[];
  schema?: object;
  temperature?: number;
  signal?: AbortSignal;
  /** Called before each attempt, to show which model is thinking. */
  onAttempt?: (model: string) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The distinct reasons Google gave, without the model prefix — what a person needs to fix the key. */
export function reasons(message: string): string[] {
  const lines = message.split('\n').map((l) => l.replace(/^gemini-[\w.-]+: /, '').trim());
  return [...new Set(lines.filter(Boolean))].slice(0, 2).map((r) => r.slice(0, 240));
}

/** First JSON object in the text — tolerates code fences and chatter around it. */
export function extractJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error('no JSON in the answer');
  }
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

export async function generateJson(req: JsonRequest): Promise<{ data: unknown; model: string }> {
  const key = apiKey();
  if (!key) throw new LlmError('no-key', 'No Google API key configured.');

  const errors: string[] = [];
  let sawQuota = false;
  // Per model: refused (401/403), or missing (404) — when that is all there is, the key is the problem.
  let refused = 0;
  let missing = 0;
  let useSchema = Boolean(req.schema);

  for (const model of MODEL_CHAIN) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (req.signal?.aborted) throw new LlmError('aborted', 'Cancelled.');
      req.onAttempt?.(model);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const relay = () => controller.abort();
      req.signal?.addEventListener('abort', relay);

      try {
        const body = {
          systemInstruction: { parts: [{ text: req.system }] },
          contents: req.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
          generationConfig: {
            temperature: req.temperature ?? 0.2,
            responseMimeType: 'application/json',
            ...(useSchema ? { responseSchema: req.schema } : {}),
          },
        };
        const res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (res.ok) {
          const json = await res.json();
          const parts: GeminiPart[] = json?.candidates?.[0]?.content?.parts ?? [];
          const text = parts
            .filter((p) => !p.thought && typeof p.text === 'string')
            .map((p) => p.text)
            .join('');
          if (!text) {
            errors.push(`${model}: empty answer (${json?.candidates?.[0]?.finishReason ?? 'no candidate'})`);
            break;
          }
          try {
            return { data: extractJson(text), model };
          } catch {
            errors.push(`${model}: answer was not JSON`);
            continue;
          }
        }

        const detail = await res.json().catch(() => null);
        const msg: string = detail?.error?.message ?? `HTTP ${res.status}`;
        errors.push(`${model}: ${res.status} ${msg.slice(0, 160)}`);

        if (res.status === 400 && /api key/i.test(msg)) throw new LlmError('auth', msg);
        // A 403 can be about one model the key may not use, not the key itself: try the next model.
        if (res.status === 401 || res.status === 403) {
          refused++;
          break;
        }
        if (res.status === 400 && useSchema && /schema|response_schema|responseSchema/i.test(msg)) {
          useSchema = false;
          continue;
        }
        if (res.status === 429) {
          sawQuota = true;
          break;
        }
        if (res.status === 404 || res.status === 400) {
          missing++;
          break;
        }
        if (attempt < 2) await sleep(1200);
      } catch (e) {
        if (e instanceof LlmError) throw e;
        if (req.signal?.aborted) throw new LlmError('aborted', 'Cancelled.');
        const timedOut = controller.signal.aborted;
        errors.push(`${model}: ${timedOut ? 'no answer in time' : (e as Error).message}`);
        if (timedOut) break;
        if (attempt < 2) await sleep(1200);
      } finally {
        clearTimeout(timer);
        req.signal?.removeEventListener('abort', relay);
      }
    }
  }

  const summary = errors.join('\n');
  if (refused > 0 && refused + missing === MODEL_CHAIN.length) throw new LlmError('auth', summary);
  if (sawQuota) throw new LlmError('quota', summary);
  if (errors.every((e) => /fetch|network|Failed/i.test(e))) throw new LlmError('network', summary);
  if (errors.some((e) => /not JSON|empty answer/.test(e))) throw new LlmError('bad-response', summary);
  throw new LlmError('overloaded', summary);
}
