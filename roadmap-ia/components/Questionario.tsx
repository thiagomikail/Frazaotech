"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AREAS, BLOCOS, FAIXAS_HORAS, respondida, type Pergunta, type Respostas } from "@/lib/perguntas";

type Rascunho = { passo: number; nome: string; agencia: string; email: string; respostas: Respostas };

const CHAVE = "rmia-rascunho";
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const semAssinatura = () => () => {};

/**
 * Rascunho local: fechar a aba no meio não pode custar 10 minutos de resposta.
 * No servidor não há localStorage, então só monta o formulário no navegador,
 * já com o rascunho lido — sem piscar a tela vazia.
 */
export function Questionario() {
  const chave = CHAVE;
  const bruto = useSyncExternalStore(
    semAssinatura,
    () => {
      try {
        return localStorage.getItem(chave) ?? "";
      } catch {
        return "";
      }
    },
    () => null,
  );
  if (bruto === null) return null;

  let inicial: Rascunho | null = null;
  try {
    inicial = bruto ? (JSON.parse(bruto) as Rascunho) : null;
  } catch {}
  return <Formulario chave={chave} inicial={inicial} />;
}

function Formulario({ chave, inicial }: { chave: string; inicial: Rascunho | null }) {
  const [passo, setPasso] = useState(inicial?.passo ?? 0);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [agencia, setAgencia] = useState(inicial?.agencia ?? "");
  const [email, setEmail] = useState(inicial?.email ?? "");
  const [enviado, setEnviado] = useState(false);
  const [respostas, setRespostas] = useState<Respostas>(inicial?.respostas ?? {});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify({ passo, nome, agencia, email, respostas } satisfies Rascunho));
    } catch {}
  }, [chave, passo, nome, agencia, email, respostas]);


  const total = BLOCOS.length + 1;
  const bloco = passo > 0 ? BLOCOS[passo - 1] : null;
  const podeAvancar = bloco
    ? bloco.perguntas.every((p) => respondida(p, respostas))
    : nome.trim().length > 1 && agencia.trim().length > 1 && EMAIL_OK.test(email.trim());

  const definir = (id: string, v: Respostas[string]) => setRespostas((r) => ({ ...r, [id]: v }));

  function avancar() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (passo < total - 1) setPasso(passo + 1);
    else enviar();
  }

  async function enviar() {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome, agencia, email: email.trim(), respostas }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.erro ?? "Não consegui salvar. Tente de novo.");
      try {
        localStorage.removeItem(chave);
      } catch {}
      setEnviado(true);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Algo deu errado.");
    }
    setEnviando(false);
  }

  if (enviado) {
    return (
      <div className="flex min-h-[50vh] flex-col items-start justify-center gap-5">
        <p className="logo text-xs text-ouro">Recebido</p>
        <h1 className="text-2xl font-extrabold uppercase leading-tight sm:text-3xl">Seu roadmap vai chegar por e-mail</h1>
        <p className="text-lg leading-relaxed">
          Em alguns minutos, em <strong>{email.trim()}</strong>. A análise é feita com calma — pode fechar esta página.
        </p>
        <p className="text-sm text-tinta/70">Não chegou em 15 minutos? Olhe o spam e a aba Promoções.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-tinta/60">
          <span>{bloco ? bloco.titulo : "Quem é você"}</span>
          <span>{passo + 1} / {total}</span>
        </div>
        <div className="h-1 w-full bg-preto/10">
          <div className="h-full bg-ouro transition-all" style={{ width: `${((passo + 1) / total) * 100}%` }} />
        </div>
      </div>

      {bloco ? (
        <>
          <p className="mb-8 border-l-4 border-ouro pl-4 leading-relaxed">{bloco.porque}</p>
          <div className="space-y-10">
            {bloco.perguntas.map((p) => (
              <Campo key={p.id} p={p} valor={respostas[p.id]} definir={(v) => definir(p.id, v)} />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <h1 className="text-2xl font-extrabold uppercase leading-tight sm:text-3xl">Antes de começar</h1>
          <p className="leading-relaxed">
            Responda pensando nos <strong>últimos 6 meses</strong>, não no mês bom nem no ruim. Chute honesto vale mais
            que número bonito — a análise só é tão boa quanto o que você contar.
          </p>
          <label className="block">
            <span className="mb-2 block font-semibold">Seu nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} className="min-h-12 w-full border border-preto/20 bg-white px-4 outline-none focus:border-ouro" />
          </label>
          <label className="block">
            <span className="mb-2 block font-semibold">Nome da agência</span>
            <input value={agencia} onChange={(e) => setAgencia(e.target.value)} maxLength={120} className="min-h-12 w-full border border-preto/20 bg-white px-4 outline-none focus:border-ouro" />
          </label>
          <label className="block">
            <span className="mb-2 block font-semibold">Seu e-mail</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} className="min-h-12 w-full border border-preto/20 bg-white px-4 outline-none focus:border-ouro" />
            <span className="mt-1 block text-sm text-tinta/70">O relatório chega só aqui — confira se está certo.</span>
          </label>
        </div>
      )}

      {erro && <p className="mt-8 border-l-4 border-coral bg-white p-4 text-coral">{erro}</p>}

      <div className="mt-12 flex items-center justify-between gap-4">
        <button
          onClick={() => setPasso(Math.max(0, passo - 1))}
          disabled={passo === 0}
          className="min-h-12 px-4 font-semibold text-tinta/70 hover:text-tinta disabled:invisible"
        >
          ← Voltar
        </button>
        <button
          onClick={avancar}
          disabled={!podeAvancar || enviando}
          className="min-h-12 bg-preto px-8 font-bold uppercase tracking-wide text-white hover:bg-black disabled:opacity-30"
        >
          {passo === total - 1 ? (enviando ? "Enviando…" : "Receber meu roadmap") : "Continuar"}
        </button>
      </div>
    </div>
  );
}

function Campo({ p, valor, definir }: { p: Pergunta; valor: Respostas[string] | undefined; definir: (v: Respostas[string]) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 text-lg font-bold leading-snug">{p.titulo}</legend>
      {p.ajuda && <p className="mb-3 text-sm text-tinta/70">{p.ajuda}</p>}
      <div className="mt-3">
        {p.tipo === "unica" && (
          <div className="grid gap-2">
            {p.opcoes.map((o) => (
              <Escolha key={o.valor} ativo={valor === o.valor} onClick={() => definir(o.valor)} rotulo={o.rotulo} />
            ))}
          </div>
        )}

        {p.tipo === "multipla" && (
          <div className="grid gap-2">
            {p.opcoes.map((o) => {
              const lista = (valor as string[] | undefined) ?? [];
              const ativo = lista.includes(o.valor);
              const cheio = p.max != null && lista.length >= p.max && !ativo;
              return (
                <Escolha
                  key={o.valor}
                  ativo={ativo}
                  desabilitado={cheio}
                  multipla
                  onClick={() => definir(ativo ? lista.filter((x) => x !== o.valor) : [...lista, o.valor])}
                  rotulo={o.rotulo}
                />
              );
            })}
          </div>
        )}

        {p.tipo === "texto" && (
          <>
            <textarea
              value={(valor as string) ?? ""}
              onChange={(e) => definir(e.target.value)}
              placeholder={p.placeholder}
              rows={5}
              maxLength={2000}
              className="w-full border border-preto/20 bg-white p-4 leading-relaxed outline-none focus:border-ouro"
            />
            <p className="mt-1 text-xs text-tinta/60">
              {((valor as string) ?? "").trim().length < p.minimo
                ? `Pelo menos ${p.minimo} caracteres — detalhe é o que torna a análise sua.`
                : "✓"}
            </p>
          </>
        )}

        {p.tipo === "horas" && (
          <div className="divide-y divide-preto/10 border border-preto/10 bg-white">
            {p.areas.map((a) => {
              const h = (valor as Record<string, string> | undefined) ?? {};
              return (
                <div key={a} className="p-4">
                  <p className="font-semibold">{AREAS[a].nome}</p>
                  <div className="mt-2 grid grid-cols-5 gap-1">
                    {FAIXAS_HORAS.map((f) => (
                      <button
                        key={f.valor}
                        type="button"
                        onClick={() => definir({ ...h, [a]: f.valor })}
                        className={`min-h-11 border text-sm font-semibold ${
                          h[a] === f.valor ? "border-preto bg-preto text-white" : "border-preto/15 hover:border-preto/50"
                        }`}
                      >
                        {f.rotulo}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </fieldset>
  );
}

function Escolha({ ativo, rotulo, onClick, multipla, desabilitado }: { ativo: boolean; rotulo: string; onClick: () => void; multipla?: boolean; desabilitado?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className={`flex min-h-12 items-center gap-3 border px-4 py-3 text-left transition ${
        ativo ? "border-preto bg-preto text-white" : "border-preto/15 bg-white hover:border-preto/50"
      } disabled:opacity-40`}
    >
      <span className={`h-4 w-4 shrink-0 border ${multipla ? "" : "rounded-full"} ${ativo ? "border-ouro bg-ouro" : "border-preto/30"}`} />
      <span>{rotulo}</span>
    </button>
  );
}
