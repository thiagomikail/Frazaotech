import Link from "next/link";
import type { Metadata } from "next";
import { Marca } from "@/componentes/marca";
import { FormularioEntrar } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const { de } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center">
          <Marca tamanho="lg" />
        </Link>

        <div className="cartao p-6">
          <h1 className="mb-1 text-xl font-semibold">Entrar</h1>
          <p className="mb-6 text-sm text-neblina">Bom te ver de novo.</p>
          <FormularioEntrar de={de} />
        </div>

        <p className="mt-6 text-center text-sm text-neblina">
          Ainda não tem conta?{" "}
          <Link href="/criar-conta" className="font-medium text-brasa hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </main>
  );
}
