import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Imprimir } from "@/components/Imprimir";
import { Relatorio } from "@/components/Relatorio";
import { TentarDeNovo } from "@/components/TentarDeNovo";
import { buscar } from "@/lib/diagnosticos";
import { ehAdmin, emailAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function PaginaRelatorio({ params }: PageProps<"/relatorio/[id]">) {
  const { id } = await params;
  const [d, email, admin] = await Promise.all([buscar(id), emailAtual(), ehAdmin()]);

  // 404 e não 403: não confirmar que o relatório existe pra quem não é dono.
  if (!d || (d.email !== email && !admin)) notFound();

  return (
    <>
      <Cabecalho email={email} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="sem-impressao mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href={admin && d.email !== email ? "/admin" : "/meus"} className="font-semibold hover:underline">← {admin && d.email !== email ? "Painel" : "Meus relatórios"}</Link>
          <div className="flex items-center gap-4">
            {admin && <span className="text-tinta/60">{d.email}{d.modelo ? ` · ${d.modelo}` : ""}</span>}
            <Imprimir />
          </div>
        </div>
        <Relatorio
          analise={d.analise}
          pontuacao={d.pontuacao}
          respostas={d.respostas}
          nome={d.nome}
          agencia={d.agencia}
          criadoEm={d.criado_em}
          rodapeAnalise={d.analise ? null : <TentarDeNovo id={d.id} erro={d.erro} />}
        />
      </main>
    </>
  );
}
