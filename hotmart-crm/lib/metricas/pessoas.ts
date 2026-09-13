import "server-only";
import { db } from "../db";
import { ASSINATURA_VIVA, contaComoReceita } from "../hotmart/tipos";
import { calcularRisco, type Risco } from "../risco";
import { diasEntre } from "../datas";

/** Busca, perfil 360 e fila de risco. */

export interface PessoaNaLista {
  id: string;
  nome: string | null;
  email: string;
  ltvCentavos: number;
  comprasAprovadas: number;
  reembolsos: number;
  ultimaCompraEm: Date | null;
  temAssinaturaViva: boolean;
}

export type OrdemBusca = "ltv" | "recente" | "nome";

export async function buscarPessoas(opcoes: {
  termo?: string;
  ordem?: OrdemBusca;
  pagina?: number;
  porPagina?: number;
}): Promise<{ pessoas: PessoaNaLista[]; total: number }> {
  const pagina = Math.max(opcoes.pagina ?? 1, 1);
  const porPagina = Math.min(opcoes.porPagina ?? 40, 200);
  const termo = opcoes.termo?.trim();

  const filtro = termo
    ? {
        OR: [
          { email: { contains: termo, mode: "insensitive" as const } },
          { nome: { contains: termo, mode: "insensitive" as const } },
          { telefone: { contains: termo.replace(/\D/g, "") } },
          { documento: { contains: termo.replace(/\D/g, "") } },
        ],
      }
    : {};

  const ordem =
    opcoes.ordem === "nome"
      ? { nome: "asc" as const }
      : opcoes.ordem === "recente"
        ? { ultimaCompraEm: "desc" as const }
        : { ltvCentavos: "desc" as const };

  const [linhas, total] = await Promise.all([
    db.pessoa.findMany({
      where: filtro,
      orderBy: ordem,
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: {
        id: true,
        nome: true,
        email: true,
        ltvCentavos: true,
        comprasAprovadas: true,
        reembolsos: true,
        ultimaCompraEm: true,
        assinaturas: { select: { status: true } },
      },
    }),
    db.pessoa.count({ where: filtro }),
  ]);

  return {
    pessoas: linhas.map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      ltvCentavos: p.ltvCentavos,
      comprasAprovadas: p.comprasAprovadas,
      reembolsos: p.reembolsos,
      ultimaCompraEm: p.ultimaCompraEm,
      temAssinaturaViva: p.assinaturas.some((a) => ASSINATURA_VIVA.includes(a.status)),
    })),
    total,
  };
}

/**
 * Perfil 360: tudo que se sabe sobre uma pessoa numa consulta.
 *
 * Hoje isso esta espalhado por tres telas da Hotmart que nao se falam —
 * vendas, assinantes e area de membros. Juntar as tres e o ponto inteiro
 * deste app.
 */
export async function perfil360(id: string) {
  const pessoa = await db.pessoa.findUnique({
    where: { id },
    include: {
      transacoes: { orderBy: { compradaEm: "desc" } },
      assinaturas: { orderBy: { aderiuEm: "desc" } },
      engajamentos: { include: { produto: true } },
      notas: { orderBy: { criadoEm: "desc" } },
      eventos: { orderBy: { ocorridoEm: "desc" }, take: 100 },
    },
  });
  if (!pessoa) return null;

  const produtos = await db.produto.findMany({
    where: {
      id: { in: [...new Set(pessoa.transacoes.map((t) => t.produtoId))] },
    },
    select: { id: true, nome: true },
  });
  const nomeDoProduto = new Map(produtos.map((p) => [p.id, p.nome]));

  const carrinhos = await db.carrinhoAbandonado.findMany({
    where: { email: pessoa.email },
    orderBy: { abandonadoEm: "desc" },
  });

  return {
    pessoa,
    nomeDoProduto,
    carrinhos,
    risco: pontuarPessoa(pessoa),
    brutoTotalCentavos: pessoa.transacoes
      .filter((t) => contaComoReceita(t.status))
      .reduce((s, t) => s + t.brutoCentavos, 0),
  };
}

type PessoaComRelacoes = {
  ultimoAcessoEm: Date | null;
  reembolsos: number;
  assinaturas: Array<{
    status: string;
    aderiuEm: Date;
    proximaCobrancaEm: Date | null;
  }>;
  engajamentos: Array<{ progressoPct: number }>;
};

function pontuarPessoa(pessoa: PessoaComRelacoes): Risco | null {
  const viva = pessoa.assinaturas.find((a) => ASSINATURA_VIVA.includes(a.status));
  // Sem assinatura viva nao existe churn a prever: quem comprou avulso nao
  // cancela nada. Forcar um score ali seria inventar urgencia.
  if (!viva) return null;

  const agora = new Date();

  return calcularRisco({
    diasSemAcesso: pessoa.ultimoAcessoEm ? diasEntre(pessoa.ultimoAcessoEm, agora) : null,
    progressoPct: pessoa.engajamentos[0]?.progressoPct ?? 0,
    diasDeCasa: diasEntre(viva.aderiuEm, agora),
    inadimplente: ["DELAYED", "OVERDUE"].includes(viva.status),
    diasAteCobranca: viva.proximaCobrancaEm
      ? diasEntre(agora, viva.proximaCobrancaEm)
      : null,
    jaReembolsou: pessoa.reembolsos > 0,
  });
}

export interface PessoaEmRisco {
  id: string;
  nome: string | null;
  email: string;
  ltvCentavos: number;
  risco: Risco;
  proximaCobrancaEm: Date | null;
}

/**
 * A fila de risco — a tela que mais vale a pena do painel inteiro, porque e
 * a unica que pede uma acao hoje em vez de descrever o passado.
 */
export async function filaDeRisco(limite = 50): Promise<PessoaEmRisco[]> {
  const candidatas = await db.pessoa.findMany({
    where: { assinaturas: { some: { status: { in: [...ASSINATURA_VIVA] } } } },
    select: {
      id: true,
      nome: true,
      email: true,
      ltvCentavos: true,
      ultimoAcessoEm: true,
      reembolsos: true,
      assinaturas: {
        select: { status: true, aderiuEm: true, proximaCobrancaEm: true },
      },
      engajamentos: { select: { progressoPct: true } },
    },
    take: 2_000,
  });

  return candidatas
    .map((p) => {
      const risco = pontuarPessoa(p);
      if (!risco) return null;
      const viva = p.assinaturas.find((a) => ASSINATURA_VIVA.includes(a.status));
      return {
        id: p.id,
        nome: p.nome,
        email: p.email,
        ltvCentavos: p.ltvCentavos,
        risco,
        proximaCobrancaEm: viva?.proximaCobrancaEm ?? null,
      };
    })
    .filter((p): p is PessoaEmRisco => !!p && p.risco.score >= 30)
    // Urgente primeiro: mesmo score, quem tem cobranca chegando e quem ainda
    // da pra salvar antes da proxima fatura.
    .sort((a, b) => {
      if (a.risco.urgente !== b.risco.urgente) return a.risco.urgente ? -1 : 1;
      return b.risco.score - a.risco.score;
    })
    .slice(0, limite);
}
