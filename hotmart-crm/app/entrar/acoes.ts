"use server";

import { redirect } from "next/navigation";
import { abrirSessao, senhaConfere, fecharSessao } from "@/lib/sessao";

export async function entrar(
  _anterior: { erro?: string } | null,
  form: FormData,
): Promise<{ erro?: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const destino = String(form.get("de") ?? "/") || "/";

  const esperado = process.env.PAINEL_EMAIL?.trim().toLowerCase();
  const confere = (await senhaConfere(senha)) && email === esperado;

  // Uma mensagem so pros dois casos: dizer "e-mail existe, senha errada"
  // entrega metade da credencial a quem esta tentando.
  if (!confere) return { erro: "E-mail ou senha invalidos." };

  await abrirSessao(email);
  redirect(destino.startsWith("/") ? destino : "/");
}

export async function sair(): Promise<void> {
  await fecharSessao();
  redirect("/entrar");
}
