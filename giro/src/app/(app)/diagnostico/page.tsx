import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { exigirSessao } from "@/lib/sessao";
import { db } from "@/lib/db";
import { montarRetrato } from "@/lib/sinais";
import { consumoDoMes } from "@/lib/uso-ia";
import { iaConfigurada } from "@/lib/openrouter";
import { formatarDataAno } from "@/lib/datas";
import { Cabecalho } from "@/componentes/cabecalho";
import { CartaoSinal } from "@/componentes/sinal";
import { BotaoDiagnostico } from "./botao";

export const metadata: Metadata = { title: "Diagnóstico" };

type Achado = { titulo: string; gravidade: string; evidencia: string };
type Passo = { titulo: string; porque: string; esforco: string };

const CORES: Record<string, string> = {
  alta: "bg-sangue-clara text-sangue",
  media: "bg-mel-clara text-mel",
  baixa: "bg-papel text-neblina",
};

// Mesmo vocabulario da coluna de sinais: as duas metades da tela falam igual.
const NOME_GRAVIDADE: Record<string, string> = {
  alta: "urgente",
  media: "atenção",
  baixa: "ajuste",
};

export default async function PaginaDiagnostico() {
  const { empresa } = await exigirSessao();

  const [ultimo, anteriores, retrato, consumo] = await Promise.all([
    db.diagnostico.findFirst({ where: { empresaId: empresa.id }, orderBy: { geradoEm: "desc" } }),
    db.diagnostico.findMany({
      where: { empresaId: empresa.id },
      orderBy: { geradoEm: "desc" },
      skip: 1,
      take: 6,
      select: { id: true, geradoEm: true, resumo: true },
    }),
    montarRetrato(empresa.id),
    consumoDoMes(empresa.id, empresa.plano),
  ]);

  const achados = (ultimo?.achados ?? []) as Achado[];
  const passos = (ultimo?.proximosPassos ?? []) as Passo[];
  const restantes = Math.max(0, consumo.diagnosticosLimite - consumo.diagnosticosUsados);

  return (
    <>
      <Cabecalho
        titulo="Diagnóstico"
        descricao={`${restantes} de ${consumo.diagnosticosLimite} disponíveis neste mês`}
      >
        {iaConfigurada() ? (
          <BotaoDiagnostico rotulo={ultimo ? "Rodar de novo" : "Rodar diagnóstico"} />
        ) : null}
      </Cabecalho>

      {!iaConfigurada() ? (
        <div className="mb-6 rounded-xl border border-mel/30 bg-mel-clara p-4 text-sm">
          <p className="font-medium text-mel">O diagnóstico precisa de uma chave da OpenRouter.</p>
          <p className="mt-1 text-tinta/75">
            Defina <code className="font-mono text-[13px]">OPENROUTER_API_KEY</code> no ambiente.
            Os sinais abaixo continuam funcionando: eles são calculados pelo próprio Giro, sem IA.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {ultimo ? (
            <>
              <section className="cartao p-5">
                <p className="mb-2 flex items-center gap-1.5 text-xs text-neblina">
                  <Clock size={12} /> {formatarDataAno(ultimo.geradoEm)} · {ultimo.modelo}
                </p>
                <p className="text-[17px] leading-relaxed">{ultimo.resumo}</p>
              </section>

              {passos.length > 0 ? (
                <section className="cartao overflow-hidden">
                  <h2 className="border-b border-linha px-4 py-3 font-semibold">
                    Próximos passos desta semana
                  </h2>
                  <ol className="divide-y divide-linha">
                    {passos.map((p, i) => (
                      <li key={i} className="flex gap-3 px-4 py-3.5">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brasa text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-[15px] font-medium leading-snug">{p.titulo}</p>
                          <p className="mt-0.5 text-sm text-neblina">{p.porque}</p>
                          <span className="etiqueta mt-1.5 bg-papel text-neblina">
                            {p.esforco}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {achados.length > 0 ? (
                <section className="cartao overflow-hidden">
                  <h2 className="border-b border-linha px-4 py-3 font-semibold">
                    O que o consultor achou
                  </h2>
                  <ul className="divide-y divide-linha">
                    {achados.map((a, i) => (
                      <li key={i} className="flex gap-3 px-4 py-3.5">
                        <span
                          className={`etiqueta h-fit shrink-0 ${CORES[a.gravidade] ?? CORES.baixa}`}
                        >
                          {NOME_GRAVIDADE[a.gravidade] ?? a.gravidade}
                        </span>
                        <div>
                          <p className="text-[15px] font-medium leading-snug">{a.titulo}</p>
                          <p className="mt-0.5 text-sm text-neblina">{a.evidencia}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : (
            <section className="cartao p-6">
              <p className="font-medium">Você ainda não rodou um diagnóstico.</p>
              <p className="mt-1 text-sm text-neblina">
                Ele lê tudo que você registrou — caixa, funil, clientes, tarefas e até a
                qualidade do próprio registro — e devolve um resumo, os achados e três ações
                para os próximos sete dias.
              </p>
              {iaConfigurada() ? (
                <div className="mt-4">
                  <BotaoDiagnostico />
                </div>
              ) : null}
            </section>
          )}

          {anteriores.length > 0 ? (
            <section className="cartao overflow-hidden">
              <h2 className="border-b border-linha px-4 py-3 font-semibold">Diagnósticos anteriores</h2>
              <ul className="divide-y divide-linha">
                {anteriores.map((d) => (
                  <li key={d.id} className="px-4 py-3">
                    <p className="text-xs text-neblina">{formatarDataAno(d.geradoEm)}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm">{d.resumo}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside>
          <section className="cartao overflow-hidden">
            <div className="border-b border-linha px-4 py-3">
              <h2 className="font-semibold">Sinais apurados agora</h2>
              <p className="mt-0.5 text-xs text-neblina">
                Calculados pelo Giro, sem IA. São a matéria-prima do diagnóstico — e a razão de
                nenhum número acima ser chutado.
              </p>
            </div>
            {retrato.sinais.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neblina">
                Nenhum sinal no momento.
              </p>
            ) : (
              <ul>
                {retrato.sinais.map((s) => (
                  <CartaoSinal key={s.chave} sinal={s} />
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
