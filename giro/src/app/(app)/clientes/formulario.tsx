"use client";

import { useActionState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { salvarCliente, type Resultado } from "@/acoes/dados";
import { Gaveta } from "@/componentes/gaveta";
import { BotaoEnviar } from "@/componentes/botao-enviar";

export type ClienteEditavel = {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  origem: string | null;
  observacao: string | null;
};

export function GavetaCliente({
  cliente,
  rotulo,
  variante = "principal",
}: {
  cliente?: ClienteEditavel;
  rotulo?: React.ReactNode;
  variante?: "principal" | "fantasma";
}) {
  return (
    <Gaveta
      rotulo={rotulo ?? (
        <>
          <UserPlus size={16} /> Novo cliente
        </>
      )}
      variante={variante}
      titulo={cliente ? "Editar cliente" : "Novo cliente"}
    >
      {(fechar) => <Campos cliente={cliente} aoSalvar={fechar} />}
    </Gaveta>
  );
}

function Campos({
  cliente,
  aoSalvar,
}: {
  cliente?: ClienteEditavel;
  aoSalvar: () => void;
}) {
  const [estado, acao] = useActionState<Resultado, FormData>(salvarCliente, undefined);

  useEffect(() => {
    if (estado?.ok) aoSalvar();
  }, [estado, aoSalvar]);

  return (
    <form action={acao} className="space-y-4">
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}

      <div>
        <label className="rotulo" htmlFor="nome">
          Nome
        </label>
        <input id="nome" name="nome" required defaultValue={cliente?.nome} className="campo" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="whatsapp">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            inputMode="tel"
            defaultValue={cliente?.whatsapp ?? ""}
            className="campo"
            placeholder="(11) 90000-0000"
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={cliente?.email ?? ""}
            className="campo"
          />
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="origem">
          Como chegou até você
        </label>
        <input
          id="origem"
          name="origem"
          list="origens"
          defaultValue={cliente?.origem ?? ""}
          className="campo"
          placeholder="indicação, instagram, passou na porta..."
        />
        <datalist id="origens">
          <option value="indicacao" />
          <option value="instagram" />
          <option value="google" />
          <option value="whatsapp" />
          <option value="passou na porta" />
          <option value="cliente antigo" />
        </datalist>
      </div>

      <div>
        <label className="rotulo" htmlFor="observacao">
          Observação
        </label>
        <textarea
          id="observacao"
          name="observacao"
          rows={3}
          defaultValue={cliente?.observacao ?? ""}
          className="campo resize-none"
          placeholder="O que você precisa lembrar sobre esse cliente."
        />
      </div>

      {estado?.erro ? (
        <p className="rounded-lg bg-sangue-clara px-3 py-2 text-sm text-sangue">{estado.erro}</p>
      ) : null}

      <BotaoEnviar carregando="Salvando...">Salvar</BotaoEnviar>
    </form>
  );
}
