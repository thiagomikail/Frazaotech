import Link from "next/link";
import type { Metadata } from "next";
import { Marca } from "@/componentes/marca";
import { FormularioCadastro } from "./formulario";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCriarConta() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center">
          <Marca tamanho="lg" />
        </Link>

        <div className="cartao p-6">
          <h1 className="mb-1 text-xl font-semibold">Criar conta</h1>
          <p className="mb-6 text-sm text-neblina">
            Leva um minuto. Não pedimos cartão — durante o beta o plano Consultor está liberado.
          </p>
          <FormularioCadastro />
        </div>

        <p className="mt-6 text-center text-sm text-neblina">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-brasa hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
