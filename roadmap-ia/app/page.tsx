import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { FormEmail } from "@/components/FormEmail";
import { emailAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const ENTREGA = [
  ["Uma frente, não sete", "O relatório aponta UM lugar onde a IA dá mais retorno no seu negócio — com a evidência tirada das suas respostas."],
  ["O que não fazer", "A lista do que parece boa ideia e não é, agora. É a parte que mais economiza dinheiro."],
  ["Roadmap de 90 dias", "Pré-requisitos, piloto e a decisão de escalar ou matar — cada passo com critério de sucesso e de parada."],
];

export default async function Inicio() {
  const email = await emailAtual();

  return (
    <>
      <Cabecalho email={email} />
      <main>
        <section className="bg-preto text-white">
          <div className="mx-auto max-w-4xl px-4 pb-16 pt-12 sm:pb-24 sm:pt-20">
            <p className="logo mb-6 text-xs text-ouro">Diagnóstico · alunos Go Agentes</p>
            <h1 className="max-w-3xl text-3xl font-extrabold uppercase leading-[1.1] sm:text-5xl">
              Onde a IA dá dinheiro na sua agência — e onde ela só dá trabalho
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
              22 perguntas, uns 12 minutos. No fim, uma análise <strong className="text-white">crítica</strong> do seu
              negócio e um roadmap de adoção de IA que cabe no seu tempo e no seu bolso. Sem enrolação.
            </p>
            <div className="mt-10">
              {email ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/teste" className="flex min-h-12 items-center justify-center bg-ouro px-6 font-bold uppercase tracking-wide text-preto hover:brightness-110">
                    Fazer o diagnóstico
                  </Link>
                  <Link href="/meus" className="flex min-h-12 items-center justify-center border border-white/40 px-6 font-semibold hover:border-white">
                    Ver meus relatórios
                  </Link>
                </div>
              ) : (
                <>
                  <FormEmail />
                  <p className="mt-3 text-sm text-white/60">Sem senha. O e-mail é a chave pra voltar e ver seus relatórios.</p>
                </>
              )}
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
            <strong>Sobre as suas respostas:</strong> ficam salvas e visíveis pra você e pra equipe que conduz o
            programa, que usa o conjunto pra entender a turma. Não pedimos número de faturamento, só faixa. Qualquer
            pessoa que digite o seu e-mail acessa seus relatórios — não coloque aqui nada que não diria numa aula.
            {!email && (
              <div className="mt-4">
                Já fez o teste? <span className="font-semibold">Digite o e-mail acima</span> e vá em &ldquo;Meus relatórios&rdquo;.
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
