/**
 * Planos, limites e a regua de cobranca.
 *
 * Sem `server-only`: a landing e as telas de conta sao componentes cliente e
 * precisam ler preco e limite. (Constante pura mora em arquivo proprio;
 * consulta ao banco mora em arquivo com `server-only`.)
 *
 * A tese comercial esta escrita aqui: REGISTRAR e de graca para sempre, porque
 * dado preso e o que faz o app valer. Quem paga, paga pelo CONSULTOR — a parte
 * que le o dado e diz o que fazer. Por isso todo limite abaixo e limite de IA,
 * nenhum e limite de cadastro.
 */

export type Plano = "FREE" | "PRO" | "ESTUDIO";

export type Limites = {
  /** Perguntas ao consultor por mes. */
  perguntasMes: number;
  /** Diagnosticos gerados por mes. */
  diagnosticosMes: number;
  /** Diagnostico automatico semanal por cron. */
  diagnosticoAutomatico: boolean;
  /** Painel de sinais com recomendacao escrita pela IA. */
  alertasInteligentes: boolean;
  /** Quantas empresas a mesma conta administra (contador/consultor). */
  empresas: number;
  exportacao: boolean;
};

export type DefinicaoPlano = {
  id: Plano;
  nome: string;
  chamada: string;
  precoMensalCentavos: number;
  destaque: boolean;
  inclui: string[];
  limites: Limites;
};

export const PLANOS: Record<Plano, DefinicaoPlano> = {
  FREE: {
    id: "FREE",
    nome: "Caderno",
    chamada: "Pare de perder cliente no caderno e no bloco de notas.",
    precoMensalCentavos: 0,
    destaque: false,
    inclui: [
      "Clientes, negócios, caixa e tarefas — sem limite",
      "Funil de vendas e fluxo de caixa do mês",
      "3 perguntas ao consultor por mês",
      "1 diagnóstico por mês",
    ],
    limites: {
      perguntasMes: 3,
      diagnosticosMes: 1,
      diagnosticoAutomatico: false,
      alertasInteligentes: false,
      empresas: 1,
      exportacao: false,
    },
  },
  PRO: {
    id: "PRO",
    nome: "Consultor",
    chamada: "O sócio que lê seus números toda segunda e diz o que fazer.",
    precoMensalCentavos: 9700,
    destaque: true,
    inclui: [
      "Tudo do Caderno",
      "300 perguntas ao consultor por mês",
      "Diagnóstico sob demanda, até 30 por mês",
      "Diagnóstico automático toda segunda-feira",
      "Alertas com o próximo passo escrito e pronto para enviar",
      "Exportação em CSV",
    ],
    limites: {
      perguntasMes: 300,
      diagnosticosMes: 30,
      diagnosticoAutomatico: true,
      alertasInteligentes: true,
      empresas: 1,
      exportacao: true,
    },
  },
  ESTUDIO: {
    id: "ESTUDIO",
    nome: "Estúdio",
    chamada: "Para quem cuida da gestão de várias empresas.",
    precoMensalCentavos: 24900,
    destaque: false,
    inclui: [
      "Tudo do Consultor",
      "Até 5 empresas na mesma conta",
      "Equipe com vários usuários",
      "1.000 perguntas ao consultor por mês",
    ],
    limites: {
      perguntasMes: 1000,
      diagnosticosMes: 120,
      diagnosticoAutomatico: true,
      alertasInteligentes: true,
      empresas: 5,
      exportacao: true,
    },
  },
};

export const ORDEM_PLANOS: Plano[] = ["FREE", "PRO", "ESTUDIO"];

/**
 * Durante o beta todo mundo usa o Pro sem pagar. O que NAO acontece e o app
 * parar de medir: `UsoIA` continua contando, e a tela de conta mostra quanto a
 * empresa consumiu. No dia de ligar a cobranca basta virar a variavel — a
 * regua ja esta calibrada com uso real, nao com chute.
 */
export function betaLiberado(): boolean {
  return process.env.BETA_LIBERADO !== "false";
}

/** Plano que vale na pratica agora (considera o beta). */
export function planoEfetivo(planoDaEmpresa: Plano): Plano {
  if (betaLiberado() && planoDaEmpresa === "FREE") return "PRO";
  return planoDaEmpresa;
}

export function limitesDe(planoDaEmpresa: Plano): Limites {
  return PLANOS[planoEfetivo(planoDaEmpresa)].limites;
}

export function formatarPreco(centavos: number): string {
  if (centavos === 0) return "Grátis";
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}
