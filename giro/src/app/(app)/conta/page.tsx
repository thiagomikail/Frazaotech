import type { Metadata } from "next";
import { Check } from "lucide-react";
import { exigirSessao } from "@/lib/sessao";
import { db } from "@/lib/db";
import { consumoDoMes } from "@/lib/uso-ia";
import { betaLiberado, formatarPreco, ORDEM_PLANOS, planoEfetivo, PLANOS } from "@/lib/planos";
import { formatarDataAno } from "@/lib/datas";
import { Cabecalho } from "@/componentes/cabecalho";
import { FormularioEmpresa } from "./formulario";

export const metadata: Metadata = { title: "Conta e plano" };

export default async function PaginaConta() {
  const { empresa, usuario } = await exigirSessao();

  const [consumo, contagens] = await Promise.all([
    consumoDoMes(empresa.id, empresa.plano),
    Promise.all([
      db.cliente.count({ where: { empresaId: empresa.id, arquivado: false } }),
      db.negocio.count({ where: { empresaId: empresa.id } }),
      db.lancamento.count({ where: { empresaId: empresa.id } }),
    ]),
  ]);

  const [clientes, negocios, lancamentos] = contagens;
  const efetivo = planoEfetivo(empresa.plano);
  const emBeta = betaLiberado() && empresa.plano === "FREE";

  return (
    <>
      <Cabecalho titulo="Conta e plano" descricao={`${usuario.email} · ${usuario.papel === "DONO" ? "dono" : "equipe"}`} />

      <div className="space-y-6">
        <section className="cartao p-5">
          <h2 className="mb-4 font-semibold">Sua empresa</h2>
          <FormularioEmpresa nome={empresa.nome} segmento={empresa.segmento} />
          <p className="mt-4 text-xs text-neblina">
            No Giro desde {formatarDataAno(empresa.criadaEm)} · {clientes} clientes ·{" "}
            {negocios} negócios · {lancamentos} lançamentos
          </p>
        </section>

        <section className="cartao p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Consumo do consultor neste mês</h2>
            {emBeta ? (
              <span className="etiqueta bg-brasa-clara text-brasa">
                plano {PLANOS[efetivo].nome} liberado no beta
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Medidor
              rotulo="Perguntas"
              usado={consumo.perguntasUsadas}
              limite={consumo.perguntasLimite}
            />
            <Medidor
              rotulo="Diagnósticos"
              usado={consumo.diagnosticosUsados}
              limite={consumo.diagnosticosLimite}
            />
          </div>

          <p className="mt-4 text-xs text-neblina">
            {consumo.chamadas} chamadas ao modelo ·{" "}
            {(consumo.tokensEntrada + consumo.tokensSaida).toLocaleString("pt-BR")} tokens.
            Medimos desde o primeiro dia para que o preco, quando existir, saia do consumo real —
            e não de um chute.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold">Planos</h2>
          <p className="mb-4 text-sm text-neblina">
            {emBeta
              ? "Durante o beta o plano Consultor está liberado sem cobrança. Você será avisado antes de qualquer mudança."
              : "Registrar é sempre grátis. O que se paga é o consultor."}
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {ORDEM_PLANOS.map((id) => {
              const plano = PLANOS[id];
              const atual = id === efetivo;
              return (
                <div
                  key={id}
                  className={`cartao flex flex-col p-5 ${
                    atual ? "border-brasa ring-1 ring-brasa/20" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold">{plano.nome}</h3>
                    {atual ? (
                      <span className="etiqueta bg-brasa-clara text-brasa">seu plano</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-2xl font-bold tracking-tight">
                    {formatarPreco(plano.precoMensalCentavos)}
                    {plano.precoMensalCentavos > 0 ? (
                      <span className="text-sm font-normal text-neblina">/mês</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-neblina">{plano.chamada}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {plano.inclui.map((item) => (
                      <li key={item} className="flex gap-2 text-sm">
                        <Check size={15} className="mt-0.5 shrink-0 text-mata" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

function Medidor({ rotulo, usado, limite }: { rotulo: string; usado: number; limite: number }) {
  const proporcao = limite > 0 ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-neblina">{rotulo}</span>
        <span className="tabular-nums">
          {usado} <span className="text-neblina">de {limite}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-papel">
        <div
          className={`h-full rounded-full ${proporcao >= 90 ? "bg-sangue" : "bg-brasa"}`}
          style={{ width: `${proporcao}%` }}
        />
      </div>
    </div>
  );
}
