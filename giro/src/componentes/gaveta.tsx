"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * Gaveta de formulario. No desktop e um dialogo centrado; no celular sobe do
 * rodape, que e onde o polegar esta.
 */
export function Gaveta({
  rotulo,
  titulo,
  children,
  variante = "principal",
  aberturaInicial = false,
}: {
  rotulo: React.ReactNode;
  titulo: string;
  children: (fechar: () => void) => React.ReactNode;
  variante?: "principal" | "fantasma";
  aberturaInicial?: boolean;
}) {
  const [aberta, setAberta] = useState(aberturaInicial);
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberta) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberta(false);
    }
    document.addEventListener("keydown", aoTeclar);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    painel.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [aberta]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className={variante === "principal" ? "botao" : "botao-fantasma"}
      >
        {rotulo}
      </button>

      {aberta ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-tinta/40 p-0 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAberta(false);
          }}
        >
          <div
            ref={painel}
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-cartao p-5 shadow-xl sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{titulo}</h2>
              <button
                type="button"
                onClick={() => setAberta(false)}
                aria-label="Fechar"
                className="grid size-9 place-items-center rounded-lg text-neblina hover:bg-papel"
              >
                <X size={18} />
              </button>
            </div>
            {children(() => setAberta(false))}
          </div>
        </div>
      ) : null}
    </>
  );
}
