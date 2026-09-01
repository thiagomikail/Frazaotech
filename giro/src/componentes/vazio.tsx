export function Vazio({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="cartao px-6 py-12 text-center">
      <p className="font-medium">{titulo}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-neblina">{descricao}</p>
      {children ? <div className="mt-4 flex justify-center">{children}</div> : null}
    </div>
  );
}
