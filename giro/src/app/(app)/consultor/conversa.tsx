"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Wrench } from "lucide-react";

type Fala = {
  papel: "USUARIO" | "ASSISTENTE";
  conteudo: string;
  ferramentas?: string[];
};

const NOME_FERRAMENTA: Record<string, string> = {
  retrato_do_negocio: "leu o retrato do negócio",
  listar_clientes: "consultou os clientes",
  listar_negocios: "consultou o funil",
  caixa_por_categoria: "abriu o caixa por categoria",
  listar_tarefas: "olhou as tarefas",
  criar_tarefa: "criou uma tarefa para você",
};

export function Conversa({
  inicial,
  conversaId,
  sugestoes,
}: {
  inicial: Fala[];
  conversaId?: string;
  sugestoes: string[];
}) {
  const [falas, setFalas] = useState<Fala[]>(inicial);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [id, setId] = useState(conversaId);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [falas, pensando]);

  async function perguntar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || pensando) return;

    setErro(null);
    setTexto("");
    setFalas((atual) => [...atual, { papel: "USUARIO", conteudo: limpa }]);
    setPensando(true);

    try {
      const resposta = await fetch("/api/consultor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: limpa, conversaId: id }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não consegui responder agora.");
        return;
      }

      setId(dados.conversaId);
      setFalas((atual) => [
        ...atual,
        { papel: "ASSISTENTE", conteudo: dados.texto, ferramentas: dados.passos },
      ]);
    } catch {
      setErro("Falha de conexao. Tente de novo.");
    } finally {
      setPensando(false);
    }
  }

  const vazia = falas.length === 0;

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 space-y-4">
        {vazia ? (
          <div className="cartao p-6">
            <Sparkles size={20} className="text-brasa" />
            <p className="mt-3 font-medium">Pergunte qualquer coisa sobre o seu negócio.</p>
            <p className="mt-1 text-sm text-neblina">
              O consultor lê seus dados antes de responder. Todo número que ele citar saiu do seu
              cadastro — ele não chuta.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => perguntar(s)}
                  className="rounded-full border border-linha px-3 py-2 text-sm text-tinta transition hover:border-brasa hover:text-brasa"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          falas.map((f, i) =>
            f.papel === "USUARIO" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-tinta px-4 py-2.5 text-[15px] text-white">
                  {f.conteudo}
                </p>
              </div>
            ) : (
              <div key={i} className="max-w-[92%]">
                {f.ferramentas?.length ? (
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs text-neblina">
                    <Wrench size={12} />
                    {[...new Set(f.ferramentas)]
                      .map((t) => NOME_FERRAMENTA[t] ?? t)
                      .join(", ")}
                  </p>
                ) : null}
                <div className="cartao whitespace-pre-wrap px-4 py-3 text-[15px] leading-relaxed">
                  {f.conteudo}
                </div>
              </div>
            ),
          )
        )}

        {pensando ? (
          <p className="flex items-center gap-2 text-sm text-neblina">
            <span className="size-2 animate-pulse rounded-full bg-brasa" />
            lendo seus números...
          </p>
        ) : null}

        {erro ? (
          <p className="rounded-lg bg-sangue-clara px-3 py-2 text-sm text-sangue">{erro}</p>
        ) : null}

        <div ref={fim} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void perguntar(texto);
        }}
        className="sticky bottom-16 mt-4 flex gap-2 md:bottom-2"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={pensando}
          className="campo shadow-sm"
          placeholder="Por que sobrou menos dinheiro este mês?"
          aria-label="Sua pergunta"
        />
        <button
          type="submit"
          disabled={pensando || !texto.trim()}
          aria-label="Enviar"
          className="botao aspect-square px-0"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
