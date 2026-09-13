import { resolverPeriodo, ehChaveValida, type ChavePeriodo } from "@/lib/metricas/periodo";
import {
  resumoDeReceita,
  serieDeReceita,
  receitaPorProduto,
  receitaPorMetodo,
} from "@/lib/metricas/receita";
import { resumoDeRecorrencia, serieDeRecorrencia, cohortDeRetencao } from "@/lib/metricas/recorrencia";
import { funilDePagamento, resumoDeCarrinho } from "@/lib/metricas/funil";
import { receitaPorOrigem, rankingDeAfiliados } from "@/lib/metricas/origem";
import { formatar, formatarCurto, formatarPercentual } from "@/lib/dinheiro";
import { rotularMetodo } from "@/lib/hotmart/tipos";
import { Cartao, CartaoDinheiro } from "@/componentes/cartao";
import { Secao, Tabela, Vazio } from "@/componentes/painel";
import { GraficoReceita, GraficoRecorrencia, GraficoBarras } from "@/componentes/graficos";
import { MatrizCohort } from "@/componentes/cohort";
import { BarraPeriodo } from "@/componentes/barra-periodo";

export const dynamic = "force-dynamic";

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const chave: ChavePeriodo = ehChaveValida(p) ? p : "30d";
  const periodo = resolverPeriodo(chave);

  const [receita, serie, produtos, metodos, recorrencia, serieMrr, cohort, funil, carrinho, origens, afiliados] =
    await Promise.all([
      resumoDeReceita(periodo.de, periodo.ate, periodo.deAnterior, periodo.ateAnterior),
      serieDeReceita(periodo.de, periodo.ate, periodo.granularidade),
      receitaPorProduto(periodo.de, periodo.ate),
      receitaPorMetodo(periodo.de, periodo.ate),
      resumoDeRecorrencia(),
      serieDeRecorrencia(12),
      cohortDeRetencao(12),
      funilDePagamento(periodo.de, periodo.ate),
      resumoDeCarrinho(periodo.de, periodo.ate),
      receitaPorOrigem(periodo.de, periodo.ate),
      rankingDeAfiliados(periodo.de, periodo.ate),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Painel</h1>
        <BarraPeriodo atual={chave} />
      </div>

      {/* Liquido primeiro e bruto como nota de rodape: o numero que a Hotmart
          mostra na home e o bruto, e ele faz todo mundo achar que ganha mais
          do que ganha. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoDinheiro
          titulo="Receita liquida"
          centavos={receita.liquidoCentavos}
          variacao={receita.variacaoLiquido}
          detalhe={`bruto ${formatarCurto(receita.brutoCentavos)}`}
        />
        <Cartao
          titulo="Vendas"
          valor={String(receita.vendas)}
          variacao={receita.variacaoVendas}
          detalhe={`ticket ${formatar(receita.ticketMedioCentavos)}`}
        />
        <CartaoDinheiro titulo="MRR" centavos={recorrencia.mrrCentavos} detalhe={`${recorrencia.assinantesAtivos} assinantes`} />
        <Cartao
          titulo="Devolucoes"
          valor={formatarPercentual(receita.taxaDevolucao)}
          detalhe={`${receita.devolucoes} no periodo`}
          tom={receita.taxaDevolucao >= 10 ? "negativo" : receita.taxaDevolucao >= 5 ? "atencao" : "neutro"}
        />
      </div>

      <Secao titulo="Receita liquida no periodo" descricao="O que caiu pra voce, depois da taxa da Hotmart e do split.">
        {serie.length ? <GraficoReceita dados={serie} /> : <Vazio>Sem vendas no periodo.</Vazio>}
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao
          titulo="Assinaturas"
          descricao="MRR normalizado por periodo — anual entra dividida em 12, nao de uma vez."
        >
          {serieMrr.length ? <GraficoRecorrencia dados={serieMrr} /> : <Vazio>Nenhuma assinatura ainda.</Vazio>}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <p className="text-tinta-fraca">Churn no mes</p>
              <p className="tabular font-semibold">{formatarPercentual(recorrencia.churnMensal)}</p>
            </div>
            <div>
              <p className="text-tinta-fraca">ARR</p>
              <p className="tabular font-semibold">{formatarCurto(recorrencia.arrCentavos)}</p>
            </div>
            <div>
              <p className="text-tinta-fraca">Cobram em 7d</p>
              <p className="tabular font-semibold">{recorrencia.cobrancasProximos7Dias}</p>
            </div>
            <div>
              <p className="text-tinta-fraca">Inadimplentes</p>
              <p className={`tabular font-semibold ${recorrencia.inadimplentes ? "text-atencao" : ""}`}>
                {recorrencia.inadimplentes}
              </p>
            </div>
          </div>
        </Secao>

        <Secao
          titulo="Retencao por safra"
          descricao="De cada mes de entrada, quantos continuam assinando depois. Vazio = mes que ainda nao chegou."
        >
          <MatrizCohort linhas={cohort} />
        </Secao>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Produtos" descricao="Receita liquida e devolucao lado a lado.">
          {produtos.length ? (
            <Tabela colunas={["Produto", "Vendas", "Devol.", "Liquido"]}>
              {produtos.map((p) => (
                <tr key={p.produtoId} className="border-b border-borda/60 last:border-0">
                  <td className="py-2">
                    {p.nome}
                    {p.ehRecorrente && (
                      <span className="ml-1.5 text-[10px] text-tinta-fraca">recorrente</span>
                    )}
                  </td>
                  <td className="tabular py-2 text-right">{p.vendas}</td>
                  <td className={`tabular py-2 text-right ${p.taxaDevolucao >= 10 ? "text-negativo" : ""}`}>
                    {formatarPercentual(p.taxaDevolucao)}
                  </td>
                  <td className="tabular py-2 text-right font-medium">{formatar(p.liquidoCentavos)}</td>
                </tr>
              ))}
            </Tabela>
          ) : (
            <Vazio>Sem vendas no periodo.</Vazio>
          )}
        </Secao>

        <Secao
          titulo="Funil de pagamento"
          descricao="Quem chegou ao checkout e nao converteu. Boleto e Pix gerados e nao pagos sao dinheiro a um lembrete de distancia."
        >
          {funil.length ? (
            <Tabela colunas={["Metodo", "Iniciadas", "Conversao", "Perdido"]}>
              {funil.map((f) => (
                <tr key={f.metodo} className="border-b border-borda/60 last:border-0">
                  <td className="py-2">{rotularMetodo(f.metodo)}</td>
                  <td className="tabular py-2 text-right">{f.iniciadas}</td>
                  <td className={`tabular py-2 text-right ${f.conversao < 50 ? "text-atencao" : ""}`}>
                    {formatarPercentual(f.conversao)}
                  </td>
                  <td className="tabular py-2 text-right text-tinta-fraca">
                    {formatar(f.valorPerdidoCentavos)}
                  </td>
                </tr>
              ))}
            </Tabela>
          ) : (
            <Vazio>Sem dados de funil. O backfill precisa rodar com filtro de status.</Vazio>
          )}

          <div className="mt-4 rounded-lg border border-borda p-3 text-xs">
            {carrinho.temDados ? (
              <p>
                <span className="font-medium">{carrinho.abandonados}</span> carrinhos abandonados,{" "}
                <span className="font-medium text-positivo">{carrinho.recuperados}</span> recuperados (
                {formatarPercentual(carrinho.taxaRecuperacao)}) —{" "}
                {formatar(carrinho.valorAbandonadoCentavos)} em jogo.
              </p>
            ) : (
              <p className="text-atencao">
                Nenhum carrinho abandonado registrado. Esse evento so chega por webhook e{" "}
                <strong>nao tem backfill</strong>: cada dia com o webhook desligado e dado perdido
                pra sempre.
              </p>
            )}
          </div>
        </Secao>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Origem do trafego" descricao="Pelo parametro src do checkout.">
          {origens.length ? (
            <GraficoBarras
              dados={origens.map((o) => ({ rotulo: o.origem, valor: o.liquidoCentavos }))}
            />
          ) : (
            <Vazio>Sem vendas no periodo.</Vazio>
          )}
        </Secao>

        <Secao
          titulo="Afiliados"
          descricao="Volume e devolucao na mesma linha: quem vende muito e devolve muito custa dinheiro."
        >
          {afiliados.length ? (
            <Tabela colunas={["Afiliado", "Vendas", "Devol.", "Liquido"]}>
              {afiliados.map((a) => (
                <tr key={a.codigo} className="border-b border-borda/60 last:border-0">
                  <td className="py-2">{a.nome}</td>
                  <td className="tabular py-2 text-right">{a.vendas}</td>
                  <td className={`tabular py-2 text-right ${a.taxaDevolucao >= 15 ? "text-negativo" : ""}`}>
                    {formatarPercentual(a.taxaDevolucao)}
                  </td>
                  <td className="tabular py-2 text-right font-medium">{formatar(a.liquidoCentavos)}</td>
                </tr>
              ))}
            </Tabela>
          ) : (
            <Vazio>Nenhuma venda por afiliado no periodo.</Vazio>
          )}
        </Secao>
      </div>

      <Secao titulo="Meios de pagamento" descricao="Onde o dinheiro entra.">
        {metodos.length ? (
          <Tabela colunas={["Metodo", "Vendas", "Liquido"]}>
            {metodos.map((m) => (
              <tr key={m.metodo} className="border-b border-borda/60 last:border-0">
                <td className="py-2">{rotularMetodo(m.metodo)}</td>
                <td className="tabular py-2 text-right">{m.vendas}</td>
                <td className="tabular py-2 text-right font-medium">{formatar(m.liquidoCentavos)}</td>
              </tr>
            ))}
          </Tabela>
        ) : (
          <Vazio>Sem vendas no periodo.</Vazio>
        )}
      </Secao>
    </div>
  );
}
