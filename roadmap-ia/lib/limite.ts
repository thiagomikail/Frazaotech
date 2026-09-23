import "server-only";
import { pg, SCHEMA } from "./db";
import { SemIA } from "./gemini";

/**
 * O site é aberto: qualquer aluno com o link chama a IA, e a chave é a mesma
 * do Bancada. Dois tetos protegem o saldo:
 *
 *   · por e-mail — 3 análises por dia. Refazer o teste 3× já é muito.
 *   · global — `TETO_DIARIO` (padrão 150). Uma turma inteira num dia cabe;
 *     um script em loop não.
 *
 * Conta ANTES de chamar o Gemini (contar depois deixaria o gasto acontecer).
 * Falha ABERTO no global: se o contador cair, o aluno não fica sem relatório.
 */

const POR_EMAIL = 3;

function hoje() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export async function consumir(email: string) {
  const teto = Number(process.env.TETO_DIARIO ?? 150);

  const { rows: meus } = await pg().query(
    `select count(*)::int as n from ${SCHEMA}.diagnostico
      where email = $1 and criado_em > now() - interval '24 hours' and analise is not null`,
    [email],
  );
  if (meus[0].n >= POR_EMAIL) {
    throw new SemIA("limite_diario", `Você já gerou ${POR_EMAIL} análises nas últimas 24h. Volte amanhã.`);
  }

  try {
    const { rows } = await pg().query(
      `insert into ${SCHEMA}.uso_ia (dia, contagem) values ($1, 1)
       on conflict (dia) do update set contagem = ${SCHEMA}.uso_ia.contagem + 1
       returning contagem`,
      [hoje()],
    );
    if (rows[0].contagem > teto) {
      throw new SemIA("limite_diario", "O site bateu o limite de análises de hoje. Suas respostas estão salvas — gere a análise amanhã.");
    }
  } catch (e) {
    if (e instanceof SemIA) throw e;
  }
}
