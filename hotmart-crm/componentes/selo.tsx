import { rotularStatus, rotularStatusAssinatura, contaComoReceita, contaComoDevolucao } from "@/lib/hotmart/tipos";

export function SeloStatus({ status }: { status: string }) {
  const tom = contaComoReceita(status)
    ? "bg-positivo/12 text-positivo"
    : contaComoDevolucao(status)
      ? "bg-negativo/12 text-negativo"
      : "bg-atencao/15 text-atencao";

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${tom}`}>
      {rotularStatus(status)}
    </span>
  );
}

export function SeloAssinatura({ status }: { status: string }) {
  const tom = status.startsWith("CANCELLED")
    ? "bg-negativo/12 text-negativo"
    : ["DELAYED", "OVERDUE"].includes(status)
      ? "bg-atencao/15 text-atencao"
      : "bg-positivo/12 text-positivo";

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${tom}`}>
      {rotularStatusAssinatura(status)}
    </span>
  );
}

export function SeloRisco({ nivel, score }: { nivel: string; score: number }) {
  const tom =
    nivel === "alto"
      ? "bg-negativo/12 text-negativo"
      : nivel === "medio"
        ? "bg-atencao/15 text-atencao"
        : "bg-positivo/12 text-positivo";

  return (
    <span className={`tabular inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${tom}`}>
      risco {score}
    </span>
  );
}
