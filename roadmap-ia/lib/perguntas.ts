/**
 * O questionário. Constante pura — importada pelo componente cliente, então
 * NADA de server-only aqui (a armadilha do Bancada: constante em arquivo de
 * servidor arrasta o banco pro navegador e quebra o build).
 *
 * Cada pergunta existe pra alimentar UMA decisão da análise. Pergunta que não
 * muda o roadmap não entra — questionário longo é taxa de abandono.
 */

export type Opcao = { valor: string; rotulo: string };

export type Pergunta =
  | { id: string; tipo: "unica"; titulo: string; ajuda?: string; opcoes: Opcao[] }
  | { id: string; tipo: "multipla"; titulo: string; ajuda?: string; opcoes: Opcao[]; max?: number }
  | { id: string; tipo: "texto"; titulo: string; ajuda?: string; minimo: number; placeholder?: string }
  | { id: string; tipo: "horas"; titulo: string; ajuda?: string; areas: readonly AreaId[] };

export type Bloco = { id: string; titulo: string; porque: string; perguntas: Pergunta[] };

/**
 * As sete frentes onde uma agência pode pôr IA. A análise inteira gira em
 * torno de escolher UMA delas primeiro — e dizer por que não as outras.
 *
 * `adequacao` = fração do trabalho que IA consegue de fato assumir hoje, com
 * gente revisando. Não é potencial teórico: é o que um agente de 1–10 pessoas
 * implanta sem time de tecnologia.
 */
export const AREAS = {
  atendimento: {
    nome: "Primeiro atendimento e qualificação",
    curto: "Atendimento",
    adequacao: 0.6,
    faz: "Responde na hora, faz as perguntas de qualificação, separa curioso de cliente e entrega o lead já triado.",
    naoFaz: "Não fecha venda de alto valor nem constrói confiança — isso continua sendo você.",
  },
  proposta: {
    nome: "Cotação e montagem de proposta",
    curto: "Proposta",
    adequacao: 0.5,
    faz: "Transforma briefing em rascunho de proposta, padroniza texto, compara opções que você já pesquisou.",
    naoFaz: "Não substitui consolidadora, GDS nem tarifa — preço e disponibilidade inventados são o maior risco aqui.",
  },
  roteiro: {
    nome: "Roteirização e curadoria",
    curto: "Roteiro",
    adequacao: 0.4,
    faz: "Acelera pesquisa, logística entre pontos e o primeiro rascunho do dia a dia.",
    naoFaz: "Não é curadoria. Se o cliente consegue o mesmo roteiro no ChatGPT, você não tem produto.",
  },
  posvenda: {
    nome: "Pós-venda, conferência e suporte em viagem",
    curto: "Pós-venda",
    adequacao: 0.55,
    faz: "Confere documentos contra reservas, monta checklists, dispara lembretes e reconfirmações.",
    naoFaz: "Não resolve crise em viagem nem assume a responsabilidade pelo erro.",
  },
  marketing: {
    nome: "Conteúdo e marketing",
    curto: "Marketing",
    adequacao: 0.65,
    faz: "Tira rascunho, adapta formato, reaproveita um conteúdo em cinco.",
    naoFaz: "Não cria posicionamento. Conteúdo genérico em escala deixa você mais parecida com todo mundo.",
  },
  relacionamento: {
    nome: "Base de clientes, recompra e indicação",
    curto: "Recompra",
    adequacao: 0.55,
    faz: "Lê o histórico, lembra datas, sugere a próxima viagem e escreve a mensagem de reativação.",
    naoFaz: "Não funciona sem base organizada. Sem dado, não há o que ler.",
  },
  backoffice: {
    nome: "Financeiro e administrativo",
    curto: "Backoffice",
    adequacao: 0.35,
    faz: "Extrai dados de fatura e voucher, concilia comissões, organiza planilha.",
    naoFaz: "Não substitui controle financeiro nem contador; erro de número aqui custa caro e aparece tarde.",
  },
} as const;

export type AreaId = keyof typeof AREAS;
export const IDS_AREAS = Object.keys(AREAS) as AreaId[];

export const FAIXAS_HORAS: Opcao[] = [
  { valor: "0", rotulo: "0" },
  { valor: "1-3", rotulo: "1–3h" },
  { valor: "3-8", rotulo: "3–8h" },
  { valor: "8-15", rotulo: "8–15h" },
  { valor: "15+", rotulo: "15h+" },
];

export const BLOCOS: Bloco[] = [
  {
    id: "negocio",
    titulo: "O seu negócio",
    porque: "IA que serve pra uma agência de grupos atrapalha uma de alto padrão. Primeiro, o que você vende.",
    perguntas: [
      {
        id: "modelo",
        tipo: "unica",
        titulo: "O que mais pesa no seu faturamento?",
        opcoes: [
          { valor: "personalizado", rotulo: "Lazer personalizado / alto padrão" },
          { valor: "pacotes", rotulo: "Lazer com pacotes e produtos prontos" },
          { valor: "corporativo", rotulo: "Corporativo" },
          { valor: "grupos", rotulo: "Grupos e eventos" },
          { valor: "nicho", rotulo: "Nicho (lua de mel, intercâmbio, religioso, esportivo…)" },
          { valor: "misto", rotulo: "Misto, sem um dominante" },
        ],
      },
      {
        id: "equipe",
        tipo: "unica",
        titulo: "Quantas pessoas trabalham na agência, contando você?",
        opcoes: [
          { valor: "1", rotulo: "Só eu" },
          { valor: "2-3", rotulo: "2 a 3" },
          { valor: "4-10", rotulo: "4 a 10" },
          { valor: "10+", rotulo: "Mais de 10" },
        ],
      },
      {
        id: "faturamento",
        tipo: "unica",
        titulo: "Vendas brutas por mês, em média",
        ajuda: "Faixa, não número. Serve só pra calibrar quanto vale uma hora sua.",
        opcoes: [
          { valor: "ate50", rotulo: "Até R$ 50 mil" },
          { valor: "50-150", rotulo: "R$ 50–150 mil" },
          { valor: "150-500", rotulo: "R$ 150–500 mil" },
          { valor: "500+", rotulo: "Mais de R$ 500 mil" },
          { valor: "nd", rotulo: "Prefiro não dizer" },
        ],
      },
      {
        id: "ticket",
        tipo: "unica",
        titulo: "Ticket médio por venda",
        opcoes: [
          { valor: "ate5", rotulo: "Até R$ 5 mil" },
          { valor: "5-15", rotulo: "R$ 5–15 mil" },
          { valor: "15-40", rotulo: "R$ 15–40 mil" },
          { valor: "40+", rotulo: "Mais de R$ 40 mil" },
        ],
      },
      {
        id: "leads",
        tipo: "unica",
        titulo: "Quantos pedidos de orçamento novos chegam por mês?",
        opcoes: [
          { valor: "ate10", rotulo: "Menos de 10" },
          { valor: "10-30", rotulo: "10 a 30" },
          { valor: "30-100", rotulo: "30 a 100" },
          { valor: "100-300", rotulo: "100 a 300" },
          { valor: "300+", rotulo: "Mais de 300" },
        ],
      },
      {
        id: "conversao",
        tipo: "unica",
        titulo: "De cada 10 orçamentos, quantos viram venda?",
        opcoes: [
          { valor: "ate1", rotulo: "Menos de 1" },
          { valor: "1-2", rotulo: "1 a 2" },
          { valor: "3-5", rotulo: "3 a 5" },
          { valor: "5+", rotulo: "Mais de 5" },
          { valor: "nsei", rotulo: "Não sei" },
        ],
      },
      {
        id: "recompra",
        tipo: "unica",
        titulo: "Dos clientes de 2 anos atrás, quantos compraram de novo?",
        opcoes: [
          { valor: "ate20", rotulo: "Menos de 20%" },
          { valor: "20-40", rotulo: "20–40%" },
          { valor: "40-60", rotulo: "40–60%" },
          { valor: "60+", rotulo: "Mais de 60%" },
          { valor: "nsei", rotulo: "Não sei" },
        ],
      },
    ],
  },
  {
    id: "gargalo",
    titulo: "O gargalo",
    porque: "IA aplicada fora do gargalo só deixa mais rápido o que não limita o seu resultado.",
    perguntas: [
      {
        id: "dobro",
        tipo: "unica",
        titulo: "Se amanhã chegasse o DOBRO de pedidos de orçamento, o que aconteceria?",
        ajuda: "Pense no que aconteceria de verdade, não no que você gostaria.",
        opcoes: [
          { valor: "capacidade", rotulo: "Eu não daria conta: atrasaria respostas e perderia vendas" },
          { valor: "demanda", rotulo: "Daria conta tranquila — o que falta é cliente" },
          { valor: "margem", rotulo: "Daria conta, mas trabalharia o dobro e sobraria pouco a mais" },
          { valor: "indefinida", rotulo: "Não sei dizer" },
        ],
      },
      {
        id: "horasDono",
        tipo: "unica",
        titulo: "Quantas horas por semana VOCÊ trabalha na agência?",
        opcoes: [
          { valor: "ate40", rotulo: "Até 40h" },
          { valor: "40-50", rotulo: "40–50h" },
          { valor: "50-60", rotulo: "50–60h" },
          { valor: "60+", rotulo: "Mais de 60h" },
        ],
      },
      {
        id: "resposta",
        tipo: "unica",
        titulo: "Um lead novo manda mensagem. Em quanto tempo ele recebe a primeira resposta de verdade?",
        ajuda: "Resposta de verdade — não o \"oi, já te retorno\".",
        opcoes: [
          { valor: "1h", rotulo: "Menos de 1 hora" },
          { valor: "dia", rotulo: "No mesmo dia" },
          { valor: "1-2d", rotulo: "1 a 2 dias" },
          { valor: "2d+", rotulo: "Mais de 2 dias" },
        ],
      },
      {
        id: "perda",
        tipo: "unica",
        titulo: "Quando você perde uma venda, o motivo mais comum é…",
        opcoes: [
          { valor: "preco", rotulo: "Preço — achou mais barato" },
          { valor: "demora", rotulo: "Demora — fechou com quem respondeu antes" },
          { valor: "sumiu", rotulo: "Sumiu depois do orçamento" },
          { valor: "desqualificado", rotulo: "Nunca foi cliente de verdade (curioso, fora do perfil)" },
          { valor: "nsei", rotulo: "Não sei" },
        ],
      },
    ],
  },
  {
    id: "tempo",
    titulo: "Onde vai o seu tempo",
    porque: "Hora gasta é o custo que a IA pode devolver. Estimativa honesta vale mais que precisa.",
    perguntas: [
      {
        id: "horas",
        tipo: "horas",
        titulo: "Horas por semana da equipe inteira em cada frente",
        ajuda: "Some todo mundo. Chute honesto — ninguém mede isso direito.",
        areas: IDS_AREAS,
      },
      {
        id: "odeia",
        tipo: "multipla",
        titulo: "Quais dessas tarefas você mais detesta fazer?",
        ajuda: "Até duas. Ferramenta que resolve o que você detesta é ferramenta que você usa.",
        max: 2,
        opcoes: IDS_AREAS.map((a) => ({ valor: a, rotulo: AREAS[a].nome })),
      },
    ],
  },
  {
    id: "base",
    titulo: "Dados e processo",
    porque: "IA automatiza processo. Sem processo, ela automatiza bagunça — mais rápido.",
    perguntas: [
      {
        id: "dados",
        tipo: "unica",
        titulo: "Onde estão os dados dos seus clientes (viagens feitas, preferências, datas)?",
        opcoes: [
          { valor: "cabeca", rotulo: "Na minha cabeça e no histórico do WhatsApp" },
          { valor: "planilha", rotulo: "Numa planilha que eu mantenho" },
          { valor: "crm_parado", rotulo: "Num CRM/sistema que ninguém atualiza direito" },
          { valor: "crm", rotulo: "Num CRM/sistema usado de verdade" },
        ],
      },
      {
        id: "processo",
        tipo: "unica",
        titulo: "Os seus processos estão escritos?",
        opcoes: [
          { valor: "nada", rotulo: "Não, está tudo na cabeça" },
          { valor: "alguns", rotulo: "Alguns checklists soltos" },
          { valor: "manual", rotulo: "Sim, alguém novo conseguiria seguir" },
        ],
      },
      {
        id: "canais",
        tipo: "multipla",
        titulo: "Por onde chegam os pedidos?",
        opcoes: [
          { valor: "whatsapp", rotulo: "WhatsApp" },
          { valor: "instagram", rotulo: "Direct do Instagram" },
          { valor: "email", rotulo: "E-mail" },
          { valor: "site", rotulo: "Formulário no site" },
          { valor: "indicacao", rotulo: "Indicação direta" },
        ],
      },
    ],
  },
  {
    id: "ia",
    titulo: "IA hoje",
    porque: "O roadmap tem que caber no seu tempo, no seu bolso e no seu medo.",
    perguntas: [
      {
        id: "usoIA",
        tipo: "unica",
        titulo: "Como você usa IA hoje?",
        opcoes: [
          { valor: "nunca", rotulo: "Não uso" },
          { valor: "texto", rotulo: "De vez em quando, pra escrever texto" },
          { valor: "semanal", rotulo: "Toda semana, em tarefas definidas" },
          { valor: "automacao", rotulo: "Tenho automação rodando sozinha" },
        ],
      },
      {
        id: "medo",
        tipo: "multipla",
        titulo: "O que mais te preocupa em usar IA?",
        opcoes: [
          { valor: "humanizacao", rotulo: "Perder o toque humano" },
          { valor: "erro", rotulo: "Passar informação errada pro cliente" },
          { valor: "dados", rotulo: "Expor dado de cliente" },
          { valor: "custo", rotulo: "Gastar e não ter retorno" },
          { valor: "saber", rotulo: "Não saber usar" },
        ],
      },
      {
        id: "orcamento",
        tipo: "unica",
        titulo: "Quanto você toparia gastar por mês em ferramentas?",
        opcoes: [
          { valor: "0", rotulo: "Nada, só ferramenta grátis" },
          { valor: "ate200", rotulo: "Até R$ 200" },
          { valor: "200-1000", rotulo: "R$ 200–1.000" },
          { valor: "1000+", rotulo: "Mais de R$ 1.000, se provar retorno" },
        ],
      },
      {
        id: "tempoImplantar",
        tipo: "unica",
        titulo: "Quantas horas por semana você consegue dedicar a implantar algo novo?",
        opcoes: [
          { valor: "ate2", rotulo: "Menos de 2h" },
          { valor: "2-5", rotulo: "2 a 5h" },
          { valor: "5+", rotulo: "Mais de 5h" },
        ],
      },
    ],
  },
  {
    id: "aberto",
    titulo: "Nas suas palavras",
    porque: "É aqui que a análise deixa de ser genérica. Escreva como contaria pra um colega.",
    perguntas: [
      {
        id: "tarefa",
        tipo: "texto",
        titulo: "Descreva a tarefa que mais rouba seu tempo, passo a passo, do jeito que acontece hoje.",
        minimo: 40,
        placeholder:
          "Ex.: Cliente manda áudio pedindo Europa em julho. Eu escuto, anoto, pesquiso voo em 3 sites, hotel no Booking e na consolidadora, monto no Canva, mando PDF…",
      },
      {
        id: "objetivo",
        tipo: "texto",
        titulo: "Se a IA resolvesse UMA coisa nos próximos 90 dias, o que seria?",
        minimo: 10,
      },
    ],
  },
];

export const TODAS_PERGUNTAS = BLOCOS.flatMap((b) => b.perguntas);

export type Respostas = Record<string, string | string[] | Record<string, string>>;

/** Pergunta respondida o suficiente pra seguir? */
export function respondida(p: Pergunta, r: Respostas): boolean {
  const v = r[p.id];
  if (p.tipo === "unica") return typeof v === "string" && v !== "";
  if (p.tipo === "multipla") return true; // opcional: "nenhuma" é resposta
  if (p.tipo === "texto") return typeof v === "string" && v.trim().length >= p.minimo;
  const h = (v ?? {}) as Record<string, string>;
  return p.areas.every((a) => typeof h[a] === "string");
}

/** Rótulo legível de uma resposta — usado no relatório, no CSV e no prompt. */
export function rotuloDe(p: Pergunta, v: Respostas[string] | undefined): string {
  if (v == null) return "—";
  if (p.tipo === "texto") return String(v);
  if (p.tipo === "unica") return p.opcoes.find((o) => o.valor === v)?.rotulo ?? String(v);
  if (p.tipo === "multipla") {
    const lista = (v as string[]).map((x) => p.opcoes.find((o) => o.valor === x)?.rotulo ?? x);
    return lista.length ? lista.join("; ") : "nenhuma";
  }
  const h = v as Record<string, string>;
  return p.areas
    .map((a) => `${AREAS[a].curto}: ${FAIXAS_HORAS.find((f) => f.valor === h[a])?.rotulo ?? "?"}`)
    .join(" · ");
}
