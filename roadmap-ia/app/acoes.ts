"use server";

import { redirect } from "next/navigation";
import { chaveConfere, gravarAdmin, sairAdmin } from "@/lib/sessao";

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
