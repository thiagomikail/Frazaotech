"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { entrar } from "./acoes";

export function Formulario() {
  const parametros = useSearchParams();
  const [estado, acao, pendente] = useActionState(entrar, null);

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="de" value={parametros.get("de") ?? "/"} />

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-tinta-fraca">E-mail</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-marca"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-tinta-fraca">Senha</span>
        <input
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-marca"
        />
      </label>

      {estado?.erro && <p className="text-sm text-negativo">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-lg bg-marca px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
