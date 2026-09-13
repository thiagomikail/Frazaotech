"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sessaoAtiva } from "@/lib/sessao";

export async function anotar(form: FormData): Promise<void> {
  // Server action e endpoint publico: a sessao precisa ser checada AQUI, nao
  // so no layout que renderizou o formulario.
  const sessao = await sessaoAtiva();
  if (!sessao) throw new Error("Sem sessao.");

  const pessoaId = String(form.get("pessoaId") ?? "");
  const texto = String(form.get("texto") ?? "").trim();
  if (!pessoaId || !texto) return;

  await db.nota.create({ data: { pessoaId, texto, autor: sessao.email } });
  revalidatePath(`/pessoas/${pessoaId}`);
}
