import type { Metadata } from "next";
import { exigirSessao } from "@/lib/sessao";
import { db } from "@/lib/db";
import { consumoDoMes } from "@/lib/uso-ia";
import { iaConfigurada } from "@/lib/openrouter";
import { Cabecalho } from "@/componentes/cabecalho";
import { Conversa } from "./conversa";

export const metadata: Metadata = { title: "Consultor" };

const SUGESTOES = [
  "Como está meu mês?",
  "Quais clientes eu deveria chamar esta semana?",
  "Para onde meu dinheiro está indo?",
  "Onde meu funil está travando?",
];

export default async function PaginaConsultor() {
  const { empresa } = await exigirSessao();

  const [conversa, consumo] = await Promise.all([
    db.conversa.findFirst({
      where: { empresaId: empresa.id },
      orderBy: { atualizadaEm: "desc" },
      include: { mensagens: { orderBy: { criadaEm: "asc" }, take: 40 } },
    }),
    consumoDoMes(empresa.id, empresa.plano),
  ]);

  const falas = (conversa?.mensagens ?? []).map((m) => ({
    papel: m.papel,
    conteudo: m.conteudo,
    ferramentas: Array.isArray(m.ferramentas) ? (m.ferramentas as string[]) : undefined,
  }));

  const restantes = Math.max(0, consumo.perguntasLimite - consumo.perguntasUsadas);

  return (
    <>
      <Cabecalho
        titulo="Consultor"
        descricao={`${restantes} de ${consumo.perguntasLimite} perguntas restantes neste mês`}
      />

      {!iaConfigurada() ? (
        <div className="mb-4 rounded-xl border border-mel/30 bg-mel-clara p-4 text-sm">
          <p className="font-medium text-mel">O consultor esta desligado nesta instalação.</p>
          <p className="mt-1 text-tinta/75">
            Defina <code className="font-mono text-[13px]">OPENROUTER_API_KEY</code> no ambiente
            (chave em openrouter.aí/keys) e reinicie. O resto do app funciona normalmente.
          </p>
        </div>
      ) : null}

      <Conversa inicial={falas} conversaId={conversa?.id} sugestoes={SUGESTOES} />
    </>
  );
}
