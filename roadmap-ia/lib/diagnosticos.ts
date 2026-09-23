import "server-only";
import type { Analise } from "./analise-tipo";
import { pg, SCHEMA } from "./db";
import type { Respostas } from "./perguntas";
import type { Pontuacao } from "./pontuacao";

export type Diagnostico = {
  id: string;
  email: string;
  nome: string | null;
  agencia: string | null;
  respostas: Respostas;
  pontuacao: Pontuacao;
  analise: Analise | null;
  modelo: string | null;
  erro: string | null;
  criado_em: Date;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function criarDiagnostico(d: {
  email: string; nome: string | null; agencia: string | null; respostas: Respostas; pontuacao: Pontuacao;
}) {
  const { rows } = await pg().query<{ id: string }>(
    `insert into ${SCHEMA}.diagnostico (email, nome, agencia, respostas, pontuacao)
     values ($1, $2, $3, $4, $5) returning id`,
    [d.email, d.nome, d.agencia, JSON.stringify(d.respostas), JSON.stringify(d.pontuacao)],
  );
  return rows[0].id;
}

export async function gravarAnalise(id: string, analise: Analise, modelo: string) {
  await pg().query(
    `update ${SCHEMA}.diagnostico set analise = $2, modelo = $3, erro = null where id = $1`,
    [id, JSON.stringify(analise), modelo],
  );
}

export async function gravarErro(id: string, erro: string) {
  await pg().query(`update ${SCHEMA}.diagnostico set erro = $2 where id = $1`, [id, erro.slice(0, 500)]);
}

export async function buscar(id: string): Promise<Diagnostico | null> {
  if (!UUID.test(id)) return null;
  const { rows } = await pg().query<Diagnostico>(`select * from ${SCHEMA}.diagnostico where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function doEmail(email: string) {
  const { rows } = await pg().query<Pick<Diagnostico, "id" | "agencia" | "criado_em" | "analise">>(
    `select id, agencia, criado_em, analise from ${SCHEMA}.diagnostico where email = $1 order by criado_em desc`,
    [email],
  );
  return rows;
}

export async function todos(limite = 500) {
  const { rows } = await pg().query<Diagnostico>(
    `select * from ${SCHEMA}.diagnostico order by criado_em desc limit $1`,
    [limite],
  );
  return rows;
}
