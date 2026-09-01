export function Marca({ tamanho = "md" }: { tamanho?: "sm" | "md" | "lg" }) {
  const escala = { sm: "text-lg", md: "text-xl", lg: "text-2xl" }[tamanho];
  return (
    <span className={`${escala} font-bold tracking-tight text-tinta`}>
      Giro<span className="text-brasa">.</span>
    </span>
  );
}
