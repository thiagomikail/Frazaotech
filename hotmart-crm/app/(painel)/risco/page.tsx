import Link from "next/link";
import { filaDeRisco } from "@/lib/metricas/pessoas";
import { formatar } from "@/lib/dinheiro";
import { formatarData } from "@/lib/datas";
import { Secao, Tabela, Vazio } from "@/componentes/painel";
import { SeloRisco } from "@/componentes/selo";

export const dynamic = "force-dynamic";

export default async function PaginaRisco() {
  const fila = await filaDeRisco();

  const emRiscoCentavos = fila.reduce((s, p) => s + p.ltvCentavos, 0);
  const urgentes = fila.filter((p) => p.risco.urgente);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Risco de churn</h1>
        <p className="text-sm text-tinta-fraca">
          A unica tela do painel que pede uma acao hoje em vez de descrever o passado.
          {urgentes.length > 0 && (
            <>
              {" "}
              <strong className="text-negativo">
                {urgentes.length} com cobranca nos proximos 7 dias
              </strong>{" "}
              — e a janela pra agir antes da fatura.
            </>
          )}
        </p>
      </div>

      <Secao
        titulo={`${fila.length} assinantes em risco`}
        descricao={`${formatar(emRiscoCentavos)} de LTV acumulado nessa fila. Score e soma de sinais explicitos, nao previsao estatistica.`}
      >
        {fila.length ? (
          <Tabela colunas={["Pessoa", "Sinais", "Proxima cobranca", "LTV"]}>
            {fila.map((p) => (
              <tr key={p.id} className="border-b border-borda/60 last:border-0">
                <td className="py-2">
                  <Link href={`/pessoas/${p.id}`} className="font-medium hover:text-marca">
                    {p.nome ?? p.email}
                  </Link>
                  <span className="ml-2">
                    <SeloRisco nivel={p.risco.nivel} score={p.risco.score} />
                  </span>
                  <span className="block text-xs text-tinta-fraca">{p.email}</span>
                </td>
                <td className="py-2 text-right text-xs text-tinta-fraca">
                  {p.risco.motivos.join(" · ")}
                </td>
                <td
                  className={`py-2 text-right text-xs ${p.risco.urgente ? "font-medium text-negativo" : "text-tinta-fraca"}`}
                >
                  {formatarData(p.proximaCobrancaEm)}
                </td>
                <td className="tabular py-2 text-right font-medium">{formatar(p.ltvCentavos)}</td>
              </tr>
            ))}
          </Tabela>
        ) : (
          <Vazio>
            Nenhum assinante em risco — ou o espelho ainda nao tem dado de assinatura e de acesso ao
            curso.
          </Vazio>
        )}
      </Secao>
    </div>
  );
}
