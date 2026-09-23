"use client";

import { useActionState } from "react";
import { entrarAdmin } from "@/app/acoes";

export function FormAdmin() {
  const [estado, acao, enviando] = useActionState(entrarAdmin, null);
  return (
    <form action={acao} className="flex max-w-md flex-col gap-3">
      <input name="chave" type="password" required placeholder="Chave de admin" className="min-h-12 border border-preto/20 bg-white px-4" />
      <button disabled={enviando} className="min-h-12 bg-preto font-bold uppercase text-white disabled:opacity-50">Entrar</button>
      {estado?.erro && <p className="text-coral">{estado.erro}</p>}
    </form>
  );
}
