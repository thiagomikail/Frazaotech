"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Admin: gera a análise se faltar e manda (de novo) o e-mail pro aluno. */
export function Reenviar({ id, jaEnviado }: { id: string; jaEnviado: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function enviar() {
    if (jaEnviado && !confirm("Este relatório já foi enviado. Mandar de novo?")) return;
    setEnviando(true);
    setMsg(null);
    const res = await fetch(`/api/diagnostico/${id}/enviar`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Enviado." : (j.erro ?? "Falhou."));
    setEnviando(false);
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button onClick={enviar} disabled={enviando} className="border border-preto/30 px-4 py-2 font-semibold hover:border-preto disabled:opacity-50">
        {enviando ? "Enviando… (até 2 min)" : jaEnviado ? "Reenviar e-mail" : "Gerar e enviar"}
      </button>
      {msg && <span className="text-sm">{msg}</span>}
    </span>
  );
}
