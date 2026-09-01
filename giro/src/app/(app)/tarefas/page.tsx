import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { exigirSessao } from "@/lib/sessao";
import { db } from "@/lib/db";
import { formatarData } from "@/lib/datas";
import { Cabecalho } from "@/componentes/cabecalho";
import { Vazio } from "@/componentes/vazio";
import { GavetaTarefa, Marcador } from "./formulario";

export const metadata: Metadata = { title: "Tarefas" };

export default async function PaginaTarefas() {
  const { empresa } = await exigirSessao();

  const tarefas = await db.tarefa.findMany({
    where: { empresaId: empresa.id },
    orderBy: [{ feita: "asc" }, { prazo: "asc" }, { criadoEm: "desc" }],
    take: 100,
    select: {
      id: true,
      titulo: true,
      detalhe: true,
      prazo: true,
      feita: true,
      origem: true,
      cliente: { select: { nome: true } },
    },
  });

  const abertas = tarefas.filter((t) => !t.feita);
  const feitas = tarefas.filter((t) => t.feita).slice(0, 20);
  const agora = new Date();

  return (
    <>
      <Cabecalho titulo="Tarefas" descricao={`${abertas.length} em aberto`}>
        <GavetaTarefa />
      </Cabecalho>

      {tarefas.length === 0 ? (
        <Vazio
          titulo="Nada na lista"
          descricao="Anote o que você não pode esquecer. O consultor também escreve aqui quando você aceita uma sugestao dele."
        >
          <GavetaTarefa />
        </Vazio>
      ) : (
        <div className="space-y-6">
          <section className="cartao divide-y divide-linha overflow-hidden">
            {abertas.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neblina">
                Tudo em dia. Aproveita.
              </p>
            ) : (
              abertas.map((t) => {
                const atrasada = t.prazo && t.prazo < agora;
                return (
                  <div key={t.id} className="flex gap-3 px-4 py-3.5">
                    <Marcador id={t.id} feita={false} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] leading-snug">{t.titulo}</p>
                      {t.detalhe ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-neblina">{t.detalhe}</p>
                      ) : null}
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-neblina">
                        <span className={atrasada ? "font-medium text-sangue" : ""}>
                          {t.prazo ? `até ${formatarData(t.prazo)}` : "sem prazo"}
                          {atrasada ? " · atrasada" : ""}
                        </span>
                        {t.cliente ? <span>· {t.cliente.nome}</span> : null}
                        {t.origem === "CONSULTOR" ? (
                          <span className="inline-flex items-center gap-1 text-brasa">
                            · <Sparkles size={11} /> consultor
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {feitas.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-medium text-neblina">Concluidas</h2>
              <div className="cartao divide-y divide-linha overflow-hidden">
                {feitas.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <Marcador id={t.id} feita />
                    <p className="min-w-0 flex-1 truncate text-[15px] text-neblina line-through">
                      {t.titulo}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
