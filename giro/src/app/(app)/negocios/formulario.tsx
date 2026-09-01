"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { moverNegocio, salvarNegocio, type Resultado } from "@/acoes/dados";
import { Gaveta } from "@/componentes/gaveta";
import { BotaoEnviar } from "@/componentes/botao-enviar";

export type NegocioEditavel = {
  id: string;
  titulo: string;
  valorCentavos: number;
  etapa: string;
  clienteId: string | null;
  motivoPerda: string | null;
};

export type OpcaoCliente = { id: string; nome: string };

export const ETAPAS = [
  { valor: "NOVO", nome: "Novo" },
  { valor: "CONTATO", nome: "Em contato" },
  { valor: "PROPOSTA", nome: "Proposta enviada" },
  { valor: "GANHO", nome: "Ganho" },
  { valor: "PERDIDO", nome: "Perdido" },
];

export function GavetaNegocio({
  negocio,
  clientes,
  rotulo,
  variante = "principal",
}: {
  negocio?: NegocioEditavel;
  clientes: OpcaoCliente[];
  rotulo?: React.ReactNode;
  variante?: "principal" | "fantasma";
}) {
  return (
    <Gaveta
      rotulo={rotulo ?? (
        <>
          <Plus size={16} /> Novo negócio
        </>
      )}
      variante={variante}
      titulo={negocio ? "Editar negócio" : "Novo negócio"}
    >
      {(fechar) => <Campos negocio={negocio} clientes={clientes} aoSalvar={fechar} />}
    </Gaveta>
  );
}

function Campos({
  negocio,
  clientes,
  aoSalvar,
}: {
  negocio?: NegocioEditavel;
  clientes: OpcaoCliente[];
  aoSalvar: () => void;
}) {
  const [estado, acao] = useActionState<Resultado, FormData>(salvarNegocio, undefined);
  const [etapa, setEtapa] = useState(negocio?.etapa ?? "NOVO");

  useEffect(() => {
    if (estado?.ok) aoSalvar();
  }, [estado, aoSalvar]);

  return (
    <form action={acao} className="space-y-4">
      {negocio ? <input type="hidden" name="id" value={negocio.id} /> : null}

      <div>
        <label className="rotulo" htmlFor="titulo">
          O que e
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          defaultValue={negocio?.titulo}
          className="campo"
          placeholder="Orçamento de 200 saldados para o evento"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="valor">
            Valor
          </label>
          <input
            id="valor"
            name="valor"
            inputMode="decimal"
            defaultValue={
              negocio && negocio.valorCentavos > 0
                ? (negocio.valorCentavos / 100).toFixed(2).replace(".", ",")
                : ""
            }
            className="campo"
            placeholder="1.200,00"
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="etapa">
            Etapa
          </label>
          <select
            id="etapa"
            name="etapa"
            value={etapa}
            onChange={(e) => setEtapa(e.target.value)}
            className="campo"
          >
            {ETAPAS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="clienteId">
          Cliente
        </label>
        <select
          id="clienteId"
          name="clienteId"
          defaultValue={negocio?.clienteId ?? ""}
          className="campo"
        >
          <option value="">sem cliente vinculado</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {etapa === "PERDIDO" ? (
        <div>
          <label className="rotulo" htmlFor="motivoPerda">
            Por que perdeu
          </label>
          <input
            id="motivoPerda"
            name="motivoPerda"
            defaultValue={negocio?.motivoPerda ?? ""}
            className="campo"
            placeholder="preço, prazo, sumiu, fechou com outro..."
          />
          <p className="mt-1.5 text-xs text-neblina">
            Vale o esforco: e o campo que deixa o consultor achar o padrão das perdas.
          </p>
        </div>
      ) : null}

      {estado?.erro ? (
        <p className="rounded-lg bg-sangue-clara px-3 py-2 text-sm text-sangue">{estado.erro}</p>
      ) : null}

      <BotaoEnviar carregando="Salvando...">Salvar</BotaoEnviar>
    </form>
  );
}

export function MoverNegocio({ id, etapa }: { id: string; etapa: string }) {
  const [pendente, iniciar] = useTransition();

  return (
    <select
      aria-label="Mover de etapa"
      value={etapa}
      disabled={pendente}
      onChange={(e) => {
        const destino = e.target.value;
        iniciar(() => {
          void moverNegocio(id, destino);
        });
      }}
      className="min-h-9 rounded-lg border border-linha bg-cartao px-2 text-xs text-neblina disabled:opacity-50"
    >
      {ETAPAS.map((e) => (
        <option key={e.valor} value={e.valor}>
          {e.nome}
        </option>
      ))}
    </select>
  );
}
