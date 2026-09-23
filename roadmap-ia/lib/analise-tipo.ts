/**
 * Formato da análise que o modelo devolve. Tipo puro, sem server-only —
 * o componente do relatório importa daqui.
 */

export type Acao = {
  acao: string;
  como: string;
  ferramenta: string;
  horasSemana: string;
  sucesso: string;
  parar: string;
};

export type Fase = { nome: string; prazo: string; objetivo: string; acoes: Acao[] };

export type Analise = {
  veredito: string;
  ondeMaisValor: { area: string; porque: string; evidencias: string[]; ganhoEsperado: string };
  naoFazerAgora: { tema: string; porque: string }[];
  verdadesIncomodas: string[];
  roadmap: Fase[];
  metricas: { nome: string; comoMedir: string; hoje: string }[];
  riscos: { risco: string; mitigacao: string }[];
  pergunta: string;
};
