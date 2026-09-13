import Link from "next/link";
import { buscarPessoas, type OrdemBusca } from "@/lib/metricas/pessoas";
import { formatar } from "@/lib/dinheiro";
import { formatarData } from "@/lib/datas";
import { Secao, Tabela, Vazio } from "@/componentes/painel";

export const dynamic = "force-dynamic";

const ORDENS: Array<{ chave: OrdemBusca; rotulo: string }> = [
  { chave: "ltv", rotulo: "Maior LTV" },
  { chave: "recente", rotulo: "Compra recente" },
  { chave: "nome", rotulo: "Nome" },
];

export default async function PaginaPessoas({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ordem?: string; pagina?: string }>;
}) {
  const { q, ordem, pagina } = await searchParams;
  const ordemAtual = (ORDENS.find((o) => o.chave === ordem)?.chave ?? "ltv") as OrdemBusca;
  const paginaAtual = Number(pagina) || 1;

  const { pessoas, total } = await buscarPessoas({
    termo: q,
    ordem: ordemAtual,
    pagina: paginaAtual,
  });

  const paginas = Math.ceil(total / 40);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          Pessoas <span className="tabular text-sm font-normal text-tinta-fraca">({total})</span>
        </h1>
        <div className="flex gap-1 text-xs">
          {ORDENS.map((o) => (
            <Link
              key={o.chave}
              href={`/pessoas?ordem=${o.chave}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-md px-2 py-1 ${
                o.chave === ordemAtual
                  ? "bg-marca text-white"
                  : "border border-borda bg-superficie text-tinta-fraca hover:text-tinta"
              }`}
            >
              {o.rotulo}
            </Link>
          ))}
        </div>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Nome, e-mail, telefone ou CPF"
          className="flex-1 rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-marca"
        />
        <input type="hidden" name="ordem" value={ordemAtual} />
        <button className="rounded-lg border border-borda bg-superficie px-3 py-2 text-sm">
          Buscar
        </button>
      </form>

      <Secao titulo="Base" descricao="LTV e liquido acumulado: o que sobrou pra voce, nao o que a pessoa gastou.">
        {pessoas.length ? (
          <Tabela colunas={["Pessoa", "Compras", "Devol.", "Ultima compra", "LTV"]}>
            {pessoas.map((p) => (
              <tr key={p.id} className="border-b border-borda/60 last:border-0">
                <td className="py-2">
                  <Link href={`/pessoas/${p.id}`} className="font-medium hover:text-marca">
                    {p.nome ?? p.email}
                  </Link>
                  <span className="block text-xs text-tinta-fraca">{p.email}</span>
                </td>
                <td className="tabular py-2 text-right">
                  {p.comprasAprovadas}
                  {p.temAssinaturaViva && (
                    <span className="ml-1.5 rounded bg-positivo/12 px-1 py-0.5 text-[10px] text-positivo">
                      assina
                    </span>
                  )}
                </td>
                <td className={`tabular py-2 text-right ${p.reembolsos ? "text-negativo" : "text-tinta-fraca"}`}>
                  {p.reembolsos}
                </td>
                <td className="py-2 text-right text-tinta-fraca">{formatarData(p.ultimaCompraEm)}</td>
                <td className="tabular py-2 text-right font-medium">{formatar(p.ltvCentavos)}</td>
              </tr>
            ))}
          </Tabela>
        ) : (
          <Vazio>{q ? "Ninguem encontrado." : "Base vazia — rode o backfill."}</Vazio>
        )}

        {paginas > 1 && (
          <div className="mt-4 flex justify-between text-xs">
            {paginaAtual > 1 ? (
              <Link
                href={`/pessoas?ordem=${ordemAtual}&pagina=${paginaAtual - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="text-tinta-fraca hover:text-tinta"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="tabular text-tinta-fraca">
              {paginaAtual} de {paginas}
            </span>
            {paginaAtual < paginas ? (
              <Link
                href={`/pessoas?ordem=${ordemAtual}&pagina=${paginaAtual + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="text-tinta-fraca hover:text-tinta"
              >
                Proxima →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </Secao>
    </div>
  );
}
