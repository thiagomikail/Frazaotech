import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";

const ENTREGA = [
  ["Uma frente, não sete", "O relatório aponta UM lugar onde a IA dá mais retorno no seu negócio — com a evidência tirada das suas respostas."],
  ["O que não fazer", "A lista do que parece boa ideia e não é, agora. É a parte que mais economiza dinheiro."],
  ["Roadmap de 90 dias", "Pré-requisitos, piloto e a decisão de escalar ou matar — cada passo com critério de sucesso e de parada."],
];

export default function Inicio() {
  return (
    <>
      <Cabecalho />
      <main>
        <section className="bg-preto text-white">
          <div className="mx-auto max-w-4xl px-4 pb-16 pt-12 sm:pb-24 sm:pt-20">
            <p className="logo mb-6 text-xs text-ouro">Diagnóstico · alunos Go Agentes</p>
            <h1 className="max-w-3xl text-3xl font-extrabold uppercase leading-[1.1] sm:text-5xl">
              Onde a IA dá dinheiro na sua agência — e onde ela só dá trabalho
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
              22 perguntas, uns 12 minutos. No fim, uma análise <strong className="text-white">crítica</strong> do seu
              negócio e um roadmap de adoção de IA que cabe no seu tempo e no seu bolso — direto no seu e-mail. Sem enrolação.
            </p>
            <div className="mt-10">
              <Link href="/teste" className="inline-flex min-h-12 items-center justify-center bg-ouro px-8 font-bold uppercase tracking-wide text-preto hover:brightness-110">
                Começar o diagnóstico
              </Link>
              <p className="mt-3 text-sm text-white/60">Sem cadastro. O relatório chega no seu e-mail.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="mb-8 text-2xl font-bold">O que você recebe</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {ENTREGA.map(([t, d]) => (
              <div key={t} className="border-t-4 border-ouro bg-white p-6">
                <h3 className="mb-2 font-bold">{t}</h3>
                <p className="leading-relaxed">{d}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 max-w-2xl space-y-4 leading-relaxed">
            <h2 className="text-2xl font-bold">Por que &ldquo;crítica&rdquo;</h2>
            <p>
              Quase todo conteúdo sobre IA diz que ela serve pra tudo. Não serve. Hora economizada fora do seu gargalo
              não vira dinheiro, e <span className="sublinhado">mais lead pra quem já não dá conta piora o negócio</span>.
            </p>
            <p>
              A análise começa pelo gargalo real da sua agência — que nem sempre é o que você acha — e só depois olha
              pra ferramenta. Se o seu maior problema não for de IA, o relatório vai dizer isso primeiro.
            </p>
          </div>

          <div className="mt-14 border-l-4 border-preto bg-white p-5 text-sm leading-relaxed">
            <strong>Sobre as suas respostas:</strong> o relatório vai só para o e-mail que você informar. As respostas
            ficam salvas e são vistas também pela equipe que conduz o programa, que usa o conjunto pra entender a turma.
            Não pedimos número de faturamento, só faixa.
          </div>
        </section>
      </main>
    </>
  );
}
