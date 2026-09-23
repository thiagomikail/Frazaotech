"use client";

export function Imprimir() {
  return (
    <button onClick={() => window.print()} className="border border-preto/30 px-4 py-2 font-semibold hover:border-preto">
      Salvar em PDF
    </button>
  );
}
