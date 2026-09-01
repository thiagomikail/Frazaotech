import type { Sinal } from "@/lib/sinais";

const CORES = {
  alta: "bg-sangue-clara text-sangue",
  media: "bg-mel-clara text-mel",
  baixa: "bg-papel text-neblina",
} as const;

const NOMES = { alta: "urgente", media: "atenção", baixa: "ajuste" } as const;

export function CartaoSinal({ sinal }: { sinal: Sinal }) {
  return (
    <li className="flex gap-3 border-b border-linha px-4 py-3.5 last:border-0">
      <span className={`etiqueta h-fit shrink-0 ${CORES[sinal.gravidade]}`}>
        {NOMES[sinal.gravidade]}
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-medium leading-snug">{sinal.titulo}</p>
        <p className="mt-0.5 text-sm text-neblina">{sinal.evidencia}</p>
        {sinal.categoria === "uso" ? (
          <p className="mt-1 text-xs text-neblina/80">
            Isso é sobre o registro, não sobre a venda — corrigir aqui melhora todo o resto.
          </p>
        ) : null}
      </div>
    </li>
  );
}
