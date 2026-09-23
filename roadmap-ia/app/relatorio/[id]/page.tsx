import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Imprimir } from "@/components/Imprimir";
import { Reenviar } from "@/components/Reenviar";
import { Relatorio } from "@/components/Relatorio";
import { buscar } from "@/lib/diagnosticos";
import { ehAdmin } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const data = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);

/** Só o admin vê relatório no site. O aluno recebe o dele por e-mail. */
export default async function PaginaRelatorio({ params }: PageProps<"/relatorio/[id]">) {
  if (!(await ehAdmin())) notFound();
  const { id } = await params;
  const d = await buscar(id);
  if (!d) notFound();

  const status = d.enviado_em
    ? `Enviado para ${d.email} em ${data(d.enviado_em)}`
    : d.erro_envio ?? d.erro ?? "Ainda processando (ou travou) — use o botão.";

  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="sem-impressao mb-6 space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/admin" className="font-semibold hover:underline">← Painel</Link>
            <div className="flex flex-wrap items-center gap-3">
              <Reenviar id={d.id} jaEnviado={!!d.enviado_em} />
              <Imprimir />
            </div>
          </div>
          <p className={`border-l-4 bg-white p-3 ${d.enviado_em ? "border-oliva" : "border-coral"}`}>
            {status}{d.modelo ? ` · ${d.modelo}` : ""}
          </p>
        </div>
        <Relatorio
          analise={d.analise}
          pontuacao={d.pontuacao}
          respostas={d.respostas}
          nome={d.nome}
          agencia={d.agencia}
          criadoEm={d.criado_em}
        />
      </main>
    </>
  );
}
