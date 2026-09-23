import Link from "next/link";
import { sair } from "@/app/acoes";

export function Cabecalho({ email }: { email?: string | null }) {
  return (
    <header className="sem-impressao bg-preto text-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="logo text-xs font-semibold sm:text-sm">Go Agentes · IA</Link>
        {email && (
          <nav className="flex items-center gap-4 text-xs sm:text-sm">
            <Link href="/meus" className="hover:text-ouro">Meus relatórios</Link>
            <form action={sair}>
              <button className="text-white/60 hover:text-white" title={email}>Sair</button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}
