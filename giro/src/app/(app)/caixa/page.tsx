import type { Metadata } from "next";
import { exigirSessao } from "@/lib/sessao";
import { db } from "@/lib/db";
import { formatarBRL } from "@/lib/dinheiro";
import { formatarData, inicioDoMes } from "@/lib/datas";
import { Cabecalho } from "@/componentes/cabecalho";
import { Vazio } from "@/componentes/vazio";
import { BotaoExcluir, GavetaLancamento } from "./formulario";

export const metadata: Metadata = { title: "Caixa" };

export default async function PaginaCaixa() {
  const { empresa } = await exigirSessao();
  const desde = inicioDoMes(-2);

  const [lancamentos, clientes] = await Promise.all([
    db.lancamento.findMany({
      where: { empresaId: empresa.id, data: { gte: desde } },
      orderBy: { data: "desc" },
      take: 200,
      select: {
        id: true,
        tipo: true,
        valorCentavos: true,
        categoria: true,
        descricao: true,
        data: true,
        cliente: { select: { nome: true } },
      },
    }),
    db.cliente.findMany({
      where: { empresaId: empresa.id, arquivado: false },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const inicio = inicioDoMes();
  const doMes = lancamentos.filter((l) => l.data >= inicio);
  const entradas = doMes.filter((l) => l.tipo === "ENTRADA").reduce((t, l) => t + l.valorCentavos, 0);
  const saidas = doMes.filter((l) => l.tipo === "SAIDA").reduce((t, l) => t + l.valorCentavos, 0);

  // Agrupa por dia para a lista não virar uma parede de linhas.
  const porDia = new Map<string, typeof lancamentos>();
  for (const l of lancamentos) {
    const chave = l.data.toISOString().slice(0, 10);
    porDia.set(chave, [...(porDia.get(chave) ?? []), l]);
  }

  return (
    <>
      <Cabecalho titulo="Caixa" descricao="O que entrou e o que saiu, nos últimos 3 meses.">
        <GavetaLancamento clientes={clientes} />
      </Cabecalho>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="cartao p-4">
          <p className="text-[13px] text-neblina">Entrou este mês</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-mata">
            {formatarBRL(entradas)}
          </p>
        </div>
        <div className="cartao p-4">
          <p className="text-[13px] text-neblina">Saiu este mês</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-sangue">
            {formatarBRL(saidas)}
          </p>
        </div>
        <div className="cartao p-4">
          <p className="text-[13px] text-neblina">Sobrou</p>
          <p
            className={`mt-1 text-2xl font-bold tracking-tight ${
              entradas - saidas < 0 ? "text-sangue" : "text-tinta"
            }`}
          >
            {formatarBRL(entradas - saidas)}
          </p>
        </div>
      </section>

      {lancamentos.length === 0 ? (
        <Vazio
          titulo="Nenhum lançamento ainda"
          descricao="Comece pelo mais simples: as entradas da última semana. Dez minutos de digitação valem mais para o consultor do que qualquer configuração."
        >
          <GavetaLancamento clientes={clientes} />
        </Vazio>
      ) : (
        <div className="space-y-4">
          {[...porDia.entries()].map(([dia, itens]) => {
            const saldoDoDia = itens.reduce(
              (t, l) => t + (l.tipo === "ENTRADA" ? l.valorCentavos : -l.valorCentavos),
              0,
            );
            return (
              <section key={dia} className="cartao overflow-hidden">
                <div className="flex items-center justify-between border-b border-linha bg-papel/60 px-4 py-2">
                  <h2 className="text-sm font-medium">{formatarData(new Date(`${dia}T12:00:00`))}</h2>
                  <span
                    className={`text-sm tabular-nums ${
                      saldoDoDia < 0 ? "text-sangue" : "text-mata"
                    }`}
                  >
                    {saldoDoDia >= 0 ? "+" : "−"} {formatarBRL(Math.abs(saldoDoDia))}
                  </span>
                </div>
                <ul className="divide-y divide-linha">
                  {itens.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px]">{l.categoria}</p>
                        <p className="truncate text-xs text-neblina">
                          {[l.cliente?.nome, l.descricao].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-semibold tabular-nums ${
                          l.tipo === "ENTRADA" ? "text-mata" : "text-sangue"
                        }`}
                      >
                        {l.tipo === "ENTRADA" ? "+" : "−"} {formatarBRL(l.valorCentavos)}
                      </span>
                      <BotaoExcluir id={l.id} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
