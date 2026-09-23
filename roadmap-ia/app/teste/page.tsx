import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Questionario } from "@/components/Questionario";
import { emailAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function Teste() {
  const email = await emailAtual();
  if (!email) redirect("/");

  return (
    <>
      <Cabecalho email={email} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <Questionario email={email} />
      </main>
    </>
  );
}
