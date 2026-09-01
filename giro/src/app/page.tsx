import Link from "next/link";
import {
  ArrowRight,
  Check,
  MessageCircleQuestion,
  NotebookPen,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Marca } from "@/componentes/marca";
import { betaLiberado, formatarPreco, ORDEM_PLANOS, PLANOS } from "@/lib/planos";

export default function Inicio() {
  const beta = betaLiberado();

  return (
    <>
      <header className="border-b border-linha">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Marca />
          <div className="flex items-center gap-2">
            <Link href="/entrar" className="botao-fantasma">
              Entrar
            </Link>
            <Link href="/criar-conta" className="botao">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------------------------------------------------------- hero */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          {beta ? (
            <span className="etiqueta mb-5 bg-brasa-clara text-brasa">
              Beta aberto · plano Consultor liberado sem cobrança
            </span>
          ) : null}

          <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Todo sistema de gestão te entrega{" "}
            <span className="text-neblina">relatório</span>.
            <br />O Giro te diz{" "}
            <span className="text-brasa">o que fazer na segunda-feira</span>.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neblina">
            Clientes, orçamentos e caixa num lugar só — é um consultor de IA que lê esses números
            toda semana, aponta o que está sangrando e escreve as três coisas que você deveria
            fazer nos próximos sete dias.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/criar-conta" className="botao px-6 text-base">
              Criar conta grátis <ArrowRight size={17} />
            </Link>
            <span className="text-sm text-neblina">Sem cartão. Leva um minuto.</span>
          </div>
        </section>

        {/* -------------------------------------------------------- o ciclo */}
        <section className="border-y border-linha bg-cartao">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight">São três movimentos, e só.</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <Passo
                numero="1"
                Icone={NotebookPen}
                titulo="Você registra"
                texto="Quem são seus clientes, quais orçamentos estão na rua, o que entrou e o que saiu. Sem nota fiscal, sem plano de contas, sem treinamento."
              />
              <Passo
                numero="2"
                Icone={Sparkles}
                titulo="Ele lê"
                texto="O Giro apura os números e o consultor interpreta: cliente que sumiu, proposta parada, ticket caindo, dinheiro escapando por uma categoria que você não olhava."
              />
              <Passo
                numero="3"
                Icone={MessageCircleQuestion}
                titulo="Você age"
                texto="Três ações para a semana, em ordem, com o motivo do lado. Aceitou? Vira tarefa na sua lista. E você pode perguntar o que quiser, a qualquer hora."
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- confianca */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
            <div>
              <ShieldCheck size={28} className="text-mata" />
              <h2 className="mt-4 text-2xl font-bold tracking-tight">
                O consultor não chuta número. Por construção.
              </h2>
              <p className="mt-4 leading-relaxed text-neblina">
                Essa é a objeção certa a se ter com IA em cima de dinheiro, e a resposta está na
                arquitetura, não numa promessa: <strong className="text-tinta">o Giro calcula,
                a IA interpreta</strong>. Faturamento, margem, ticket, dias sem comprar — tudo sai
                de consulta ao seu banco de dados, apurada em código. O modelo recebe esses
                números prontos e só pode citar o que recebeu.
              </p>
              <p className="mt-4 leading-relaxed text-neblina">
                Ele também é o único que vai te dizer quando o próprio número não merece confiança:
                se você passou duas semanas sem lançar nada, ele avisa antes de opinar.
              </p>
            </div>

            <div className="cartao overflow-hidden">
              <p className="border-b border-linha px-4 py-2.5 text-xs text-neblina">
                exemplo de resposta
              </p>
              <div className="space-y-3 p-4 text-[15px] leading-relaxed">
                <p className="text-neblina">
                  <span className="font-medium text-tinta">Você:</span> por que sobrou menos esse mês?
                </p>
                <p>
                  Sobrou menos porque a saída subiu, não porque a venda caiu. Entradas de{" "}
                  <strong>R$ 41.280,00</strong> contra <strong>R$ 39.910,00</strong> no mês
                  passado — mas &quot;Fornecedor&quot; passou de <strong>R$ 12.400,00</strong> para{" "}
                  <strong>R$ 19.750,00</strong>, quase toda a diferenca.
                </p>
                <p>
                  São três compras grandes na mesma semana, dias 8, 9 e 12. Vale conferir se houve
                  reposição dobrada.
                </p>
                <p className="font-medium">
                  Esta semana: abra as três notas de fornecedor de 8 a 12 de agosto e confirme se
                  não há pedido duplicado. 30 minutos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- precos */}
        <section id="precos" className="border-t border-linha bg-cartao">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight">Preços</h2>
            <p className="mt-2 max-w-xl text-neblina">
              Registrar é de graça para sempre — seu dado é seu. O que se paga é o consultor.
              {beta ? " Durante o beta, ele está liberado sem cobrança." : ""}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {ORDEM_PLANOS.map((id) => {
                const plano = PLANOS[id];
                return (
                  <div
                    key={id}
                    className={`cartao flex flex-col p-6 ${
                      plano.destaque ? "border-brasa ring-1 ring-brasa/20" : ""
                    }`}
                  >
                    {plano.destaque ? (
                      <span className="etiqueta mb-3 w-fit bg-brasa-clara text-brasa">
                        o mais escolhido
                      </span>
                    ) : null}
                    <h3 className="font-semibold">{plano.nome}</h3>
                    <p className="mt-2 text-3xl font-bold tracking-tight">
                      {formatarPreco(plano.precoMensalCentavos)}
                      {plano.precoMensalCentavos > 0 ? (
                        <span className="text-sm font-normal text-neblina">/mês</span>
                      ) : null}
                    </p>
                    <p className="mt-2 text-sm text-neblina">{plano.chamada}</p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {plano.inclui.map((item) => (
                        <li key={item} className="flex gap-2 text-sm">
                          <Check size={15} className="mt-0.5 shrink-0 text-mata" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/criar-conta"
                      className={`${plano.destaque ? "botao" : "botao-fantasma"} mt-6`}
                    >
                      Começar
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ faq */}
        <section className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">Perguntas que sempre aparecem</h2>
          <div className="mt-6 divide-y divide-linha">
            <Pergunta
              titulo="Preciso trocar meu sistema atual?"
              resposta="Não. O Giro não emite nota fiscal e não quer ser seu ERP. Ele cuida de cliente, funil e caixa — e da leitura desses números. Muita gente usa junto com o que já tem."
            />
            <Pergunta
              titulo="Serve para o meu ramo?"
              resposta="Os quatro registros do Giro — cliente, negócio, entrada e saída — existem em padaria, salão, oficina, consultoria e agência. Você diz seu ramo no cadastro e o consultor calibra o conselho por ele."
            />
            <Pergunta
              titulo="E se eu registrar pouca coisa?"
              resposta="Ele diz isso na sua cara, em vez de inventar análise em cima de dado furado. Falta de registro aparece no diagnóstico como o primeiro problema a resolver."
            />
            <Pergunta
              titulo="Meus dados viram treinamento de IA?"
              resposta="Não. Seus dados ficam no seu banco. O que vai ao modelo é o recorte necessário para responder à pergunta que você fez, e nada é usado para treinar modelo nenhum."
            />
            <Pergunta
              titulo="Vai continuar de graca?"
              resposta="O plano Caderno sim, sempre. Durante o beta o Consultor também está liberado, e você será avisado com antecedência antes de qualquer cobrança começar."
            />
          </div>
        </section>

        <section className="border-t border-linha bg-tinta">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Dez minutos de digitação. Um diagnóstico na segunda.
            </h2>
            <Link href="/criar-conta" className="botao mt-6 px-6 text-base">
              Criar conta grátis <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-linha py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-neblina">
          <Marca tamanho="sm" />
          <p>Feito para quem toca o negócio sozinho.</p>
        </div>
      </footer>
    </>
  );
}

function Passo({
  numero,
  Icone,
  titulo,
  texto,
}: {
  numero: string;
  Icone: React.ComponentType<{ size?: number; className?: string }>;
  titulo: string;
  texto: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-brasa text-sm font-bold text-white">
          {numero}
        </span>
        <Icone size={18} className="text-brasa" />
      </div>
      <h3 className="mt-3 text-lg font-semibold">{titulo}</h3>
      <p className="mt-1.5 leading-relaxed text-neblina">{texto}</p>
    </div>
  );
}

function Pergunta({ titulo, resposta }: { titulo: string; resposta: string }) {
  return (
    <details className="group py-4">
      <summary className="cursor-pointer list-none font-medium marker:content-none">
        <span className="flex items-center justify-between gap-4">
          {titulo}
          <span className="text-neblina transition group-open:rotate-45">+</span>
        </span>
      </summary>
      <p className="mt-2 leading-relaxed text-neblina">{resposta}</p>
    </details>
  );
}
