import { Suspense } from "react";
import { Formulario } from "./formulario";

export default function PaginaEntrar() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">CRM Hotmart</h1>
        <p className="mt-1 mb-6 text-sm text-tinta-fraca">
          Painel com dado pessoal de comprador. Entrada restrita.
        </p>
        <Suspense>
          <Formulario />
        </Suspense>
      </div>
    </main>
  );
}
