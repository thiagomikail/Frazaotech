"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatar, formatarCurto } from "@/lib/dinheiro";

/*
  Recharts precisa rodar no cliente. Este e o unico arquivo "use client" que
  toca numero de dinheiro — por isso importa de lib/dinheiro.ts, que e puro.
  Importar de qualquer lib com `server-only` aqui arrastaria o Prisma pro
  navegador e quebraria o build.
*/

const GRADE = "oklch(0.85 0.01 250 / 0.5)";

function Caixa({ ativo, payload, label }: {
  ativo?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!ativo || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-borda bg-superficie px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="tabular" style={{ color: p.color }}>
          {p.name}: {p.name.includes("R$") || p.name === "Receita" || p.name === "MRR"
            ? formatar(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
}

export function GraficoReceita({
  dados,
}: {
  dados: Array<{ rotulo: string; liquidoCentavos: number; vendas: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="tintaReceita" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-marca)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-marca)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRADE} vertical={false} />
        <XAxis dataKey="rotulo" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={54}
          tickFormatter={(v: number) => formatarCurto(v)}
        />
        <Tooltip content={<Caixa />} />
        <Area
          type="monotone"
          dataKey="liquidoCentavos"
          name="Receita"
          stroke="var(--color-marca)"
          strokeWidth={2}
          fill="url(#tintaReceita)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GraficoRecorrencia({
  dados,
}: {
  dados: Array<{ rotulo: string; mrrCentavos: number; novas: number; canceladas: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={GRADE} vertical={false} />
        <XAxis dataKey="rotulo" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis
          yAxisId="dinheiro"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={54}
          tickFormatter={(v: number) => formatarCurto(v)}
        />
        <YAxis yAxisId="conta" orientation="right" tickLine={false} axisLine={false} fontSize={11} width={32} />
        <Tooltip content={<Caixa />} />
        {/* Novas e canceladas na mesma moldura do MRR: e a subtracao entre as
            duas que explica a linha subir ou descer. */}
        <Bar yAxisId="conta" dataKey="novas" name="Novas" fill="var(--color-positivo)" opacity={0.5} />
        <Bar yAxisId="conta" dataKey="canceladas" name="Canceladas" fill="var(--color-negativo)" opacity={0.5} />
        <Line
          yAxisId="dinheiro"
          type="monotone"
          dataKey="mrrCentavos"
          name="MRR"
          stroke="var(--color-marca)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GraficoBarras({
  dados,
}: {
  dados: Array<{ rotulo: string; valor: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(dados.length * 30, 120)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="rotulo" width={140} tickLine={false} axisLine={false} fontSize={11} />
        <Tooltip content={<Caixa />} cursor={{ fill: "transparent" }} />
        <Bar dataKey="valor" name="Receita" fill="var(--color-marca)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
