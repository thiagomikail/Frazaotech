"use client";

import { useActionState } from "react";
import { entrar, type EstadoFormulario } from "@/acoes/conta";
import { BotaoEnviar } from "@/componentes/botao-enviar";

export function FormularioEntrar({ de }: { de?: string }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(entrar, undefined);

  return (
    <form action={acao} className="space-y-4">
      {de ? <input type="hidden" name="de" value={de} /> : null}

      <div>
        <label className="rotulo" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado?.campos?.email}
          className="campo"
          placeholder="você@suaempresa.com.br"
        />
      </div>

      <div>
        <label className="rotulo" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="campo"
          placeholder="••••••••"
        />
      </div>

      {estado?.erro ? (
        <p className="rounded-lg bg-sangue-clara px-3 py-2 text-sm text-sangue">{estado.erro}</p>
      ) : null}

      <BotaoEnviar carregando="Entrando...">Entrar</BotaoEnviar>
    </form>
  );
}
