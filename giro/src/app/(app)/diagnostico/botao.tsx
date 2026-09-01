"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export function BotaoDiagnostico({ rotulo = "Rodar diagnóstico" }: { rotulo?: string }) {
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function rodar() {
    setRodando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/diagnostico", { method: "POST" });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não consegui gerar agora.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Falha de conexao. Tente de novo.");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={rodar} disabled={rodando} className="botao">
        <Sparkles size={16} />
        {rodando ? "Lendo seus números..." : rotulo}
      </button>
      {erro ? <p className="mt-2 max-w-sm text-sm text-sangue">{erro}</p> : null}
    </div>
  );
}
