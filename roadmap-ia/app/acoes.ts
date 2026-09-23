"use server";

import { redirect } from "next/navigation";
import { chaveConfere, esquecerEmail, gravarAdmin, gravarEmail, normalizarEmail, sairAdmin } from "@/lib/sessao";

export async function entrar(_: unknown, form: FormData) {
  const email = normalizarEmail(String(form.get("email") ?? ""));
  if (!email) return { erro: "Esse e-mail não parece válido." };
  await gravarEmail(email);
  redirect(form.get("destino") === "meus" ? "/meus" : "/teste");
}

export async function sair() {
  await esquecerEmail();
  redirect("/");
}

export async function entrarAdmin(_: unknown, form: FormData) {
  // Pausa fixa: chute de chave em loop fica caro.
  await new Promise((r) => setTimeout(r, 800));
  if (!chaveConfere(String(form.get("chave") ?? ""))) return { erro: "Chave errada." };
  await gravarAdmin();
  redirect("/admin");
}

export async function deslogarAdmin() {
  await sairAdmin();
  redirect("/admin");
}
