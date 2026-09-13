/** Casca de secao. Titulo, subtitulo opcional e o conteudo num cartao. */
export function Secao({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-borda bg-superficie">
      <header className="flex items-start justify-between gap-4 border-b border-borda px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-xs text-tinta-fraca">{descricao}</p>}
        </div>
        {acao}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-tinta-fraca">{children}</p>;
}

export function Tabela({
  colunas,
  children,
}: {
  colunas: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-full text-sm">
        <thead>
          <tr className="border-b border-borda text-left text-xs text-tinta-fraca">
            {colunas.map((c, i) => (
              <th
                key={c}
                className={`pb-2 font-medium ${i === 0 ? "" : "text-right"}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
