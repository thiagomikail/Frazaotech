import { formatar, formatarPercentual } from "@/lib/dinheiro";

/** Cartao de numero. Titulo pequeno, numero grande, contexto embaixo. */
export function Cartao({
  titulo,
  valor,
  detalhe,
  variacao,
  tom = "neutro",
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  variacao?: number | null;
  tom?: "neutro" | "positivo" | "negativo" | "atencao";
}) {
  const cor =
    tom === "positivo"
      ? "text-positivo"
      : tom === "negativo"
        ? "text-negativo"
        : tom === "atencao"
          ? "text-atencao"
          : "text-tinta";

  return (
    <div className="rounded-xl border border-borda bg-superficie p-4">
      <p className="text-xs font-medium text-tinta-fraca">{titulo}</p>
      <p className={`tabular mt-1 text-2xl font-semibold ${cor}`}>{valor}</p>
      <div className="mt-1 flex items-baseline gap-2 text-xs">
        {variacao !== undefined && variacao !== null && (
          <span className={variacao >= 0 ? "text-positivo" : "text-negativo"}>
            {variacao >= 0 ? "▲" : "▼"} {formatarPercentual(Math.abs(variacao))}
          </span>
        )}
        {detalhe && <span className="text-tinta-fraca">{detalhe}</span>}
      </div>
    </div>
  );
}

export function CartaoDinheiro(props: {
  titulo: string;
  centavos: number;
  detalhe?: string;
  variacao?: number | null;
  tom?: "neutro" | "positivo" | "negativo" | "atencao";
}) {
  const { centavos, ...resto } = props;
  return <Cartao {...resto} valor={formatar(centavos)} />;
}
