import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { betaLiberado, planoEfetivo, PLANOS } from "@/lib/planos";
import { Marca } from "@/componentes/marca";
import { Navegacao } from "@/componentes/navegacao";
import { MenuDaConta } from "@/componentes/menu-da-conta";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();
  const plano = planoEfetivo(sessao.empresa.plano);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-linha bg-cartao/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/painel" className="shrink-0">
            <Marca />
          </Link>

          <Navegacao className="hidden md:flex" />

          <div className="ml-auto flex items-center gap-3">
            {betaLiberado() && sessao.empresa.plano === "FREE" ? (
              <span className="etiqueta hidden bg-brasa-clara text-brasa sm:inline-flex">
                {PLANOS[plano].nome} · grátis no beta
              </span>
            ) : null}
            <MenuDaConta nome={sessao.usuario.nome} empresa={sessao.empresa.nome} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:pb-10">{children}</main>

      {/* No celular a navegacao vai para o rodape: o polegar alcanca. */}
      <Navegacao
        className="fixed inset-x-0 bottom-0 z-20 justify-around border-t border-linha bg-cartao px-1 py-1.5 md:hidden"
        compacta
      />
    </div>
  );
}
