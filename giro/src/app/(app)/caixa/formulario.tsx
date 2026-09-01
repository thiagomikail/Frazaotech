"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { excluirLancamento, salvarLancamento, type Resultado } from "@/acoes/dados";
import { Gaveta } from "@/componentes/gaveta";
import { BotaoEnviar } from "@/componentes/botao-enviar";
import { paraInputDate } from "@/lib/datas";

const CATEGORIAS_ENTRADA = ["Venda", "Serviço", "Mensalidade", "Outros"];
const CATEGORIAS_SAIDA = [
  "Fornecedor",
  "Aluguel",
  "Salário",
  "Imposto",
  "Marketing",
  "Transporte",
  "Manutenção",
  "Outros",
];

export function GavetaLancamento({ clientes }: { clientes: { id: string; nome: string }[] }) {
  return (
    <Gaveta
      rotulo={
        <>
          <Plus size={16} /> Lançar
        </>
      }
      titulo="Novo lançamento"
    >
      {(fechar) => <Campos clientes={clientes} aoSalvar={fechar} />}
    </Gaveta>
  );
}

function Campos({
  clientes,
  aoSalvar,
}: {
  clientes: { id: string; nome: string }[];
  aoSalvar: () => void;
}) {
  const [estado, acao] = useActionState<Resultado, FormData>(salvarLancamento, undefined);
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  // A categoria e controlada porque a lista muda junto com o tipo. Com
  // `defaultValue` o select ficava com um valor que nao existe mais na nova
  // lista e o navegador caia em "Outros" — logo a categoria que o proprio
  // diagnostico depois aponta como problema.
  const [categoria, setCategoria] = useState(CATEGORIAS_ENTRADA[0]);

  useEffect(() => {
    if (estado?.ok) aoSalvar();
  }, [estado, aoSalvar]);

  const categorias = tipo === "ENTRADA" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;

  function trocarTipo(novo: "ENTRADA" | "SAIDA") {
    setTipo(novo);
    setCategoria((novo === "ENTRADA" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA)[0]);
  }

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="tipo" value={tipo} />

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-papel p-1">
        {(["ENTRADA", "SAIDA"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => trocarTipo(t)}
            aria-pressed={tipo === t}
            className={`min-h-11 rounded-md text-[15px] font-semibold transition ${
              tipo === t
                ? t === "ENTRADA"
                  ? "bg-mata text-white"
                  : "bg-sangue text-white"
                : "text-neblina hover:text-tinta"
            }`}
          >
            {t === "ENTRADA" ? "Entrou" : "Saiu"}
          </button>
        ))}
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
            required
            autoFocus
            className="campo text-lg font-semibold"
            placeholder="120,00"
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="data">
            Data
          </label>
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={paraInputDate(new Date())}
            className="campo"
          />
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="categoria">
          Categoria
        </label>
        <select
          id="categoria"
          name="categoria"
          className="campo"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-neblina">
          Fugir de &quot;Outros&quot; e o que permite responder para onde o dinheiro vai.
        </p>
      </div>

      {tipo === "ENTRADA" ? (
        <div>
          <label className="rotulo" htmlFor="clienteId">
            De quem veio
          </label>
          <select id="clienteId" name="clienteId" className="campo" defaultValue="">
            <option value="">não vincular a cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-neblina">
            Vinculando, o consultor consegue avisar quando esse cliente sumir.
          </p>
        </div>
      ) : null}

      <div>
        <label className="rotulo" htmlFor="descricao">
          Descrição
        </label>
        <input id="descricao" name="descricao" className="campo" placeholder="opcional" />
      </div>

      {estado?.erro ? (
        <p className="rounded-lg bg-sangue-clara px-3 py-2 text-sm text-sangue">{estado.erro}</p>
      ) : null}

      <BotaoEnviar carregando="Salvando...">Salvar lançamento</BotaoEnviar>
    </form>
  );
}

export function BotaoExcluir({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      aria-label="Excluir lançamento"
      disabled={pendente}
      onClick={() => {
        if (!confirm("Excluir este lançamento?")) return;
        iniciar(() => {
          void excluirLancamento(id);
        });
      }}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-neblina hover:bg-papel hover:text-sangue disabled:opacity-40"
    >
      <Trash2 size={15} />
    </button>
  );
}
