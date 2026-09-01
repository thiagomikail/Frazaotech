import type { Metadata } from "next";
import { Search } from "lucide-react";
import { exigirSessao } from "@/lib/sessao";
import { db } from "@/lib/db";
import { formatarBRL } from "@/lib/dinheiro";
import { diasEntre, formatarData } from "@/lib/datas";
import { Cabecalho } from "@/componentes/cabecalho";
import { Vazio } from "@/componentes/vazio";
import { GavetaCliente } from "./formulario";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { empresa } = await exigirSessao();
  const agora = new Date();
  const { busca } = await searchParams;
  const termo = (busca ?? "").trim();

  const clientes = await db.cliente.findMany({
    where: {
      empresaId: empresa.id,
      arquivado: false,
      ...(termo ? { nome: { contains: termo, mode: "insensitive" as const } } : {}),
    },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      nome: true,
      whatsapp: true,
      email: true,
      origem: true,
      observacao: true,
      criadoEm: true,
      lancamentos: { where: { tipo: "ENTRADA" }, select: { valorCentavos: true, data: true } },
      negocios: { select: { etapa: true } },
    },
  });

  const linhas = clientes
    .map((c) => {
      const total = c.lancamentos.reduce((t, l) => t + l.valorCentavos, 0);
      const ultima = c.lancamentos.reduce<Date | null>(
        (maior, l) => (!maior || l.data > maior ? l.data : maior),
        null,
      );
      const dias = ultima ? diasEntre(ultima, agora) : null;
      return {
        ...c,
        total,
        ultima,
        dias,
        emAberto: c.negocios.filter((n) => ["NOVO", "CONTATO", "PROPOSTA"].includes(n.etapa)).length,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <Cabecalho titulo="Clientes" descricao={`${clientes.length} cadastrados`}>
        <GavetaCliente />
      </Cabecalho>

      <form className="mb-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neblina"
          />
          <input
            name="busca"
            defaultValue={termo}
            className="campo pl-9"
            placeholder="Buscar por nome"
            aria-label="Buscar cliente"
          />
        </div>
      </form>

      {linhas.length === 0 ? (
        <Vazio
          titulo={termo ? "Nenhum cliente com esse nome" : "Sua lista de clientes esta vazia"}
          descricao={
            termo
              ? "Tente outro trecho do nome."
              : "Cadastre quem já compra de você. Sem cliente vinculado ao caixa, o consultor não consegue apontar quem sumiu."
          }
        >
          {termo ? null : <GavetaCliente />}
        </Vazio>
      ) : (
        <div className="cartao divide-y divide-linha overflow-hidden">
          {linhas.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.nome}</p>
                <p className="truncate text-sm text-neblina">
                  {[c.whatsapp, c.email, c.origem].filter(Boolean).join(" · ") || "sem contato"}
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold tabular-nums">{formatarBRL(c.total)}</p>
                <p className="text-xs text-neblina">
                  {c.ultima ? `última compra ${formatarData(c.ultima)}` : "nunca comprou"}
                  {c.dias !== null && c.dias >= 60 ? (
                    <span className="ml-1.5 text-sangue">· sumiu há {c.dias}d</span>
                  ) : null}
                </p>
              </div>

              {c.emAberto > 0 ? (
                <span className="etiqueta bg-brasa-clara text-brasa">
                  {c.emAberto} em aberto
                </span>
              ) : null}

              <GavetaCliente cliente={c} rotulo="Editar" variante="fantasma" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
