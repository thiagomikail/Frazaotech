"use client";

import { useActionState, useEffect, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { alternarTarefa, salvarTarefa, type Resultado } from "@/acoes/dados";
import { Gaveta } from "@/componentes/gaveta";
import { BotaoEnviar } from "@/componentes/botao-enviar";

export function GavetaTarefa() {
  return (
    <Gaveta
      rotulo={
        <>
          <Plus size={16} /> Nova tarefa
        </>
      }
      titulo="Nova tarefa"
    >
      {(fechar) => <Campos aoSalvar={fechar} />}
    </Gaveta>
  );
}

function Campos({ aoSalvar }: { aoSalvar: () => void }) {
  const [estado, acao] = useActionState<Resultado, FormData>(salvarTarefa, undefined);

  useEffect(() => {
    if (estado?.ok) aoSalvar();
  }, [estado, aoSalvar]);

  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="titulo">
          O que precisa ser feito
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          className="campo"
          placeholder="Ligar para a dona Marta sobre o orçamento"
        />
      </div>

      <div>
        <label className="rotulo" htmlFor="prazo">
          Ate quando
        </label>
        <input id="prazo" name="prazo" type="date" className="campo" />
      </div>

      <div>
        <label className="rotulo" htmlFor="detalhe">
          Detalhe
        </label>
        <textarea id="detalhe" name="detalhe" rows={3} className="campo resize-none" />
      </div>

      {estado?.erro ? (
        <p className="rounded-lg bg-sangue-clara px-3 py-2 text-sm text-sangue">{estado.erro}</p>
      ) : null}

      <BotaoEnviar carregando="Salvando...">Salvar</BotaoEnviar>
    </form>
  );
}

export function Marcador({ id, feita }: { id: string; feita: boolean }) {
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={feita}
      aria-label={feita ? "Reabrir tarefa" : "Concluir tarefa"}
      disabled={pendente}
      onClick={() =>
        iniciar(() => {
          void alternarTarefa(id);
        })
      }
      className={`grid size-6 shrink-0 place-items-center rounded-md border transition disabled:opacity-40 ${
        feita ? "border-mata bg-mata text-white" : "border-linha-forte hover:border-brasa"
      }`}
    >
      {feita ? <Check size={14} strokeWidth={3} /> : null}
    </button>
  );
}
