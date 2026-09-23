import "server-only";
import { recentesDoEmail } from "./diagnosticos";
import { pg, SCHEMA } from "./db";
import { SemIA } from "./gemini";

/**
 * O site é aberto e cada envio custa uma chamada de IA (chave do Bancada) e
 * manda um e-mail pra um endereço digitado por quem quer que seja. Dois tetos:
 *
 *   · por e-mail — 3 diagnósticos em 24h. Também impede usar o site pra
 *     encher a caixa de alguém.
 *   · global — `TETO_DIARIO` (padrão 150) chamadas de IA por dia.
 *
 * O global conta ANTES de chamar o Gemini e falha ABERTO: se o contador cair,
 * o aluno não fica sem relatório.
 */

export const POR_EMAIL = 3;

export async function podeEnviar(email: string) {
  return (await recentesDoEmail(email)) < POR_EMAIL;
}

function hoje() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export async function consumirIA() {
  const teto = Number(process.env.TETO_DIARIO ?? 150);
  try {
    const { rows } = await pg().query(
      `insert into ${SCHEMA}.uso_ia (dia, contagem) values ($1, 1)
       on conflict (dia) do update set contagem = ${SCHEMA}.uso_ia.contagem + 1
       returning contagem`,
      [hoje()],
    );
    if (rows[0].contagem > teto) {
      throw new SemIA("limite_diario", `Passou de ${teto} análises hoje (TETO_DIARIO).`);
    }
  } catch (e) {
    if (e instanceof SemIA) throw e;
  }
}
