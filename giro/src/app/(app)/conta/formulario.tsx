"use client";

import { useActionState } from "react";
import { atualizarEmpresa, type EstadoFormulario } from "@/acoes/conta";
import { BotaoEnviar } from "@/componentes/botao-enviar";

export function FormularioEmpresa({ nome, segmento }: { nome: string; segmento: string }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(atualizarEmpresa, undefined);

  return (
    <form action={acao} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="nome">
            Nome da empresa
          </label>
          <input id="nome" name="nome" defaultValue={nome} required className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="segmento">
            Ramo
          </label>
          <input id="segmento" name="segmento" defaultValue={segmento} required className="campo" />
          <p className="mt-1.5 text-xs text-neblina">
            O consultor usa o ramo para calibrar o conselho.
          </p>
        </div>
      </div>

      {estado?.erro ? (
        <p className="rounded-lg bg-sangue-clara px-3 py-2 text-sm text-sangue">{estado.erro}</p>
      ) : null}

      <BotaoEnviar className="botao">Salvar</BotaoEnviar>
    </form>
  );
}
