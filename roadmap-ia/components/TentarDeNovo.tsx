"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TentarDeNovo({ id, erro }: { id: string; erro: string | null }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(erro);

  async function tentar() {
    setEnviando(true);
    const res = await fetch(`/api/diagnostico/${id}/analisar`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (res.ok) router.refresh();
    else setMsg(j.erro ?? "Ainda não foi. Tente mais tarde.");
    setEnviando(false);
  }

  return (
    <div className="sem-impressao border-l-4 border-coral bg-white p-5">
      <p className="font-semibold">A análise escrita não ficou pronta.</p>
      {msg && <p className="mt-1 text-sm">{msg}</p>}
      <button onClick={tentar} disabled={enviando} className="mt-4 min-h-12 bg-preto px-6 font-bold uppercase tracking-wide text-white disabled:opacity-50">
        {enviando ? "Gerando… (até 2 min)" : "Gerar a análise agora"}
      </button>
    </div>
  );
}
