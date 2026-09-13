import "server-only";
import { db } from "../db";
import { contaComoReceita, contaComoDevolucao } from "../hotmart/tipos";

/**
 * Unificacao de pessoa.
 *
 * A chave e o e-mail normalizado — o unico campo que a Hotmart devolve em
 * toda compra, avulsa ou recorrente, no webhook e na API. Documento e
 * telefone entram como enriquecimento quando aparecem, nunca como chave:
 * CPF vem vazio em compra internacional e telefone o comprador digita
 * errado, entao usar qualquer um dos dois como identidade cria pessoa
 * duplicada — e no CRM pessoa duplicada e pior que pessoa faltando.
 */

export function normalizarEmail(email: string | null | undefined): string | null {
  const limpo = email?.trim().toLowerCase();
  return limpo && limpo.includes("@") ? limpo : null;
}

/** Guarda so digito. Compara CPF que veio "123.456.789-00" com "12345678900". */
export function normalizarDocumento(doc: string | null | undefined): string | null {
  const digitos = doc?.replace(/\D/g, "");
  return digitos && digitos.length >= 11 ? digitos : null;
}

export function normalizarTelefone(tel: string | null | undefined): string | null {
  const digitos = tel?.replace(/\D/g, "");
  return digitos && digitos.length >= 8 ? digitos : null;
}

export interface DadosPessoa {
  email: string;
  nome?: string | null;
  telefone?: string | null;
  documento?: string | null;
  pais?: string | null;
  estado?: string | null;
  cidade?: string | null;
}

/**
 * Cria ou enriquece. Campo novo so sobrescreve campo vazio: a API as vezes
 * devolve o nome truncado numa chamada e completo noutra, e o pior resultado
 * possivel e a ultima sincronizacao sempre piorar o cadastro.
 */
export async function garantirPessoa(dados: DadosPessoa): Promise<string> {
  const email = normalizarEmail(dados.email);
  if (!email) throw new Error(`E-mail invalido na ingestao: ${JSON.stringify(dados.email)}`);

  const documento = normalizarDocumento(dados.documento);
  const telefone = normalizarTelefone(dados.telefone);
  const nome = dados.nome?.trim() || null;

  const existente = await db.pessoa.findUnique({ where: { email }, select: { id: true } });

  if (!existente) {
    const criada = await db.pessoa.create({
      data: {
        email,
        nome,
        telefone,
        // Documento e unico no banco. Se dois e-mails trouxerem o mesmo CPF
        // (compra pra si e pra empresa, por exemplo), o segundo fica sem —
        // melhor um campo vazio que uma ingestao quebrada.
        documento: documento && !(await documentoEmUso(documento)) ? documento : null,
        pais: dados.pais ?? null,
        estado: dados.estado ?? null,
        cidade: dados.cidade ?? null,
      },
      select: { id: true },
    });
    return criada.id;
  }

  await db.pessoa.update({
    where: { id: existente.id },
    data: {
      ...(nome ? { nome } : {}),
      ...(telefone ? { telefone } : {}),
      ...(documento && !(await documentoEmUso(documento, existente.id))
        ? { documento }
        : {}),
      ...(dados.pais ? { pais: dados.pais } : {}),
      ...(dados.estado ? { estado: dados.estado } : {}),
      ...(dados.cidade ? { cidade: dados.cidade } : {}),
    },
  });

  return existente.id;
}

async function documentoEmUso(documento: string, exceto?: string): Promise<boolean> {
  const dono = await db.pessoa.findUnique({ where: { documento }, select: { id: true } });
  return !!dono && dono.id !== exceto;
}

/**
 * Recalcula LTV, contagens e datas a partir das transacoes.
 *
 * Roda ao fim de cada janela do backfill e a cada webhook de compra, nao a
 * cada linha: numa janela com 2 mil vendas de 50 pessoas, recalcular por
 * linha seria 2 mil varreduras pra chegar no mesmo numero.
 */
export async function recalcularAgregados(pessoaIds: string[]): Promise<void> {
  const unicos = [...new Set(pessoaIds)].filter(Boolean);

  for (const pessoaId of unicos) {
    const transacoes = await db.transacao.findMany({
      where: { pessoaId },
      select: { status: true, liquidoCentavos: true, compradaEm: true, aprovadaEm: true },
    });

    const receita = transacoes.filter((t) => contaComoReceita(t.status));
    const devolvidas = transacoes.filter((t) => contaComoDevolucao(t.status));

    const datas = receita
      .map((t) => t.aprovadaEm ?? t.compradaEm)
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());

    await db.pessoa.update({
      where: { id: pessoaId },
      data: {
        // LTV e liquido: e o que sobrou pra voce, nao o que o comprador
        // gastou. Somar bruto faz cliente de produto caro com taxa alta
        // parecer melhor do que e.
        ltvCentavos: receita.reduce((soma, t) => soma + t.liquidoCentavos, 0),
        comprasAprovadas: receita.length,
        reembolsos: devolvidas.length,
        primeiraCompraEm: datas[0] ?? null,
        ultimaCompraEm: datas[datas.length - 1] ?? null,
      },
    });
  }
}
