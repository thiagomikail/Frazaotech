import "server-only";
import type { Analise } from "./analise-tipo";
import { gemini, MODELOS_TEXTO, tentarModelos } from "./gemini";
import { AREAS, TODAS_PERGUNTAS, rotuloDe, type Respostas } from "./perguntas";
import { NOMES_RESTRICAO, type Pontuacao } from "./pontuacao";

/**
 * A análise crítica. A pergunta que ela TEM que responder:
 *
 *     "Onde a IA adiciona mais valor pro negócio?"
 *
 * — no singular. Um lugar, com evidência tirada das respostas, e a lista do
 * que NÃO fazer agora. Relatório que recomenda IA em tudo não recomenda nada.
 *
 * O modelo recebe a pontuação determinística como chão (ver pontuacao.ts) e
 * pode discordar dela, mas tem que dizer por quê.
 */

const TEXTO = { type: "string" } as const;

const ESQUEMA = {
  type: "object",
  properties: {
    veredito: { type: "string", description: "2 a 3 frases. A resposta primeiro: onde a IA dá mais retorno nesta agência e o que isso destrava. Sem preâmbulo." },
    ondeMaisValor: {
      type: "object",
      properties: {
        area: { type: "string", description: "Uma frente só, com o nome concreto da tarefa (não a categoria genérica)." },
        porque: { type: "string", description: "Raciocínio causal: gargalo → tarefa → efeito no resultado. 3 a 5 frases." },
        evidencias: { type: "array", items: TEXTO, description: "2 a 4 fatos TIRADOS DAS RESPOSTAS que sustentam a escolha, citando a resposta." },
        ganhoEsperado: { type: "string", description: "Ganho realista em horas/semana ou efeito comercial, com a premissa explícita. Se não dá pra estimar, diga." },
      },
      required: ["area", "porque", "evidencias", "ganhoEsperado"],
    },
    naoFazerAgora: {
      type: "array",
      description: "2 a 4 usos de IA que parecem boa ideia pra esta agência mas NÃO são agora, e por quê.",
      items: { type: "object", properties: { tema: TEXTO, porque: TEXTO }, required: ["tema", "porque"] },
    },
    verdadesIncomodas: {
      type: "array",
      items: TEXTO,
      description: "2 a 4 constatações duras que as respostas revelam — contradições, problemas que não são de IA, autoengano. Direto, sem ofender.",
    },
    roadmap: {
      type: "array",
      description: "3 fases: 'Fase 0 — pré-requisitos' (0–30 dias), 'Fase 1 — piloto' (30–60), 'Fase 2 — escalar ou matar' (60–90+).",
      items: {
        type: "object",
        properties: {
          nome: TEXTO,
          prazo: TEXTO,
          objetivo: { type: "string", description: "Uma frase: o que precisa ser verdade no fim da fase." },
          acoes: {
            type: "array",
            description: "1 a 3 ações. Menos é mais: cabe no tempo que a pessoa disse que tem.",
            items: {
              type: "object",
              properties: {
                acao: { type: "string", description: "Verbo no imperativo + objeto concreto." },
                como: { type: "string", description: "Passo a passo curto, executável por quem não é técnico." },
                ferramenta: { type: "string", description: "Categoria + exemplo (ex.: 'assistente de chat — ChatGPT, Claude ou Gemini'). 'Nenhuma' quando for processo. Nunca invente produto." },
                horasSemana: { type: "string", description: "Esforço de implantação em horas/semana." },
                sucesso: { type: "string", description: "Critério MEDÍVEL de sucesso, com número." },
                parar: { type: "string", description: "Critério de parada: o que, se acontecer, significa abandonar esta ação." },
              },
              required: ["acao", "como", "ferramenta", "horasSemana", "sucesso", "parar"],
            },
          },
        },
        required: ["nome", "prazo", "objetivo", "acoes"],
      },
    },
    metricas: {
      type: "array",
      description: "2 a 3 números a medir desde já, pra saber se a IA funcionou.",
      items: {
        type: "object",
        properties: {
          nome: TEXTO,
          comoMedir: TEXTO,
          hoje: { type: "string", description: "O valor atual segundo as respostas, ou 'não medido'." },
        },
        required: ["nome", "comoMedir", "hoje"],
      },
    },
    riscos: {
      type: "array",
      items: { type: "object", properties: { risco: TEXTO, mitigacao: TEXTO }, required: ["risco", "mitigacao"] },
      description: "2 a 3 riscos específicos deste roadmap.",
    },
    pergunta: { type: "string", description: "Uma pergunta pra pessoa levar pra casa — a que ela está evitando." },
  },
  required: ["veredito", "ondeMaisValor", "naoFazerAgora", "verdadesIncomodas", "roadmap", "metricas", "riscos", "pergunta"],
};

function montarPrompt(r: Respostas, p: Pontuacao, perfil: { nome?: string | null; agencia?: string | null }) {
  const respostas = TODAS_PERGUNTAS.map((q) => `- ${q.titulo}\n  → ${rotuloDe(q, r[q.id])}`).join("\n");

  const ranking = p.frentes
    .map((f, i) =>
      `${i + 1}. ${AREAS[f.area].nome}: ${f.horas}h/sem gastas, ~${f.horasLiberaveis.toFixed(1)}h liberáveis, peso do gargalo ×${f.multiplicador.toFixed(2)}, valor ${f.valor.toFixed(1)}` +
      (f.bloqueios.length ? `\n   bloqueios: ${f.bloqueios.join(" ")}` : ""),
    )
    .join("\n");

  return [
    "Você é um consultor sênior de operações para agências de viagem no Brasil. Já implantou IA em dezenas de",
    "agências pequenas e viu a maioria das implantações morrer em 3 semanas. Sua reputação vem de dizer o que",
    "ninguém diz. Você está escrevendo para um(a) aluno(a) da Go Agentes, escola de agentes de viagem focada em",
    "diferenciação, roteiros personalizados e atendimento humano.",
    "",
    "A PERGUNTA QUE O RELATÓRIO RESPONDE: onde a IA adiciona MAIS valor para ESTE negócio — no singular.",
    "",
    "COMO PENSAR:",
    "1. Ache o gargalo real (Teoria das Restrições). Hora economizada fora do gargalo não vira dinheiro.",
    "   Mais leads para quem não dá conta piora o negócio. Proposta mais rápida para quem perde por preço não resolve.",
    "2. Separe problema de IA de problema que não é de IA (preço, posicionamento, falta de processo, falta de medição).",
    "   Se o maior problema não é de IA, diga isso primeiro — e ainda assim aponte onde a IA ajuda.",
    "3. A escolha tem que caber no tempo e no orçamento que a pessoa declarou. Roadmap que não cabe é abandono.",
    "4. Nada gerado por IA vai para o cliente sem revisão humana. Preço, tarifa, disponibilidade e regra de visto",
    "   NUNCA vêm da IA — só de fonte oficial.",
    "5. Na agência de alto padrão/personalizada, a curadoria é o produto: IA acelera o bastidor, não assina a entrega.",
    "",
    "REGRAS DE ESCRITA:",
    "· Português do Brasil, 'você', frases curtas. Tom de colega experiente, não de consultor vendendo projeto.",
    "· Proibido: elogio, 'a IA é uma grande aliada', 'no mundo atual', 'revolucionar', 'potencializar', generalidades.",
    "· Toda afirmação sobre o negócio cita a resposta que a sustenta. Não invente número que não foi informado.",
    "· Não invente nome de produto, preço de ferramenta ou estatística de mercado.",
    "· Seja específico: 'responder o primeiro áudio do WhatsApp com 5 perguntas de qualificação', não 'melhorar o atendimento'.",
    "",
    `QUEM RESPONDEU: ${perfil.nome ?? "—"} · agência ${perfil.agencia ?? "—"}`,
    "",
    "RESPOSTAS:",
    respostas,
    "",
    "PRÉ-ANÁLISE DETERMINÍSTICA (use como ponto de partida; pode discordar, mas justifique no 'porque'):",
    `Gargalo declarado: ${NOMES_RESTRICAO[(r.dobro as keyof typeof NOMES_RESTRICAO) ?? "indefinida"] ?? "—"}`,
    `Gargalo que as respostas indicam: ${NOMES_RESTRICAO[p.restricao]}`,
    `Horas/semana nas 7 frentes: ${p.horasTotais.toFixed(0)} · teto otimista liberável: ${p.horasLiberaveisTotais.toFixed(0)}`,
    `Prontidão: ${p.prontidao.rotulo} (${p.prontidao.nota}/100)`,
    "Ranking de valor (horas liberáveis × peso do gargalo):",
    ranking,
    "",
    "Alertas já detectados:",
    p.alertas.length ? p.alertas.map((a) => `- [${a.nivel}] ${a.texto}`).join("\n") : "- nenhum",
  ].join("\n");
}

export async function analisar(
  r: Respostas,
  p: Pontuacao,
  perfil: { nome?: string | null; agencia?: string | null },
): Promise<{ analise: Analise; modelo: string }> {
  const ai = gemini();
  let modelo = "";
  const res = await tentarModelos(
    MODELOS_TEXTO,
    (m) => {
      modelo = m;
      return ai.models.generateContent({
        model: m,
        contents: montarPrompt(r, p, perfil),
        config: { responseMimeType: "application/json", responseSchema: ESQUEMA, temperature: 0.4 },
      } as Parameters<typeof ai.models.generateContent>[0]);
    },
    // Uma tentativa por modelo: com 3–4 modelos na fila, isso cabe nos 300 s da rota.
    { prazoMs: 80_000, tentativasPorModelo: 1 },
  );

  const analise = JSON.parse(res.text ?? "{}") as Analise;
  if (!analise.veredito || !analise.ondeMaisValor?.area || !analise.roadmap?.length) {
    throw new Error("Análise veio incompleta.");
  }
  return { analise, modelo };
}

export { montarPrompt };
