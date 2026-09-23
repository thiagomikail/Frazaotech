import { Cabecalho } from "@/components/Cabecalho";
import { Questionario } from "@/components/Questionario";

export default function Teste() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <Questionario />
      </main>
    </>
  );
}
