"use client";

import { useActionState } from "react";
import { entrar } from "@/app/acoes";

export function FormEmail({ destino = "teste", rotulo = "Começar o diagnóstico" }: { destino?: "teste" | "meus"; rotulo?: string }) {
  const [estado, acao, enviando] = useActionState(entrar, null);
  return (
    <form action={acao} className="flex w-full max-w-lg flex-col gap-3 sm:flex-row">
      <input type="hidden" name="destino" value={destino} />
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="seu@email.com"
        className="min-h-12 flex-1 border border-white/30 bg-white px-4 text-preto outline-none focus:border-ouro"
      />
      <button disabled={enviando} className="min-h-12 bg-ouro px-6 font-bold uppercase tracking-wide text-preto hover:brightness-110 disabled:opacity-60">
        {enviando ? "Entrando…" : rotulo}
      </button>
      {estado?.erro && <p className="text-sm text-coral sm:basis-full">{estado.erro}</p>}
    </form>
  );
}
