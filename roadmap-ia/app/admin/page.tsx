import Link from "next/link";
import { deslogarAdmin } from "@/app/acoes";
import { FormAdmin } from "@/components/FormAdmin";
import { todos } from "@/lib/diagnosticos";
import { AREAS } from "@/lib/perguntas";
import { NOMES_RESTRICAO, type Restricao } from "@/lib/pontuacao";
import { ehAdmin } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const data = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);

/**
 * O painel do organizador. Todas as respostas, de todos os alunos, e o
 * retrato da turma: qual gargalo domina e qual frente sai no topo.
 */
export default async function Admin() {
  if (!(await ehAdmin())) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-6 text-2xl font-extrabold uppercase">Painel</h1>
        <FormAdmin />
      </main>
    );
  }

  const lista = await todos();
  const contar = <K extends string>(chaves: K[]) =>
    Object.entries(chaves.reduce<Record<string, number>>((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

  const gargalos = contar(lista.map((d) => d.pontuacao.restricao));
  const topos = contar(lista.map((d) => d.pontuacao.frentes[0]?.area).filter(Boolean));
  const pendentes = lista.filter((d) => !d.analise).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold uppercase">Painel · {lista.length} diagnósticos</h1>
        <div className="flex items-center gap-4 text-sm">
          <a href="/admin/csv" className="bg-preto px-4 py-2 font-semibold text-white">Baixar CSV</a>
          <form action={deslogarAdmin}><button className="text-tinta/60 hover:text-tinta">Sair</button></form>
        </div>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Bloco titulo="Gargalo da turma">
          {gargalos.map(([k, n]) => <Linha key={k} rotulo={NOMES_RESTRICAO[k as Restricao]} n={n} />)}
        </Bloco>
        <Bloco titulo="Frente nº 1 (conta determinística)">
          {topos.map(([k, n]) => <Linha key={k} rotulo={AREAS[k as keyof typeof AREAS].nome} n={n} />)}
        </Bloco>
        <Bloco titulo="Análise pendente">
          <p className="text-3xl font-extrabold">{pendentes}</p>
          <p className="text-sm text-tinta/60">IA falhou ou bateu teto — o aluno vê o botão de tentar de novo.</p>
        </Bloco>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] bg-white text-left text-sm">
          <thead className="bg-preto text-white">
            <tr>
              <th className="p-3">Quando</th><th className="p-3">Agência</th><th className="p-3">E-mail</th>
              <th className="p-3">Gargalo</th><th className="p-3">Onde a IA vale mais</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((d) => (
              <tr key={d.id} className="border-t border-preto/10 align-top">
                <td className="whitespace-nowrap p-3">{data(d.criado_em)}</td>
                <td className="p-3"><strong>{d.agencia ?? "—"}</strong><br /><span className="text-tinta/60">{d.nome}</span></td>
                <td className="p-3">{d.email}</td>
                <td className="p-3">{d.pontuacao.restricao}</td>
                <td className="p-3">{d.analise?.ondeMaisValor.area ?? <span className="text-coral">pendente</span>}</td>
                <td className="p-3"><Link href={`/relatorio/${d.id}`} className="font-semibold underline">abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-tinta/60">{titulo}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Linha({ rotulo, n }: { rotulo: string; n: number }) {
  return <div className="flex justify-between gap-2 text-sm"><span>{rotulo}</span><strong>{n}</strong></div>;
}
