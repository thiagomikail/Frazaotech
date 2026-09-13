import type { LinhaCohort } from "@/lib/metricas/recorrencia";

/**
 * Matriz de cohort. Celula vazia = mes que ainda nao aconteceu para aquela
 * safra — diferente de 0%, que seria dizer que todo mundo cancelou.
 */
export function MatrizCohort({ linhas }: { linhas: LinhaCohort[] }) {
  if (!linhas.length) {
    return <p className="py-6 text-center text-sm text-tinta-fraca">Sem assinaturas no periodo.</p>;
  }

  const colunas = Math.max(...linhas.map((l) => l.retencao.length));

  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="text-xs">
        <thead>
          <tr className="text-tinta-fraca">
            <th className="px-2 py-1 text-left font-medium">Safra</th>
            <th className="px-2 py-1 text-right font-medium">Assin.</th>
            {Array.from({ length: colunas }, (_, i) => (
              <th key={i} className="px-2 py-1 text-right font-medium">
                M{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.coorte}>
              <td className="whitespace-nowrap px-2 py-1 font-medium">{linha.rotulo}</td>
              <td className="tabular px-2 py-1 text-right text-tinta-fraca">{linha.tamanho}</td>
              {Array.from({ length: colunas }, (_, i) => {
                const valor = linha.retencao[i];
                if (valor === null || valor === undefined) {
                  return <td key={i} className="px-2 py-1" />;
                }
                // Opacidade proporcional a retencao: a diagonal de queda
                // aparece antes de qualquer numero ser lido.
                return (
                  <td
                    key={i}
                    className="tabular px-2 py-1 text-right"
                    style={{
                      background: `color-mix(in oklch, var(--color-marca) ${Math.round(valor * 0.55)}%, transparent)`,
                    }}
                  >
                    {valor.toFixed(0)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
