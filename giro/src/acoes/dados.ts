"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/sessao";
import { registrarEvento } from "@/lib/eventos";
import { paraCentavos } from "@/lib/dinheiro";

/**
 * Toda acao aqui comeca por `exigirSessao()` e escreve com `empresaId` vindo
 * da sessao — nunca do formulario. Antes de editar ou apagar qualquer coisa,
 * o `where` inclui o `empresaId`: assim um id de outra empresa simplesmente
 * nao encontra registro, em vez de encontrar e vazar.
 */

export type Resultado = { erro?: string; ok?: boolean } | undefined;

function texto(f: FormData, campo: string): string {
  return String(f.get(campo) ?? "").trim();
}

function opcional(f: FormData, campo: string): string | null {
  const v = texto(f, campo);
  return v.length > 0 ? v : null;
}

// ---------------------------------------------------------------- clientes

export async function salvarCliente(_anterior: Resultado, f: FormData): Promise<Resultado> {
  const { empresa, usuario } = await exigirSessao();

  const nome = texto(f, "nome");
  if (nome.length < 2) return { erro: "O nome do cliente e obrigatório." };

  const dados = {
    nome,
    whatsapp: opcional(f, "whatsapp"),
    email: opcional(f, "email"),
    origem: opcional(f, "origem"),
    observacao: opcional(f, "observacao"),
  };

  const id = texto(f, "id");
  if (id) {
    const { count } = await db.cliente.updateMany({
      where: { id, empresaId: empresa.id },
      data: dados,
    });
    if (count === 0) return { erro: "Cliente não encontrado." };
    await registrarEvento(empresa.id, "cliente.editado", { id }, usuario.id);
  } else {
    const criado = await db.cliente.create({ data: { ...dados, empresaId: empresa.id } });
    await registrarEvento(empresa.id, "cliente.criado", { id: criado.id }, usuario.id);
  }

  revalidatePath("/clientes");
  revalidatePath("/painel");
  return { ok: true };
}

export async function arquivarCliente(id: string): Promise<void> {
  const { empresa, usuario } = await exigirSessao();
  await db.cliente.updateMany({ where: { id, empresaId: empresa.id }, data: { arquivado: true } });
  await registrarEvento(empresa.id, "cliente.arquivado", { id }, usuario.id);
  revalidatePath("/clientes");
}

// ---------------------------------------------------------------- negocios

const ETAPAS = ["NOVO", "CONTATO", "PROPOSTA", "GANHO", "PERDIDO"] as const;
const esquemaEtapa = z.enum(ETAPAS);

export async function salvarNegocio(_anterior: Resultado, f: FormData): Promise<Resultado> {
  const { empresa, usuario } = await exigirSessao();

  const titulo = texto(f, "titulo");
  if (titulo.length < 2) return { erro: "Descreva o negócio em poucas palavras." };

  const etapa = esquemaEtapa.safeParse(texto(f, "etapa") || "NOVO");
  if (!etapa.success) return { erro: "Etapa inválida." };

  const clienteId = opcional(f, "clienteId");
  if (clienteId) {
    const dono = await db.cliente.findFirst({
      where: { id: clienteId, empresaId: empresa.id },
      select: { id: true },
    });
    if (!dono) return { erro: "Cliente não encontrado." };
  }

  const fechado = etapa.data === "GANHO" || etapa.data === "PERDIDO";
  const dados = {
    titulo,
    valorCentavos: paraCentavos(texto(f, "valor")) ?? 0,
    etapa: etapa.data,
    clienteId,
    motivoPerda: etapa.data === "PERDIDO" ? opcional(f, "motivoPerda") : null,
    fechadoEm: fechado ? new Date() : null,
  };

  const id = texto(f, "id");
  if (id) {
    const atual = await db.negocio.findFirst({ where: { id, empresaId: empresa.id } });
    if (!atual) return { erro: "Negócio não encontrado." };
    // Nao remarca a data de fechamento se ele ja estava fechado na mesma etapa.
    const fechadoEm = fechado ? (atual.fechadoEm ?? new Date()) : null;
    await db.negocio.update({ where: { id }, data: { ...dados, fechadoEm } });
    await registrarEvento(empresa.id, "negocio.editado", { id, etapa: etapa.data }, usuario.id);
  } else {
    const criado = await db.negocio.create({ data: { ...dados, empresaId: empresa.id } });
    await registrarEvento(empresa.id, "negocio.criado", { id: criado.id }, usuario.id);
  }

  revalidatePath("/negocios");
  revalidatePath("/painel");
  return { ok: true };
}

export async function moverNegocio(id: string, destino: string): Promise<void> {
  const { empresa, usuario } = await exigirSessao();
  const etapa = esquemaEtapa.safeParse(destino);
  if (!etapa.success) return;

  const atual = await db.negocio.findFirst({ where: { id, empresaId: empresa.id } });
  if (!atual) return;

  const fechado = etapa.data === "GANHO" || etapa.data === "PERDIDO";
  await db.negocio.update({
    where: { id },
    data: {
      etapa: etapa.data,
      fechadoEm: fechado ? (atual.fechadoEm ?? new Date()) : null,
      motivoPerda: etapa.data === "PERDIDO" ? atual.motivoPerda : null,
    },
  });

  await registrarEvento(empresa.id, "negocio.movido", { id, de: atual.etapa, para: etapa.data }, usuario.id);
  revalidatePath("/negocios");
  revalidatePath("/painel");
}

// -------------------------------------------------------------- lancamentos

export async function salvarLancamento(_anterior: Resultado, f: FormData): Promise<Resultado> {
  const { empresa, usuario } = await exigirSessao();

  const tipo = texto(f, "tipo") === "SAIDA" ? "SAIDA" : "ENTRADA";
  const valorCentavos = paraCentavos(texto(f, "valor"));
  if (valorCentavos === null || valorCentavos <= 0) {
    return { erro: "Informe um valor maior que zero." };
  }

  const categoria = texto(f, "categoria") || "Outros";
  const dataTexto = texto(f, "data");
  const data = dataTexto ? new Date(`${dataTexto}T12:00:00`) : new Date();
  if (Number.isNaN(data.getTime())) return { erro: "Data inválida." };

  const clienteId = opcional(f, "clienteId");
  if (clienteId) {
    const dono = await db.cliente.findFirst({
      where: { id: clienteId, empresaId: empresa.id },
      select: { id: true },
    });
    if (!dono) return { erro: "Cliente não encontrado." };
  }

  const criado = await db.lancamento.create({
    data: {
      empresaId: empresa.id,
      tipo,
      valorCentavos,
      categoria,
      descricao: opcional(f, "descricao"),
      data,
      clienteId,
    },
  });

  await registrarEvento(empresa.id, "lancamento.criado", { id: criado.id, tipo }, usuario.id);
  revalidatePath("/caixa");
  revalidatePath("/painel");
  return { ok: true };
}

export async function excluirLancamento(id: string): Promise<void> {
  const { empresa, usuario } = await exigirSessao();
  await db.lancamento.deleteMany({ where: { id, empresaId: empresa.id } });
  await registrarEvento(empresa.id, "lancamento.excluido", { id }, usuario.id);
  revalidatePath("/caixa");
  revalidatePath("/painel");
}

// ----------------------------------------------------------------- tarefas

export async function salvarTarefa(_anterior: Resultado, f: FormData): Promise<Resultado> {
  const { empresa, usuario } = await exigirSessao();

  const titulo = texto(f, "titulo");
  if (titulo.length < 2) return { erro: "Escreva o que precisa ser feito." };

  const prazoTexto = texto(f, "prazo");
  const prazo = prazoTexto ? new Date(`${prazoTexto}T12:00:00`) : null;
  if (prazo && Number.isNaN(prazo.getTime())) return { erro: "Prazo inválido." };

  const criada = await db.tarefa.create({
    data: {
      empresaId: empresa.id,
      titulo,
      detalhe: opcional(f, "detalhe"),
      prazo,
      origem: "MANUAL",
    },
  });

  await registrarEvento(empresa.id, "tarefa.criada", { id: criada.id }, usuario.id);
  revalidatePath("/tarefas");
  revalidatePath("/painel");
  return { ok: true };
}

export async function alternarTarefa(id: string): Promise<void> {
  const { empresa, usuario } = await exigirSessao();
  const tarefa = await db.tarefa.findFirst({ where: { id, empresaId: empresa.id } });
  if (!tarefa) return;

  await db.tarefa.update({
    where: { id },
    data: { feita: !tarefa.feita, feitaEm: tarefa.feita ? null : new Date() },
  });

  await registrarEvento(
    empresa.id,
    tarefa.feita ? "tarefa.reaberta" : "tarefa.concluida",
    { id, origem: tarefa.origem },
    usuario.id,
  );
  revalidatePath("/tarefas");
  revalidatePath("/painel");
}

export async function excluirTarefa(id: string): Promise<void> {
  const { empresa } = await exigirSessao();
  await db.tarefa.deleteMany({ where: { id, empresaId: empresa.id } });
  revalidatePath("/tarefas");
}
