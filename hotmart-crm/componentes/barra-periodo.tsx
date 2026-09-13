import Link from "next/link";
import { PERIODOS, type ChavePeriodo } from "@/lib/metricas/periodo";

export function BarraPeriodo({ atual }: { atual: ChavePeriodo }) {
  return (
    <div className="flex flex-wrap gap-1 text-xs">
      {(Object.keys(PERIODOS) as ChavePeriodo[]).map((chave) => (
        <Link
          key={chave}
          href={`/?p=${chave}`}
          className={`rounded-md px-2 py-1 ${
            chave === atual
              ? "bg-marca text-white"
              : "border border-borda bg-superficie text-tinta-fraca hover:text-tinta"
          }`}
        >
          {PERIODOS[chave]}
        </Link>
      ))}
    </div>
  );
}
