import { AREAS, IDS_AREAS, type AreaId, type Respostas } from "./perguntas";

/**
 * A parte DETERMINÍSTICA da análise. Roda sem IA, sempre dá o mesmo número
 * pra mesma resposta, e é o que o modelo recebe como chão.
 *
 * Por que não deixar tudo com o modelo: LLM tende a agradar. Dado "onde a IA
 * ajuda?", ele responde "em tudo". A conta aqui força uma ordem — e o modelo
 * tem que justificar se discordar dela.
 *
 * A lógica é Teoria das Restrições: hora economizada fora do gargalo não vira
 * dinheiro. Por isso cada frente é multiplicada pelo gargalo — o que as
 * respostas mostram, não o que a pessoa declarou (ver `inferirRestricao`).
 */

export type Restricao = "capacidade" | "demanda" | "margem" | "indefinida";

export type Frente = {
  area: AreaId;
  horas: number;
  /** Teto otimista: horas/semana que a IA poderia devolver nessa frente. */
  horasLiberaveis: number;
  multiplicador: number;
  valor: number;
  bloqueios: string[];
};

export type Alerta = { nivel: "critico" | "atencao"; texto: string };

export type Pontuacao = {
  restricao: Restricao;
  restricaoInferida: Restricao;
  frentes: Frente[];
  horasTotais: number;
  horasLiberaveisTotais: number;
  prontidao: { nota: number; nivel: "arrumar" | "piloto" | "escalar"; rotulo: string };
  alertas: Alerta[];
};

const HORAS: Record<string, number> = { "0": 0, "1-3": 2, "3-8": 5.5, "8-15": 11.5, "15+": 18 };

/** Quanto o gargalo pesa em cada frente. Linha = gargalo, coluna = frente. */
const PESO: Record<Restricao, Record<AreaId, number>> = {
  // Não dá conta: tudo que devolve hora da operação vale ouro; mais lead piora.
  capacidade: { atendimento: 1.4, proposta: 1.5, roteiro: 1.2, posvenda: 1.2, marketing: 0.4, relacionamento: 0.8, backoffice: 1.0 },
  // Falta cliente: a base que já comprou é a demanda mais barata que existe.
  demanda: { atendimento: 0.9, proposta: 0.6, roteiro: 0.6, posvenda: 0.6, marketing: 1.3, relacionamento: 1.6, backoffice: 0.5 },
  // Trabalha muito e sobra pouco: valor percebido e cliente certo, não velocidade.
  margem: { atendimento: 1.2, proposta: 0.9, roteiro: 1.3, posvenda: 0.8, marketing: 0.8, relacionamento: 1.3, backoffice: 1.0 },
  indefinida: { atendimento: 1, proposta: 1, roteiro: 1, posvenda: 1, marketing: 1, relacionamento: 1, backoffice: 1 },
};

const s = (r: Respostas, id: string) => (typeof r[id] === "string" ? (r[id] as string) : "");
const lista = (r: Respostas, id: string) => (Array.isArray(r[id]) ? (r[id] as string[]) : []);

/**
 * O gargalo declarado nem sempre é o real. Quem diz "falta cliente" mas leva
 * dois dias pra responder quem chega tem problema de capacidade vestido de
 * problema de demanda.
 */
function inferirRestricao(r: Respostas): Restricao {
  const lenta = ["1-2d", "2d+"].includes(s(r, "resposta"));
  const sobrecarregado = ["50-60", "60+"].includes(s(r, "horasDono"));
  if (lenta && sobrecarregado) return "capacidade";
  if (s(r, "perda") === "demora") return "capacidade";
  if (s(r, "perda") === "preco" && s(r, "dobro") !== "demanda") return "margem";
  if (["ate10"].includes(s(r, "leads")) && !lenta) return "demanda";
  return (s(r, "dobro") as Restricao) || "indefinida";
}

export function pontuar(r: Respostas): Pontuacao {
  const declarada = ((s(r, "dobro") as Restricao) || "indefinida") as Restricao;
  const inferida = inferirRestricao(r);
  // Quando declarado e inferido brigam, vale o inferido: é o que as outras
  // respostas mostram. A contradição vira alerta, não some. (Sem sinal
  // nenhum, `inferirRestricao` devolve o próprio declarado.)
  const restricao = inferida;

  const horas = (r.horas ?? {}) as Record<string, string>;
  const odeia = lista(r, "odeia");
  const dados = s(r, "dados");
  const leads = s(r, "leads");
  const processo = s(r, "processo");

  const frentes: Frente[] = IDS_AREAS.map((area) => {
    const h = HORAS[horas[area]] ?? 0;
    let mult = PESO[restricao][area];
    const bloqueios: string[] = [];

    if (area === "relacionamento" && (dados === "cabeca" || dados === "crm_parado")) {
      mult *= 0.5;
      bloqueios.push("Sem base de clientes organizada, não há o que a IA ler.");
    }
    if (area === "atendimento" && leads === "ate10") {
      mult *= 0.5;
      bloqueios.push("Com menos de 10 pedidos por mês, automatizar atendimento resolve um problema que você não tem.");
    }
    if (area === "atendimento" && processo === "nada") {
      mult *= 0.8;
      bloqueios.push("Sem roteiro de qualificação escrito, o robô não sabe o que perguntar.");
    }
    if (area === "roteiro" && s(r, "modelo") === "personalizado") {
      bloqueios.push("Curadoria é o seu produto: IA entra no rascunho, nunca na entrega.");
    }
    if (odeia.includes(area)) mult *= 1.15;

    const horasLiberaveis = h * AREAS[area].adequacao;
    return { area, horas: h, horasLiberaveis, multiplicador: mult, valor: horasLiberaveis * mult, bloqueios };
  }).sort((a, b) => b.valor - a.valor);

  const horasTotais = frentes.reduce((t, f) => t + f.horas, 0);
  const horasLiberaveisTotais = frentes.reduce((t, f) => t + f.horasLiberaveis, 0);

  return {
    restricao,
    restricaoInferida: inferida,
    frentes,
    horasTotais,
    horasLiberaveisTotais,
    prontidao: prontidao(r),
    alertas: alertas(r, declarada, inferida, frentes),
  };
}

function prontidao(r: Respostas): Pontuacao["prontidao"] {
  const pts =
    ({ cabeca: 0, planilha: 15, crm_parado: 10, crm: 30 }[s(r, "dados")] ?? 0) +
    ({ nada: 0, alguns: 12, manual: 25 }[s(r, "processo")] ?? 0) +
    ({ nunca: 0, texto: 8, semanal: 18, automacao: 25 }[s(r, "usoIA")] ?? 0) +
    ({ ate2: 0, "2-5": 12, "5+": 20 }[s(r, "tempoImplantar")] ?? 0);

  if (pts < 35) return { nota: pts, nivel: "arrumar", rotulo: "Arrume a casa antes" };
  if (pts < 70) return { nota: pts, nivel: "piloto", rotulo: "Pronta pra um piloto" };
  return { nota: pts, nivel: "escalar", rotulo: "Pronta pra escalar" };
}

function alertas(r: Respostas, declarada: Restricao, inferida: Restricao, frentes: Frente[]): Alerta[] {
  const a: Alerta[] = [];
  const resposta = s(r, "resposta");
  const lenta = ["1-2d", "2d+"].includes(resposta);

  if (declarada === "demanda" && lenta) {
    a.push({
      nivel: "critico",
      texto: "Você diz que falta cliente, mas o lead que chega espera mais de um dia pela primeira resposta. Antes de buscar mais gente, pare de perder quem já chegou.",
    });
  } else if (declarada !== "indefinida" && declarada !== inferida) {
    a.push({
      nivel: "atencao",
      texto: `Você marcou o gargalo como ${NOMES_RESTRICAO[declarada]}, mas o resto das respostas aponta ${NOMES_RESTRICAO[inferida]}. A análise segue o que as respostas mostram.`,
    });
  }

  if (["ate1", "1-2"].includes(s(r, "conversao")) && resposta === "1h") {
    a.push({
      nivel: "critico",
      texto: "Você responde rápido e ainda converte pouco. O problema não é velocidade — é quem está chegando ou como você se posiciona. IA não conserta posicionamento.",
    });
  }
  if (s(r, "perda") === "preco") {
    a.push({
      nivel: "atencao",
      texto: "Perder por preço é problema de percepção de valor. IA que deixa sua proposta mais rápida não a deixa mais valiosa.",
    });
  }
  if (s(r, "conversao") === "nsei" || s(r, "recompra") === "nsei") {
    a.push({
      nivel: "critico",
      texto: "Você não sabe sua taxa de conversão ou de recompra. Sem esse número hoje, em 90 dias não vai saber se a IA funcionou. Medir vem antes de automatizar.",
    });
  }
  if (s(r, "equipe") === "1" && s(r, "horasDono") === "60+") {
    a.push({
      nivel: "atencao",
      texto: "Uma pessoa só, acima de 60h por semana: qualquer implantação que exija mais de 2h por semana vai morrer na segunda semana. O primeiro passo tem que devolver tempo antes de pedir.",
    });
  }
  if (s(r, "orcamento") === "0" && s(r, "tempoImplantar") === "ate2") {
    a.push({
      nivel: "atencao",
      texto: "Sem orçamento e sem tempo, o roadmap cabe em uma ferramenta gratuita e um único piloto. Tentar mais que isso é abandono garantido.",
    });
  }
  if (s(r, "modelo") === "personalizado" && frentes.slice(0, 3).some((f) => f.area === "marketing")) {
    a.push({
      nivel: "atencao",
      texto: "Alto padrão vende diferenciação. Conteúdo gerado por IA sem edição forte deixa você com a mesma voz de todo mundo — o oposto do que você vende.",
    });
  }
  if (lista(r, "medo").includes("erro")) {
    a.push({
      nivel: "atencao",
      texto: "Seu medo de passar informação errada é legítimo: nada que a IA gerar vai direto pro cliente sem revisão humana. Isso está embutido no roadmap.",
    });
  }
  if (frentes.every((f) => f.horas <= 2)) {
    a.push({
      nivel: "critico",
      texto: "Pelas horas que você informou, nenhuma frente consome tempo relevante. Ou o chute ficou baixo, ou IA não é o seu problema agora.",
    });
  }
  return a;
}

export const NOMES_RESTRICAO: Record<Restricao, string> = {
  capacidade: "capacidade (não dá conta)",
  demanda: "demanda (falta cliente)",
  margem: "margem (trabalha muito, sobra pouco)",
  indefinida: "indefinido",
};
