/**
 * Risco de churn.
 *
 * Puro de proposito: a mesma funcao pontua no servidor (pra montar a fila) e
 * explica no cliente (pra mostrar o porque em cada cartao). Se a formula
 * morasse so na consulta SQL, a tela mostraria um numero sem justificativa —
 * e numero sem justificativa ninguem usa pra ligar pro cliente.
 *
 * Nao e previsao estatistica. E a soma de sinais que, na pratica, antecedem
 * o cancelamento — cada um com peso explicito e auditavel. Melhor um score
 * que voce entende e corrige do que um modelo que voce obedece.
 */

export interface SinaisDeRisco {
  /** Dias desde o ultimo acesso a area de membros. `null` = sem Club. */
  diasSemAcesso: number | null;
  /** Percentual do curso concluido (0-100). */
  progressoPct: number;
  /** Dias de casa desde a adesao. */
  diasDeCasa: number;
  /** Cobranca falhando agora (DELAYED / OVERDUE). */
  inadimplente: boolean;
  /** Dias ate a proxima cobranca. Negativo/`null` quando nao ha. */
  diasAteCobranca: number | null;
  /** Ja pediu reembolso alguma vez. */
  jaReembolsou: boolean;
}

export interface Risco {
  /** 0 a 100. Quanto maior, mais perto de cancelar. */
  score: number;
  nivel: "baixo" | "medio" | "alto";
  motivos: string[];
  /** Existe uma cobranca chegando: a janela pra agir e agora. */
  urgente: boolean;
}

export function calcularRisco(s: SinaisDeRisco): Risco {
  let score = 0;
  const motivos: string[] = [];

  // Sumico e o sinal mais forte e o mais antecipado: quem cancela para de
  // assistir semanas antes de clicar em cancelar.
  if (s.diasSemAcesso !== null) {
    if (s.diasSemAcesso >= 60) {
      score += 40;
      motivos.push(`${s.diasSemAcesso} dias sem acessar`);
    } else if (s.diasSemAcesso >= 30) {
      score += 28;
      motivos.push(`${s.diasSemAcesso} dias sem acessar`);
    } else if (s.diasSemAcesso >= 14) {
      score += 15;
      motivos.push(`${s.diasSemAcesso} dias sem acessar`);
    }
  }

  // Cobranca falhando e o churn ja em curso, so que involuntario — e o unico
  // tipo que se resolve com uma mensagem sobre cartao, nao sobre conteudo.
  if (s.inadimplente) {
    score += 30;
    motivos.push("cobranca falhando");
  }

  // Quem passou do primeiro mes e nao saiu do lugar nunca chegou a usar o
  // que comprou. Antes disso, progresso baixo e so comeco.
  if (s.diasDeCasa >= 30 && s.progressoPct < 10) {
    score += 20;
    motivos.push(`so ${s.progressoPct.toFixed(0)}% do curso`);
  }

  // O segundo mes e onde a assinatura morre: o encanto passou e o habito
  // ainda nao formou.
  if (s.diasDeCasa >= 30 && s.diasDeCasa <= 75) {
    score += 8;
    motivos.push("no 2o mes, faixa de maior evasao");
  }

  if (s.jaReembolsou) {
    score += 10;
    motivos.push("ja pediu reembolso antes");
  }

  const urgente = s.diasAteCobranca !== null && s.diasAteCobranca >= 0 && s.diasAteCobranca <= 7;
  if (urgente && score >= 30) {
    motivos.push(`cobranca em ${s.diasAteCobranca} dia(s)`);
  }

  score = Math.min(score, 100);

  return {
    score,
    nivel: score >= 55 ? "alto" : score >= 30 ? "medio" : "baixo",
    motivos,
    urgente,
  };
}
