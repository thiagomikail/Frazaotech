"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { sair } from "@/acoes/conta";

export function MenuDaConta({ nome, empresa }: { nome: string; empresa: string }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicar(evento: MouseEvent) {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, [aberto]);

  const iniciais = nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={caixa}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 text-sm hover:bg-papel"
      >
        <span className="grid size-8 place-items-center rounded-full bg-tinta text-[12px] font-semibold text-white">
          {iniciais || "?"}
        </span>
        <ChevronDown size={15} className="text-neblina" />
      </button>

      {aberto ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-linha bg-cartao shadow-lg"
        >
          <div className="border-b border-linha px-4 py-3">
            <p className="truncate text-sm font-medium">{nome}</p>
            <p className="truncate text-xs text-neblina">{empresa}</p>
          </div>
          <Link
            href="/conta"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="block px-4 py-3 text-sm hover:bg-papel"
          >
            Conta e plano
          </Link>
          <Link
            href="/tarefas"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="block px-4 py-3 text-sm hover:bg-papel md:hidden"
          >
            Tarefas
          </Link>
          <form action={sair}>
            <button
              type="submit"
              role="menuitem"
              className="w-full border-t border-linha px-4 py-3 text-left text-sm text-sangue hover:bg-papel"
            >
              Sair
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
