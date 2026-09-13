import { notFound } from "next/navigation";
import { perfil360 } from "@/lib/metricas/pessoas";
import { formatar } from "@/lib/dinheiro";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { rotularEvento, rotularMetodo, EVENTOS_NEGATIVOS } from "@/lib/hotmart/tipos";
import { Cartao, CartaoDinheiro } from "@/componentes/cartao";
import { Secao, Tabela, Vazio } from "@/componentes/painel";
import { SeloStatus, SeloAssinatura, SeloRisco } from "@/componentes/selo";
import { anotar } from "./acoes";

export const dynamic = "force-dynamic";

export default async function PerfilPessoa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await perfil360(id);
  if (!perfil) notFound();

  const { pessoa, nomeDoProduto, carrinhos, risco, brutoTotalCentavos } = perfil;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{pessoa.nome ?? pessoa.email}</h1>
        <p className="text-sm text-tinta-fraca">
          {pessoa.email}
          {pessoa.telefone && ` · ${pessoa.telefone}`}
          {pessoa.cidade && ` · ${pessoa.cidade}${pessoa.estado ? `/${pessoa.estado}` : ""}`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoDinheiro
          titulo="LTV liquido"
          centavos={pessoa.ltvCentavos}
          detalhe={`pagou ${formatar(brutoTotalCentavos)} no total`}
        />
        <Cartao
          titulo="Compras"
          valor={String(pessoa.comprasAprovadas)}
          detalhe={`cliente desde ${formatarData(pessoa.primeiraCompraEm)}`}
        />
        <Cartao
          titulo="Devolucoes"
          valor={String(pessoa.reembolsos)}
          tom={pessoa.reembolsos ? "negativo" : "neutro"}
        />
        <Cartao
          titulo="Ultimo acesso ao curso"
          valor={pessoa.ultimoAcessoEm ? formatarData(pessoa.ultimoAcessoEm) : "—"}
          detalhe={pessoa.ultimoAcessoEm ? undefined : "sem dado do Club"}
        />
      </div>

      {risco && risco.score >= 30 && (
        <div
          className={`rounded-xl border p-4 ${
            risco.nivel === "alto" ? "border-negativo/40 bg-negativo/5" : "border-atencao/40 bg-atencao/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <SeloRisco nivel={risco.nivel} score={risco.score} />
            {risco.urgente && (
              <span className="text-xs font-medium text-negativo">cobranca chegando</span>
            )}
          </div>
          <p className="mt-2 text-sm">{risco.motivos.join(" · ")}</p>
        </div>
      )}

      {pessoa.assinaturas.length > 0 && (
        <Secao titulo="Assinaturas">
          <Tabela colunas={["Plano", "Status", "Aderiu", "Proxima cobranca", "Valor"]}>
            {pessoa.assinaturas.map((a) => (
              <tr key={a.codigo} className="border-b border-borda/60 last:border-0">
                <td className="py-2">{a.planoNome ?? a.codigo}</td>
                <td className="py-2 text-right">
                  <SeloAssinatura status={a.status} />
                </td>
                <td className="py-2 text-right text-tinta-fraca">{formatarData(a.aderiuEm)}</td>
                <td className="py-2 text-right text-tinta-fraca">
                  {formatarData(a.proximaCobrancaEm)}
                </td>
                <td className="tabular py-2 text-right font-medium">
                  {formatar(a.valorCentavos)}
                  {a.mesesPeriodo > 1 && (
                    <span className="block text-[10px] text-tinta-fraca">
                      /{a.mesesPeriodo} meses
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </Tabela>
        </Secao>
      )}

      <Secao titulo="Compras" descricao="Toda transacao, inclusive as que nao viraram dinheiro.">
        {pessoa.transacoes.length ? (
          <Tabela colunas={["Produto", "Status", "Metodo", "Data", "Liquido"]}>
            {pessoa.transacoes.map((t) => (
              <tr key={t.codigo} className="border-b border-borda/60 last:border-0">
                <td className="py-2">
                  {nomeDoProduto.get(t.produtoId) ?? t.produtoId}
                  {t.origemSrc && (
                    <span className="block text-[10px] text-tinta-fraca">src: {t.origemSrc}</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <SeloStatus status={t.status} />
                </td>
                <td className="py-2 text-right text-tinta-fraca">
                  {rotularMetodo(t.metodoPagamento)}
                  {t.parcelas && t.parcelas > 1 && (
                    <span className="text-[10px]"> {t.parcelas}x</span>
                  )}
                </td>
                <td className="py-2 text-right text-tinta-fraca">{formatarData(t.compradaEm)}</td>
                <td className="tabular py-2 text-right font-medium">
                  {formatar(t.liquidoCentavos)}
                </td>
              </tr>
            ))}
          </Tabela>
        ) : (
          <Vazio>Nenhuma transacao.</Vazio>
        )}
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Linha do tempo" descricao="Compra, curso e cobranca no mesmo fio.">
          {pessoa.eventos.length ? (
            <ol className="space-y-2">
              {pessoa.eventos.map((e) => (
                <li key={e.id} className="flex items-baseline gap-3 text-sm">
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                      EVENTOS_NEGATIVOS.includes(e.tipo) ? "bg-negativo" : "bg-positivo"
                    }`}
                  />
                  <span className="flex-1">
                    {rotularEvento(e.tipo)}
                    {e.resumo && <span className="text-tinta-fraca"> · {e.resumo}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-tinta-fraca">
                    {formatarDataHora(e.ocorridoEm)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <Vazio>Sem eventos.</Vazio>
          )}

          {carrinhos.length > 0 && (
            <div className="mt-4 border-t border-borda pt-3 text-xs text-tinta-fraca">
              {carrinhos.length} carrinho(s) abandonado(s) —{" "}
              {carrinhos.filter((c) => c.convertidoEm).length} viraram compra.
            </div>
          )}
        </Secao>

        <Secao titulo="Notas" descricao="O que a API nao sabe: a conversa.">
          <form action={anotar} className="mb-3 flex gap-2">
            <input type="hidden" name="pessoaId" value={pessoa.id} />
            <input
              name="texto"
              required
              placeholder="Ligou pedindo prorrogacao…"
              className="flex-1 rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-marca"
            />
            <button className="rounded-lg border border-borda bg-superficie px-3 py-2 text-sm">
              Salvar
            </button>
          </form>

          {pessoa.notas.length ? (
            <ul className="space-y-2 text-sm">
              {pessoa.notas.map((n) => (
                <li key={n.id} className="rounded-lg border border-borda p-2">
                  <p>{n.texto}</p>
                  <p className="mt-1 text-[11px] text-tinta-fraca">{formatarDataHora(n.criadoEm)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio>Nenhuma nota.</Vazio>
          )}
        </Secao>
      </div>
    </div>
  );
}
