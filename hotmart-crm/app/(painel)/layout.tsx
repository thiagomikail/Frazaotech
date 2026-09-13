import Link from "next/link";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { sair } from "../entrar/acoes";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  // O proxy so olha se existe cookie. A validacao da assinatura do JWT e
  // aqui, no servidor, onde a fraude nao passa.
  const sessao = await sessaoAtiva();
  if (!sessao) redirect("/entrar");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="font-semibold">
            CRM Hotmart
          </Link>
          <Link href="/" className="text-tinta-fraca hover:text-tinta">
            Painel
          </Link>
          <Link href="/pessoas" className="text-tinta-fraca hover:text-tinta">
            Pessoas
          </Link>
          <Link href="/risco" className="text-tinta-fraca hover:text-tinta">
            Risco
          </Link>
        </nav>
        <form action={sair}>
          <button className="text-xs text-tinta-fraca hover:text-tinta">Sair</button>
        </form>
      </header>
      {children}
    </div>
  );
}
