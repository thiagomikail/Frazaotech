import Link from "next/link";

export function Cabecalho() {
  return (
    <header className="sem-impressao bg-preto text-white">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <Link href="/" className="logo text-xs font-semibold sm:text-sm">Go Agentes · IA</Link>
      </div>
    </header>
  );
}
