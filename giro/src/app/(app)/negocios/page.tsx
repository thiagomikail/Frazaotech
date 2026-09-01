import type { Metadata } from "next";
import { exigirSessao } from "@/lib/sessao";
import { db } from "@/lib/db";
import { formatarBRL } from "@/lib/dinheiro";
import { diasEntre, formatarData } from "@/lib/datas";
import { Cabecalho } from "@/componentes/cabecalho";
import { Vazio } from "@/componentes/vazio";
import { GavetaNegocio, MoverNegocio } from "./formulario";

export const metadata: Metadata = { title: "Negócios" };

const COLUNAS = [
  { etapa: "NOVO", nome: "Novo", dica: "chegou agora" },
  { etapa: "CONTATO", nome: "Em contato", dica: "conversando" },
  { etapa: "PROPOSTA", nome: "Proposta", dica: "esperando resposta" },
];

export default async function PaginaNegocios() {
  const { empresa } = await exigirSessao();
  const agora = new Date();

  const [negocios, clientes] = await Promise.all([
    db.negocio.findMany({
      where: { empresaId: empresa.id },
      orderBy: { atualizadoEm: "desc" },
      select: {
        id: true,
        titulo: true,
        valorCentavos: true,
        etapa: true,
        clienteId: true,
        motivoPerda: true,
        atualizadoEm: true,
        fechadoEm: true,
        cliente: { select: { nome: true } },
      },
    }),
    db.cliente.findMany({
      where: { empresaId: empresa.id, arquivado: false },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const fechados = negocios.filter((n) => n.etapa === "GANHO" || n.etapa === "PERDIDO").slice(0, 10);
  const emAberto = negocios.filter((n) => !["GANHO", "PERDIDO"].includes(n.etapa));

  return (
    <>
      <Cabecalho
        titulo="Negócios"
        descricao={`${emAberto.length} em aberto · ${formatarBRL(
          emAberto.reduce((t, n) => t + n.valorCentavos, 0),
        )}`}
      >
        <GavetaNegocio clientes={clientes} />
      </Cabecalho>

      {negocios.length === 0 ? (
        <Vazio
          titulo="Nenhum negócio no funil"
          descricao="Cada orçamento que você manda e um negócio. Registrar aqui e o que faz o consultor enxergar onde as vendas travam."
        >
          <GavetaNegocio clientes={clientes} />
        </Vazio>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {COLUNAS.map((coluna) => {
              const daColuna = negocios.filter((n) => n.etapa === coluna.etapa);
              const total = daColuna.reduce((t, n) => t + n.valorCentavos, 0);

              return (
                <section key={coluna.etapa} className="cartao overflow-hidden">
                  <div className="border-b border-linha px-4 py-3">
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-semibold">{coluna.nome}</h2>
                      <span className="text-sm tabular-nums text-neblina">{daColuna.length}</span>
                    </div>
                    <p className="text-xs text-neblina">
                      {coluna.dica} · {formatarBRL(total)}
                    </p>
                  </div>

                  {daColuna.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-neblina">vazio</p>
                  ) : (
                    <ul className="divide-y divide-linha">
                      {daColuna.map((n) => {
                        const parado = diasEntre(n.atualizadoEm, agora);
                        return (
                          <li key={n.id} className="px-4 py-3">
                            <p className="text-[15px] font-medium leading-snug">{n.titulo}</p>
                            <p className="mt-0.5 text-sm text-neblina">
                              {n.cliente?.nome ?? "sem cliente"} ·{" "}
                              <span className="font-medium text-tinta">
                                {formatarBRL(n.valorCentavos)}
                              </span>
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <MoverNegocio id={n.id} etapa={n.etapa} />
                              <GavetaNegocio
                                negocio={n}
                                clientes={clientes}
                                rotulo="Editar"
                                variante="fantasma"
                              />
                            </div>
                            {parado >= 14 ? (
                              <p className="mt-2 text-xs text-mel">
                                parado há {parado} dias
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          {fechados.length > 0 ? (
            <section className="cartao mt-6 overflow-hidden">
              <h2 className="border-b border-linha px-4 py-3 font-semibold">
                Fechados recentemente
              </h2>
              <ul className="divide-y divide-linha">
                {fechados.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span
                      className={`etiqueta ${
                        n.etapa === "GANHO"
                          ? "bg-mata-clara text-mata"
                          : "bg-sangue-clara text-sangue"
                      }`}
                    >
                      {n.etapa === "GANHO" ? "ganho" : "perdido"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px]">{n.titulo}</p>
                      <p className="truncate text-xs text-neblina">
                        {n.cliente?.nome ?? "sem cliente"}
                        {n.fechadoEm ? ` · ${formatarData(n.fechadoEm)}` : ""}
                        {n.motivoPerda ? ` · ${n.motivoPerda}` : ""}
                      </p>
                    </div>
                    <span className="tabular-nums font-medium">
                      {formatarBRL(n.valorCentavos)}
                    </span>
                    <MoverNegocio id={n.id} etapa={n.etapa} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
