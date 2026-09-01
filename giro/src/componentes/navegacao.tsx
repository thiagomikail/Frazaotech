"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Coins,
  ListChecks,
  MessageCircleQuestion,
  Sparkles,
  Users,
} from "lucide-react";

const ITENS = [
  { href: "/painel", texto: "Painel", Icone: BarChart3 },
  { href: "/clientes", texto: "Clientes", Icone: Users },
  { href: "/negocios", texto: "Negócios", Icone: Coins },
  { href: "/caixa", texto: "Caixa", Icone: ListChecks },
  { href: "/consultor", texto: "Consultor", Icone: MessageCircleQuestion },
  { href: "/diagnostico", texto: "Diagnóstico", Icone: Sparkles },
];

export function Navegacao({
  className = "",
  compacta = false,
}: {
  className?: string;
  compacta?: boolean;
}) {
  const caminho = usePathname();

  return (
    <nav className={`flex items-center gap-1 ${className}`}>
      {ITENS.map(({ href, texto, Icone }) => {
        const ativo = caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={
              compacta
                ? `flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px] ${
                    ativo ? "text-brasa" : "text-neblina"
                  }`
                : `flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition ${
                    ativo ? "bg-brasa-clara text-brasa" : "text-neblina hover:text-tinta"
                  }`
            }
          >
            <Icone size={compacta ? 19 : 16} strokeWidth={2} />
            <span className={compacta ? "" : "hidden lg:inline"}>{texto}</span>
          </Link>
        );
      })}
    </nav>
  );
}
