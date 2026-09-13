import "server-only";

/**
 * Cliente HTTP da Hotmart.
 *
 * Resolve tres coisas que toda chamada precisa e nenhuma rota deveria
 * reimplementar: token OAuth com cache, retry com backoff em 429/5xx, e
 * paginacao por `page_token`.
 */

const HOST_AUTH = "https://api-sec-vlc.hotmart.com";
const HOST_API = "https://developers.hotmart.com";
const HOST_API_SANDBOX = "https://sandbox.hotmart.com";

export class ErroHotmart extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly corpo?: unknown,
  ) {
    super(message);
    this.name = "ErroHotmart";
  }
}

function credenciais() {
  const id = process.env.HOTMART_CLIENT_ID;
  const secret = process.env.HOTMART_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "HOTMART_CLIENT_ID / HOTMART_CLIENT_SECRET nao definidos. " +
        "Gere em Hotmart > Ferramentas > Credenciais de API. Veja .env.example.",
    );
  }
  const basic =
    process.env.HOTMART_BASIC?.replace(/^Basic\s+/i, "") ||
    Buffer.from(`${id}:${secret}`).toString("base64");
  return { id, secret, basic };
}

function base() {
  return process.env.HOTMART_AMBIENTE === "sandbox" ? HOST_API_SANDBOX : HOST_API;
}

// ------------------------------------------------------------------ token

let tokenEmCache: { valor: string; expiraEm: number } | null = null;

/**
 * O token vale ~1h. Guardar em modulo e suficiente: no pior caso um cold
 * start novo pede outro. Renova 60s antes do fim pra nao correr o risco de
 * usar um token que expira no meio do voo.
 */
export async function obterToken(forcar = false): Promise<string> {
  const agora = Date.now();
  if (!forcar && tokenEmCache && tokenEmCache.expiraEm > agora + 60_000) {
    return tokenEmCache.valor;
  }

  const { id, secret, basic } = credenciais();
  const url =
    `${HOST_AUTH}/security/oauth/token` +
    `?grant_type=client_credentials&client_id=${encodeURIComponent(id)}` +
    `&client_secret=${encodeURIComponent(secret)}`;

  const resposta = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new ErroHotmart(
      `Falha ao autenticar na Hotmart (${resposta.status}). Confira client_id/secret.`,
      resposta.status,
      corpo,
    );
  }

  const dados = (await resposta.json()) as { access_token: string; expires_in: number };
  tokenEmCache = {
    valor: dados.access_token,
    expiraEm: agora + (dados.expires_in ?? 3600) * 1000,
  };
  return tokenEmCache.valor;
}

// ----------------------------------------------------------------- chamada

const ESPERA = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Parametros = Record<string, string | number | boolean | undefined | null>;

function montarUrl(caminho: string, params?: Parametros): string {
  const url = new URL(caminho.startsWith("http") ? caminho : `${base()}${caminho}`);
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== null && valor !== "") {
      url.searchParams.set(chave, String(valor));
    }
  }
  return url.toString();
}

/**
 * Uma chamada autenticada, com retry.
 *
 * 401 tenta uma vez com token novo (o cache pode ter vencido em voo).
 * 429 e 5xx voltam com backoff exponencial — a Hotmart limita por minuto, e
 * num backfill de anos bater no teto e rotina, nao excecao.
 */
export async function chamar<T>(
  caminho: string,
  params?: Parametros,
  tentativa = 0,
): Promise<T> {
  const token = await obterToken(tentativa === 1);
  const url = montarUrl(caminho, params);

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch (erro) {
    // Queda de rede tambem merece backoff: o backfill roda por minutos.
    if (tentativa < 5) {
      await ESPERA(2 ** tentativa * 1000);
      return chamar<T>(caminho, params, tentativa + 1);
    }
    throw erro;
  }

  if (resposta.status === 401 && tentativa === 0) {
    return chamar<T>(caminho, params, 1);
  }

  if ((resposta.status === 429 || resposta.status >= 500) && tentativa < 5) {
    const sugerido = Number(resposta.headers.get("retry-after"));
    const espera = Number.isFinite(sugerido) && sugerido > 0
      ? sugerido * 1000
      : 2 ** tentativa * 1000;
    await ESPERA(espera);
    return chamar<T>(caminho, params, tentativa + 1);
  }

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new ErroHotmart(
      `Hotmart respondeu ${resposta.status} em ${caminho}`,
      resposta.status,
      corpo,
    );
  }

  return (await resposta.json()) as T;
}

// --------------------------------------------------------------- paginacao

export interface PaginaHotmart<T> {
  items?: T[];
  page_info?: {
    total_results?: number;
    next_page_token?: string;
    prev_page_token?: string;
    results_per_page?: number;
  };
}

/**
 * Percorre todas as paginas de um endpoint de listagem.
 *
 * Generator em vez de array: um backfill de anos pode trazer dezenas de
 * milhares de registros, e segurar tudo em memoria pra so depois gravar e a
 * forma mais facil de estourar a funcao na Vercel.
 */
export async function* paginar<T>(
  caminho: string,
  params?: Parametros,
  maxPorPagina = 500,
): AsyncGenerator<T, void, void> {
  let pageToken: string | undefined;
  let paginas = 0;

  do {
    const pagina = await chamar<PaginaHotmart<T>>(caminho, {
      ...params,
      max_results: maxPorPagina,
      page_token: pageToken,
    });

    for (const item of pagina.items ?? []) yield item;

    pageToken = pagina.page_info?.next_page_token;
    paginas += 1;

    // Trava de seguranca: se a API devolver o mesmo token pra sempre, o
    // backfill vira laco infinito e so aparece na conta da Vercel.
    if (paginas > 5_000) {
      throw new Error(`paginar(${caminho}) passou de 5000 paginas — provavel laco.`);
    }
  } while (pageToken);
}

/** Versao em lista, pra quando o volume e sabidamente pequeno. */
export async function listar<T>(
  caminho: string,
  params?: Parametros,
  maxPorPagina = 500,
): Promise<T[]> {
  const saida: T[] = [];
  for await (const item of paginar<T>(caminho, params, maxPorPagina)) saida.push(item);
  return saida;
}
