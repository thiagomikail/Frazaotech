import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { exigirSessao } from "@/lib/sessao";
import { montarRetrato } from "@/lib/sinais";
import { db } from "@/lib/db";
import { formatarBRL } from "@/lib/dinheiro";
import { formatarData } from "@/lib/datas";
import { Cabecalho } from "@/componentes/cabecalho";
import { CartaoSinal } from "@/componentes/sinal";

export const metadata: Metadata = { title: "Painel" };

const NOME_ETAPA: Record<string, string> = {
  NOVO: "Novo",
  CONTATO: "Em contato",
  PROPOSTA: "Proposta",
  GANHO: "Ganho",
  PERDIDO: "Perdido",
};

export default async function Painel() {
  const { empresa, usuario } = await exigirSessao();
  const retrato = await montarRetrato(empresa.id);

  const [ultimos, tarefas] = await Promise.all([
    db.lancamento.findMany({
      where: { empresaId: empresa.id },
      orderBy: { data: "desc" },
      take: 6,
      select: {
        id: true,
        tipo: true,
        valorCentavos: true,
        categoria: true,
        data: true,
        cliente: { select: { nome: true } },
      },
    }),
    db.tarefa.findMany({
      where: { empresaId: empresa.id, feita: false },
      orderBy: [{ prazo: "asc" }],
      take: 5,
      select: { id: true, titulo: true, prazo: true, origem: true },
    }),
  ]);

  const primeiroNome = usuario.nome.split(" ")[0];
  const abertos = retrato.funil.porEtapa.filter((e) =>
    ["NOVO", "CONTATO", "PROPOSTA"].includes(e.etapa),
  );
  const semNada = retrato.clientes.total === 0 && retrato.uso.diasDesdeUltimoLancamento === null;

  return (
    <>
      <Cabecalho
        titulo={`Olá, ${primeiroNome}`}
        descricao={`${empresa.nome} · ${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
      />

      {semNada ? (
        <div className="mb-6 rounded-xl border border-brasa/25 bg-brasa-clara p-5">
          <p className="font-semibold">Comece pelo caixa.</p>
          <p className="mt-1 text-sm text-tinta/75">
            O consultor só consegue dizer alguma coisa útil depois que ele tem número para ler.
            Lance as entradas e saidas de uma semana — dez minutos — e volte aqui.
          </p>
          <Link href="/caixa" className="botao mt-4">
            Lançar no caixa <ArrowRight size={16} />
          </Link>
        </div>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Numero
          rotulo="Entradas do mês"
          valor={formatarBRL(retrato.caixa.entradasMes)}
          anterior={retrato.caixa.entradasMesAnterior}
          atual={retrato.caixa.entradasMes}
          Icone={TrendingUp}
          cor="text-mata"
        />
        <Numero
          rotulo="Saídas do mês"
          valor={formatarBRL(retrato.caixa.saidasMes)}
          anterior={retrato.caixa.saidasMesAnterior}
          atual={retrato.caixa.saidasMes}
          invertido
          Icone={TrendingDown}
          cor="text-sangue"
        />
        <Numero
          rotulo="Saldo do mês"
          valor={formatarBRL(retrato.caixa.saldoMes)}
          anterior={retrato.caixa.saldoMesAnterior}
          atual={retrato.caixa.saldoMes}
          Icone={Wallet}
          cor={retrato.caixa.saldoMes < 0 ? "text-sangue" : "text-tinta"}
        />
        <div className="cartao p-4">
          <p className="text-[13px] text-neblina">Em aberto no funil</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {formatarBRL(retrato.funil.valorEmAberto)}
          </p>
          <p className="mt-1 text-xs text-neblina">
            {abertos.reduce((t, e) => t + e.quantidade, 0)} negócios ·{" "}
            {retrato.funil.taxaConversao === null
              ? "sem histórico de fechamento"
              : `${retrato.funil.taxaConversao}% de conversão em 90 dias`}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="cartao overflow-hidden">
            <div className="flex items-center justify-between border-b border-linha px-4 py-3">
              <h2 className="font-semibold">O que merece sua atenção</h2>
              <Link
                href="/diagnostico"
                className="text-sm font-medium text-brasa hover:underline"
              >
                Diagnóstico completo
              </Link>
            </div>
            {retrato.sinais.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neblina">
                Nenhum sinal de alerta agora. Bom sinal — ou dado de menos.
              </p>
            ) : (
              <ul>
                {retrato.sinais.slice(0, 4).map((s) => (
                  <CartaoSinal key={s.chave} sinal={s} />
                ))}
              </ul>
            )}
          </section>

          <section className="cartao overflow-hidden">
            <div className="flex items-center justify-between border-b border-linha px-4 py-3">
              <h2 className="font-semibold">Últimos lançamentos</h2>
              <Link href="/caixa" className="text-sm font-medium text-brasa hover:underline">
                Ver caixa
              </Link>
            </div>
            {ultimos.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neblina">
                Nada lancado ainda.
              </p>
            ) : (
              <ul>
                {ultimos.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 border-b border-linha px-4 py-3 last:border-0"
                  >
                    <span className="w-12 shrink-0 text-xs text-neblina">
                      {formatarData(l.data)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px]">{l.categoria}</span>
                      {l.cliente ? (
                        <span className="block truncate text-xs text-neblina">
                          {l.cliente.nome}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`shrink-0 text-[15px] font-semibold tabular-nums ${
                        l.tipo === "ENTRADA" ? "text-mata" : "text-sangue"
                      }`}
                    >
                      {l.tipo === "ENTRADA" ? "+" : "−"} {formatarBRL(l.valorCentavos)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="cartao overflow-hidden">
            <div className="flex items-center justify-between border-b border-linha px-4 py-3">
              <h2 className="font-semibold">Funil</h2>
              <Link href="/negocios" className="text-sm font-medium text-brasa hover:underline">
                Abrir
              </Link>
            </div>
            <ul className="px-4 py-2">
              {retrato.funil.porEtapa.map((e) => (
                <li key={e.etapa} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-neblina">{NOME_ETAPA[e.etapa]}</span>
                  <span className="tabular-nums">
                    <span className="font-medium">{e.quantidade}</span>
                    <span className="ml-2 text-neblina">{formatarBRL(e.valorCentavos)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="cartao overflow-hidden">
            <div className="flex items-center justify-between border-b border-linha px-4 py-3">
              <h2 className="font-semibold">Tarefas</h2>
              <Link href="/tarefas" className="text-sm font-medium text-brasa hover:underline">
                Ver todas
              </Link>
            </div>
            {tarefas.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neblina">Nada pendente.</p>
            ) : (
              <ul>
                {tarefas.map((t) => (
                  <li key={t.id} className="border-b border-linha px-4 py-3 last:border-0">
                    <p className="text-[15px] leading-snug">{t.titulo}</p>
                    <p className="mt-0.5 text-xs text-neblina">
                      {t.prazo ? `até ${formatarData(t.prazo)}` : "sem prazo"}
                      {t.origem === "CONSULTOR" ? " · sugerida pelo consultor" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {retrato.clientes.total > 0 ? (
        <section className="mt-6 rounded-xl border border-linha bg-cartao p-5">
          <h2 className="font-semibold">Pergunte ao consultor</h2>
          <p className="mt-1 text-sm text-neblina">
            Ele lê tudo isso acima e responde com número — nunca com achismo.
          </p>
          <Link href="/consultor" className="botao mt-4">
            Abrir o consultor <ArrowRight size={16} />
          </Link>
        </section>
      ) : null}
    </>
  );
}

function Numero({
  rotulo,
  valor,
  atual,
  anterior,
  invertido = false,
  Icone,
  cor,
}: {
  rotulo: string;
  valor: string;
  atual: number;
  anterior: number;
  invertido?: boolean;
  Icone: React.ComponentType<{ size?: number; className?: string }>;
  cor: string;
}) {
  const variacao =
    anterior !== 0 ? Math.round(((atual - anterior) / Math.abs(anterior)) * 100) : null;
  const bom = variacao === null ? null : invertido ? variacao <= 0 : variacao >= 0;

  return (
    <div className="cartao p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-neblina">{rotulo}</p>
        <Icone size={16} className={cor} />
      </div>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${cor}`}>{valor}</p>
      <p className="mt-1 text-xs text-neblina">
        {variacao === null ? (
          "sem base do mês anterior"
        ) : (
          <>
            <span className={bom ? "text-mata" : "text-sangue"}>
              {variacao > 0 ? "+" : ""}
              {variacao}%
            </span>{" "}
            contra o mesmo periodo do mes passado
          </>
        )}
      </p>
    </div>
  );
}
