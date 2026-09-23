import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { FormEmail } from "@/components/FormEmail";
import { doEmail } from "@/lib/diagnosticos";
import { emailAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const data = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);

export default async function Meus() {
  const email = await emailAtual();

  if (!email) {
    return (
      <>
        <Cabecalho />
        <main className="bg-preto text-white">
          <div className="mx-auto max-w-2xl px-4 py-16">
            <h1 className="mb-6 text-2xl font-extrabold uppercase">Seus relatórios</h1>
            <FormEmail destino="meus" rotulo="Entrar" />
          </div>
        </main>
      </>
    );
  }

  const lista = await doEmail(email);

  return (
    <>
      <Cabecalho email={email} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-extrabold uppercase">Seus relatórios</h1>
        <p className="mt-1 text-sm text-tinta/60">{email}</p>

        {lista.length === 0 ? (
          <p className="mt-8">Nenhum diagnóstico ainda.</p>
        ) : (
          <ul className="mt-8 divide-y divide-preto/10 bg-white">
            {lista.map((d) => (
              <li key={d.id}>
                <Link href={`/relatorio/${d.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-papel">
                  <div>
                    <p className="font-semibold">{d.agencia ?? "Diagnóstico"}</p>
                    <p className="text-sm text-tinta/60">{data(d.criado_em)}</p>
                  </div>
                  <span className="shrink-0 text-sm">{d.analise ? "Ver →" : "Análise pendente →"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link href="/teste" className="mt-10 inline-flex min-h-12 items-center bg-preto px-6 font-bold uppercase tracking-wide text-white">
          Fazer um novo diagnóstico
        </Link>
      </main>
    </>
  );
}
