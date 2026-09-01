"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/eventos";
import {
  abrirSessao,
  conferirSenha,
  encerrarSessao,
  exigirSessao,
  hashDeSenha,
} from "@/lib/sessao";

export type EstadoFormulario = { erro?: string; campos?: Record<string, string> } | undefined;

const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, "Diga seu nome."),
  empresa: z.string().trim().min(2, "Diga o nome da empresa."),
  segmento: z.string().trim().min(2, "Diga o ramo — padaria, consultoria, salão..."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
});

export async function criarConta(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const dados = esquemaCadastro.safeParse({
    nome: formulario.get("nome"),
    empresa: formulario.get("empresa"),
    segmento: formulario.get("segmento"),
    email: formulario.get("email"),
    senha: formulario.get("senha"),
  });

  const digitado = {
    nome: String(formulario.get("nome") ?? ""),
    empresa: String(formulario.get("empresa") ?? ""),
    segmento: String(formulario.get("segmento") ?? ""),
    email: String(formulario.get("email") ?? ""),
  };

  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Confira os campos.", campos: digitado };
  }

  const jaExiste = await db.usuario.findUnique({ where: { email: dados.data.email } });
  if (jaExiste) {
    return { erro: "Já existe uma conta com esse e-mail. Tente entrar.", campos: digitado };
  }

  const usuario = await db.usuario.create({
    data: {
      nome: dados.data.nome,
      email: dados.data.email,
      senhaHash: await hashDeSenha(dados.data.senha),
      papel: "DONO",
      empresa: { create: { nome: dados.data.empresa, segmento: dados.data.segmento } },
    },
  });

  await registrarEvento(usuario.empresaId, "conta.criada", { segmento: dados.data.segmento }, usuario.id);
  await abrirSessao(usuario.id);

  redirect("/painel"); // fora do try: redirect funciona lancando
}

export async function entrar(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const email = String(formulario.get("email") ?? "").trim().toLowerCase();
  const senha = String(formulario.get("senha") ?? "");

  if (!email || !senha) return { erro: "Preencha e-mail e senha.", campos: { email } };

  const usuario = await db.usuario.findUnique({ where: { email } });
  // Mensagem unica de proposito: dizer "esse e-mail não existe" entrega quem
  // tem conta no Giro para quem estiver testando e-mails.
  const generico = { erro: "E-mail ou senha não conferem.", campos: { email } };
  if (!usuario) return generico;
  if (!(await conferirSenha(senha, usuario.senhaHash))) return generico;

  await db.usuario.update({ where: { id: usuario.id }, data: { ultimoAcesso: new Date() } });
  await registrarEvento(usuario.empresaId, "sessao.aberta", undefined, usuario.id);
  await abrirSessao(usuario.id);

  const destino = String(formulario.get("de") ?? "") || "/painel";
  redirect(destino.startsWith("/") ? destino : "/painel");
}

export async function sair(): Promise<void> {
  await encerrarSessao();
  redirect("/entrar");
}

const esquemaEmpresa = z.object({
  nome: z.string().trim().min(2),
  segmento: z.string().trim().min(2),
});

export async function atualizarEmpresa(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const { empresa } = await exigirSessao();
  const dados = esquemaEmpresa.safeParse({
    nome: formulario.get("nome"),
    segmento: formulario.get("segmento"),
  });
  if (!dados.success) return { erro: "Nome e ramo não podem ficar vazios." };

  await db.empresa.update({ where: { id: empresa.id }, data: dados.data });
  await registrarEvento(empresa.id, "empresa.editada");
  return { erro: undefined };
}
