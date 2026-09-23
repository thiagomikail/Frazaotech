import type { Analise } from "@/lib/analise-tipo";
import { AREAS, BLOCOS, rotuloDe, type Respostas } from "@/lib/perguntas";
import { NOMES_RESTRICAO, type Pontuacao } from "@/lib/pontuacao";

/**
 * O relatório segue a pirâmide: a resposta primeiro (onde a IA vale mais),
 * depois o porquê, o que não fazer, o roadmap — e só no fim os números e as
 * respostas. Quem lê só o topo já sai com a decisão.
 */

const dataLonga = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(d);

export function Relatorio({
  analise, pontuacao, respostas, nome, agencia, criadoEm,
}: {
  analise: Analise | null;
  pontuacao: Pontuacao;
  respostas: Respostas;
  nome: string | null;
  agencia: string | null;
  criadoEm: Date;
}) {
  const max = Math.max(...pontuacao.frentes.map((f) => f.valor), 0.01);
  const top = pontuacao.frentes[0];

  return (
    <article className="space-y-14">
      <header className="bg-preto px-5 py-8 text-white sm:px-8 sm:py-10">
        <p className="logo mb-4 text-xs text-ouro">Roadmap de IA · {dataLonga(criadoEm)}</p>
        <h1 className="text-2xl font-extrabold uppercase leading-tight sm:text-4xl">{agencia ?? "Sua agência"}</h1>
        {nome && <p className="mt-1 text-white/70">{nome}</p>}
        {analise ? (
          <p className="mt-6 text-lg leading-relaxed sm:text-xl">{analise.veredito}</p>
        ) : (
          <p className="mt-6 text-lg leading-relaxed">
            Pela conta das suas respostas, a frente com mais retorno é{" "}
            <strong className="text-ouro">{AREAS[top.area].nome.toLowerCase()}</strong>. A análise escrita ainda não
            ficou pronta.
          </p>
        )}
      </header>

      {analise && (
        <>
          <Secao titulo="Onde a IA adiciona mais valor">
            <div className="border-l-4 border-ouro bg-white p-5 sm:p-6">
              <h3 className="text-xl font-bold">{analise.ondeMaisValor.area}</h3>
              <p className="mt-3 leading-relaxed">{analise.ondeMaisValor.porque}</p>
              <p className="mt-5 text-xs font-bold uppercase tracking-wider text-tinta/60">O que nas suas respostas sustenta isso</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {analise.ondeMaisValor.evidencias.map((e) => <li key={e}>{e}</li>)}
              </ul>
              <p className="mt-5"><strong>Ganho esperado:</strong> {analise.ondeMaisValor.ganhoEsperado}</p>
            </div>
          </Secao>

          <Secao titulo="O que NÃO fazer agora">
            <div className="grid gap-4 sm:grid-cols-2">
              {analise.naoFazerAgora.map((n) => (
                <div key={n.tema} className="border-t-4 border-coral bg-white p-5">
                  <h3 className="font-bold">{n.tema}</h3>
                  <p className="mt-2 leading-relaxed">{n.porque}</p>
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="Verdades incômodas">
            <ul className="space-y-3">
              {analise.verdadesIncomodas.map((v) => (
                <li key={v} className="border-l-4 border-preto bg-white p-4 leading-relaxed">{v}</li>
              ))}
            </ul>
          </Secao>

          <Secao titulo="Roadmap de 90 dias">
            <ol className="space-y-8">
              {analise.roadmap.map((f) => (
                <li key={f.nome}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-preto pb-2">
                    <h3 className="text-lg font-bold">{f.nome}</h3>
                    <span className="text-sm font-semibold text-tinta/60">{f.prazo}</span>
                  </div>
                  <p className="mb-4 italic">{f.objetivo}</p>
                  <div className="space-y-4">
                    {f.acoes.map((a) => (
                      <div key={a.acao} className="bg-white p-5">
                        <h4 className="font-bold">{a.acao}</h4>
                        <p className="mt-2 leading-relaxed">{a.como}</p>
                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <Item rotulo="Ferramenta" valor={a.ferramenta} />
                          <Item rotulo="Esforço" valor={a.horasSemana} />
                          <Item rotulo="Deu certo se" valor={a.sucesso} cor="text-oliva" />
                          <Item rotulo="Pare se" valor={a.parar} cor="text-coral" />
                        </dl>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </Secao>

          <Secao titulo="Comece a medir hoje">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] bg-white text-left text-sm">
                <thead className="bg-preto text-white">
                  <tr><th className="p-3">Métrica</th><th className="p-3">Como medir</th><th className="p-3">Hoje</th></tr>
                </thead>
                <tbody>
                  {analise.metricas.map((m) => (
                    <tr key={m.nome} className="border-t border-preto/10 align-top">
                      <td className="p-3 font-semibold">{m.nome}</td><td className="p-3">{m.comoMedir}</td><td className="p-3">{m.hoje}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>

          <Secao titulo="Riscos deste plano">
            <ul className="space-y-3">
              {analise.riscos.map((r) => (
                <li key={r.risco} className="bg-white p-4">
                  <strong>{r.risco}</strong>
                  <p className="mt-1 text-sm leading-relaxed">→ {r.mitigacao}</p>
                </li>
              ))}
            </ul>
          </Secao>

          <div className="bg-preto p-6 text-white sm:p-8">
            <p className="logo mb-3 text-xs text-ouro">Pra levar pra casa</p>
            <p className="text-xl font-bold leading-snug">{analise.pergunta}</p>
          </div>
        </>
      )}

      <Secao titulo="Os números por trás">
        <div className="mb-6 grid gap-3 text-sm sm:grid-cols-3">
          <Numero rotulo="Gargalo que as respostas mostram" valor={NOMES_RESTRICAO[pontuacao.restricao]} />
          <Numero rotulo="Horas/semana nas 7 frentes" valor={`${pontuacao.horasTotais.toFixed(0)}h (teto liberável ~${pontuacao.horasLiberaveisTotais.toFixed(0)}h)`} />
          <Numero rotulo="Prontidão" valor={`${pontuacao.prontidao.rotulo}`} />
        </div>
        <p className="mb-4 text-sm text-tinta/70">
          Valor = horas que a IA consegue devolver em cada frente × o peso do seu gargalo. Horas liberáveis são teto
          otimista, não promessa.
        </p>
        <div className="space-y-3 bg-white p-5">
          {pontuacao.frentes.map((f, i) => (
            <div key={f.area}>
              <div className="flex justify-between gap-2 text-sm">
                <span className={i === 0 ? "font-bold" : ""}>{AREAS[f.area].nome}</span>
                <span className="shrink-0 text-tinta/60">{f.horas}h → ~{f.horasLiberaveis.toFixed(1)}h</span>
              </div>
              <div className="mt-1 h-2 bg-preto/5">
                <div className={i === 0 ? "h-full bg-ouro" : "h-full bg-tinta/40"} style={{ width: `${(f.valor / max) * 100}%` }} />
              </div>
              {f.bloqueios.map((b) => <p key={b} className="mt-1 text-xs text-coral">{b}</p>)}
            </div>
          ))}
        </div>
        {pontuacao.alertas.length > 0 && (
          <ul className="mt-6 space-y-2">
            {pontuacao.alertas.map((a) => (
              <li key={a.texto} className={`border-l-4 bg-white p-4 text-sm leading-relaxed ${a.nivel === "critico" ? "border-coral" : "border-ouro"}`}>
                {a.texto}
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Suas respostas">
        <div className="space-y-6">
          {BLOCOS.map((b) => (
            <div key={b.id}>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-tinta/60">{b.titulo}</h3>
              <dl className="divide-y divide-preto/10 bg-white text-sm">
                {b.perguntas.map((p) => (
                  <div key={p.id} className="grid gap-1 p-3 sm:grid-cols-2 sm:gap-4">
                    <dt className="text-tinta/70">{p.titulo}</dt>
                    <dd className="whitespace-pre-wrap font-semibold">{rotuloDe(p, respostas[p.id])}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Secao>
    </article>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 text-2xl font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

function Item({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div>
      <dt className={`text-xs font-bold uppercase tracking-wider ${cor ?? "text-tinta/60"}`}>{rotulo}</dt>
      <dd className="mt-1 leading-relaxed">{valor}</dd>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-tinta/60">{rotulo}</p>
      <p className="mt-1 font-semibold">{valor}</p>
    </div>
  );
}
