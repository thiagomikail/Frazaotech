"use client";

import { useFormStatus } from "react-dom";

export function BotaoEnviar({
  children,
  carregando = "Um instante...",
  className = "botao w-full",
}: {
  children: React.ReactNode;
  carregando?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? carregando : children}
    </button>
  );
}
