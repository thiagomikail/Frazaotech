import "server-only";

/**
 * Cliente do OpenRouter. Uma unica porta de saida para IA no app inteiro.
 *
 * A chave vive so no servidor: nao existe (e nunca pode existir) variavel
 * NEXT_PUBLIC_ com credencial. O browser fala com as rotas do proprio Giro,
 * que falam com o OpenRouter.
 *
 * A API e compativel com a da OpenAI (/chat/completions), o que mantem a
 * porta aberta para trocar de provedor sem reescrever o agente.
 */

/**
 * Endereco configuravel. Serve a um gateway corporativo, a um proxy — e ao
 * espelho local de `scripts/espelho-ia.mjs`, que deixa testar o laco de
 * ferramentas do agente sem gastar token nem depender da rede.
 */
const ENDERECO =
  process.env.OPENROUTER_URL || "https://openrouter.ai/api/v1/chat/completions";

export type PapelChat = "system" | "user" | "assistant" | "tool";

export type MensagemChat = {
  role: PapelChat;
  content: string | null;
  tool_calls?: ChamadaDeFerramenta[];
  tool_call_id?: string;
  name?: string;
};

export type ChamadaDeFerramenta = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type DefinicaoFerramenta = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type Uso = { tokensEntrada: number; tokensSaida: number };

export type RespostaIA = {
  conteudo: string | null;
  chamadas: ChamadaDeFerramenta[];
  uso: Uso;
  modelo: string;
};

export class ErroIA extends Error {
  constructor(
    message: string,
    readonly codigo: "sem_chave" | "provedor" | "resposta_invalida",
  ) {
    super(message);
    this.name = "ErroIA";
  }
}

export function modeloPadrao(): string {
  return process.env.OPENROUTER_MODELO || "anthropic/claude-sonnet-4.5";
}

export function iaConfigurada(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

type Opcoes = {
  mensagens: MensagemChat[];
  ferramentas?: DefinicaoFerramenta[];
  modelo?: string;
  temperatura?: number;
  /** Forca a resposta a sair no formato de um JSON Schema. */
  esquemaJson?: { nome: string; esquema: Record<string, unknown> };
  maxTokens?: number;
};

export async function chamarIA(opcoes: Opcoes): Promise<RespostaIA> {
  const chave = process.env.OPENROUTER_API_KEY;
  if (!chave) {
    throw new ErroIA(
      "O consultor está desligado: falta a variável OPENROUTER_API_KEY. Pegue uma chave em openrouter.ai/keys.",
      "sem_chave",
    );
  }

  const modelo = opcoes.modelo ?? modeloPadrao();
  const corpo: Record<string, unknown> = {
    model: modelo,
    messages: opcoes.mensagens,
    temperature: opcoes.temperatura ?? 0.3,
    max_tokens: opcoes.maxTokens ?? 2000,
  };
  if (opcoes.ferramentas?.length) corpo.tools = opcoes.ferramentas;
  if (opcoes.esquemaJson) {
    corpo.response_format = {
      type: "json_schema",
      json_schema: {
        name: opcoes.esquemaJson.nome,
        strict: true,
        schema: opcoes.esquemaJson.esquema,
      },
    };
  }

  let resposta: Response;
  try {
    resposta = await fetch(ENDERECO, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
        // O OpenRouter usa estes dois para atribuicao no ranking publico.
        "HTTP-Referer": process.env.GIRO_URL || "http://localhost:3000",
        "X-Title": "Giro",
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (erro) {
    throw new ErroIA(
      `Não consegui falar com o OpenRouter: ${erro instanceof Error ? erro.message : String(erro)}`,
      "provedor",
    );
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new ErroIA(
      `OpenRouter respondeu ${resposta.status}. ${detalhe.slice(0, 400)}`,
      "provedor",
    );
  }

  const dados = (await resposta.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: ChamadaDeFerramenta[] } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
    error?: { message?: string };
  };

  if (dados.error) throw new ErroIA(dados.error.message ?? "Erro do provedor", "provedor");

  const mensagem = dados.choices?.[0]?.message;
  if (!mensagem) throw new ErroIA("O provedor devolveu uma resposta vazia.", "resposta_invalida");

  return {
    conteudo: mensagem.content ?? null,
    chamadas: mensagem.tool_calls ?? [],
    uso: {
      tokensEntrada: dados.usage?.prompt_tokens ?? 0,
      tokensSaida: dados.usage?.completion_tokens ?? 0,
    },
    modelo: dados.model ?? modelo,
  };
}
