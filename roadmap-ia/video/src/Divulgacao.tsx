import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { C, FONTE } from "./marca";

/**
 * Reels de divulgação do diagnóstico (1080×1920, ~29 s).
 *
 * Segue o próprio relatório: resposta primeiro. Gancho que contradiz o senso
 * comum → por quê → como funciona (perguntas, gargalo, e-mail) → chamada.
 * Sem narração: o texto carrega tudo, porque Reels roda mudo na maioria das vezes.
 */

const T = 12; // frames de cada transição
const CENAS = [105, 135, 180, 165, 210, 135];
export const DURACAO = CENAS.reduce((a, b) => a + b, 0) - T * (CENAS.length - 1);

export const Divulgacao: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONTE, backgroundColor: C.preto }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={CENAS[0]}><Gancho /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: T })} />
      <TransitionSeries.Sequence durationInFrames={CENAS[1]}><Problema /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
      <TransitionSeries.Sequence durationInFrames={CENAS[2]}><Perguntas /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />
      <TransitionSeries.Sequence durationInFrames={CENAS[3]}><Gargalo /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: T })} />
      <TransitionSeries.Sequence durationInFrames={CENAS[4]}><Email /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
      <TransitionSeries.Sequence durationInFrames={CENAS[5]}><Chamada /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

// ——— peças

/** Entra de baixo com mola, a partir de `de` (frames). */
const Entra: React.FC<{ de?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ de = 0, y = 60, children, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - de, fps, config: { damping: 200 } });
  return <div style={{ opacity: s, transform: `translateY(${(1 - s) * y}px)`, ...style }}>{children}</div>;
};

const Logo: React.FC<{ cor?: string }> = ({ cor = C.ouro }) => (
  <div style={{ position: "absolute", top: 110, left: 90, fontSize: 30, letterSpacing: "0.3em", textTransform: "uppercase", color: cor, fontWeight: 600 }}>
    Go Agentes · IA
  </div>
);

/** Sublinhado coral que se desenha da esquerda pra direita. */
const Sublinha: React.FC<{ de: number; children: React.ReactNode }> = ({ de, children }) => {
  const f = useCurrentFrame();
  const w = interpolate(f, [de, de + 18], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span style={{ position: "absolute", left: 0, bottom: -4, height: 10, width: `${w}%`, background: C.coral }} />
    </span>
  );
};

const Pagina: React.FC<{ fundo: string; children: React.ReactNode }> = ({ fundo, children }) => (
  <AbsoluteFill style={{ background: fundo, padding: "260px 90px 160px", display: "flex", flexDirection: "column" }}>{children}</AbsoluteFill>
);

// ——— 1. gancho

const Gancho: React.FC = () => (
  <Pagina fundo={C.preto}>
    <Logo />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {["IA NÃO", "SERVE", "PRA TUDO."].map((l, i) => (
        <Entra key={l} de={i * 7}>
          <div style={{ color: C.branco, fontSize: 170, fontWeight: 800, lineHeight: 1.02 }}>{l}</div>
        </Entra>
      ))}
      <Entra de={40} style={{ marginTop: 70 }}>
        <div style={{ color: C.branco, fontSize: 52, lineHeight: 1.35, opacity: 0.85 }}>
          Na sua agência, ela vale muito em <strong style={{ color: C.ouro }}>uma</strong> coisa.
          <br />Você sabe qual?
        </div>
      </Entra>
    </div>
  </Pagina>
);

// ——— 2. problema

const Problema: React.FC = () => (
  <Pagina fundo={C.papel}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 90, color: C.tinta }}>
      <Entra>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.2 }}>
          Hora economizada fora do seu gargalo <strong style={{ fontWeight: 800 }}>não vira dinheiro.</strong>
        </div>
      </Entra>
      <Entra de={40}>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.2 }}>
          Mais lead pra quem já não dá conta… <Sublinha de={70}>piora o negócio.</Sublinha>
        </div>
      </Entra>
    </div>
  </Pagina>
);

// ——— 3. perguntas

const OPCOES = [
  "Eu não daria conta: atrasaria respostas",
  "Daria conta — o que falta é cliente",
  "Daria conta, mas sobraria pouco",
];

const Perguntas: React.FC = () => {
  const f = useCurrentFrame();
  const escolhida = f > 95 ? 0 : -1;
  const toque = interpolate(f, [88, 95, 110], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const progresso = interpolate(f, [20, 150], [28, 57], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Pagina fundo={C.papel}>
      <Entra>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05, color: C.preto, textTransform: "uppercase" }}>
          22 perguntas.
          <br />
          <span style={{ color: C.ouro }}>12 minutos.</span>
        </div>
      </Entra>

      <Entra de={15} y={120} style={{ marginTop: 80 }}>
        <div style={{ background: C.preto, borderRadius: 60, padding: 26, boxShadow: "0 40px 80px rgba(0,0,0,.25)" }}>
          <div style={{ background: C.papel, borderRadius: 40, padding: "56px 48px 64px", color: C.tinta }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 600, letterSpacing: "0.08em", opacity: 0.6 }}>
              <span>O GARGALO</span><span>3 / 7</span>
            </div>
            <div style={{ height: 8, background: "rgba(28,28,30,.1)", marginTop: 14 }}>
              <div style={{ height: "100%", width: `${progresso}%`, background: C.ouro }} />
            </div>
            <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.3, margin: "48px 0 36px" }}>
              Se amanhã chegasse o DOBRO de pedidos de orçamento, o que aconteceria?
            </div>
            {OPCOES.map((o, i) => (
              <div
                key={o}
                style={{
                  position: "relative",
                  display: "flex", alignItems: "center", gap: 24,
                  border: `2px solid ${escolhida === i ? C.preto : "rgba(28,28,30,.15)"}`,
                  background: escolhida === i ? C.preto : C.branco,
                  color: escolhida === i ? C.branco : C.tinta,
                  padding: "30px 32px", marginBottom: 16, fontSize: 34,
                }}
              >
                <span style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, border: `2px solid ${escolhida === i ? C.ouro : "rgba(28,28,30,.3)"}`, background: escolhida === i ? C.ouro : "transparent" }} />
                {o}
                {i === 0 && (
                  <span style={{ position: "absolute", right: 90, top: "50%", width: 90, height: 90, marginTop: -45, borderRadius: 45, background: C.ouro, opacity: toque * 0.55, transform: `scale(${0.6 + toque * 0.6})` }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </Entra>
    </Pagina>
  );
};

// ——— 4. gargalo

const FRENTES: [string, number][] = [
  ["Cotação e proposta", 1],
  ["Primeiro atendimento", 0.5],
  ["Roteirização", 0.36],
  ["Pós-venda", 0.24],
  ["Financeiro", 0.15],
  ["Marketing", 0.09],
  ["Recompra", 0.04],
];

const Gargalo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Pagina fundo={C.preto}>
      <Entra>
        <div style={{ color: C.branco, fontSize: 80, fontWeight: 800, lineHeight: 1.1, textTransform: "uppercase" }}>
          Acha o seu <span style={{ color: C.ouro }}>gargalo real</span>
        </div>
      </Entra>
      <div style={{ marginTop: 90, display: "flex", flexDirection: "column", gap: 38 }}>
        {FRENTES.map(([nome, v], i) => {
          const w = interpolate(f, [20 + i * 6, 55 + i * 6], [0, v * 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          return (
            <div key={nome} style={{ opacity: interpolate(f, [15 + i * 6, 25 + i * 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
              <div style={{ color: i === 0 ? C.ouro : C.branco, fontSize: 36, fontWeight: i === 0 ? 800 : 400, marginBottom: 10 }}>{nome}</div>
              <div style={{ height: 22, background: "rgba(255,255,255,.08)" }}>
                <div style={{ height: "100%", width: `${w}%`, background: i === 0 ? C.ouro : "rgba(255,255,255,.35)" }} />
              </div>
            </div>
          );
        })}
      </div>
      <Entra de={100} style={{ marginTop: 90 }}>
        <div style={{ color: C.branco, fontSize: 46, lineHeight: 1.35, borderLeft: `8px solid ${C.coral}`, paddingLeft: 32 }}>
          Não o que você acha.
          <br />
          <strong>O que as suas respostas mostram.</strong>
        </div>
      </Entra>
    </Pagina>
  );
};

// ——— 5. e-mail

const Cartao: React.FC<{ de: number; borda: string; rotulo: string; texto: string; extra?: React.ReactNode }> = ({ de, borda, rotulo, texto, extra }) => (
  <Entra de={de} y={80}>
    <div style={{ background: C.branco, borderLeft: `10px solid ${borda}`, padding: "34px 40px", marginBottom: 26 }}>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: borda === C.papel ? "#6b7785" : borda }}>{rotulo}</div>
      <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.3, color: C.preto, marginTop: 10 }}>{texto}</div>
      {extra}
    </div>
  </Entra>
);

const Email: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chega = spring({ frame: f - 5, fps, config: { damping: 14 } });

  return (
    <Pagina fundo={C.papel}>
      <div style={{ transform: `translateY(${(1 - chega) * -500}px)`, opacity: chega }}>
        <div style={{ background: C.branco, borderRadius: 36, padding: "30px 36px", display: "flex", gap: 28, alignItems: "center", boxShadow: "0 20px 50px rgba(0,0,0,.15)" }}>
          <div style={{ width: 90, height: 90, background: C.preto, color: C.ouro, fontWeight: 800, fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>GA</div>
          <div style={{ color: C.tinta }}>
            <div style={{ fontSize: 28, opacity: 0.6 }}>Go Agentes · Roadmap de IA · agora</div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>Seu roadmap de IA chegou</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 60 }}>
        <Entra de={30}>
          <div style={{ background: C.preto, color: C.branco, padding: "40px", marginBottom: 26 }}>
            <div style={{ fontSize: 24, letterSpacing: "0.3em", color: C.ouro }}>VEREDITO</div>
            <div style={{ fontSize: 40, lineHeight: 1.35, marginTop: 14 }}>
              Seu gargalo é capacidade, não cliente. Você perde venda por demora.
            </div>
          </div>
        </Entra>
        <Cartao de={60} borda={C.ouro} rotulo="Onde a IA vale mais" texto="Rascunho de proposta a partir do áudio do cliente" />
        <Cartao de={90} borda={C.coral} rotulo="O que NÃO fazer agora" texto="Chatbot no WhatsApp sem roteiro de qualificação" />
        <Cartao
          de={120}
          borda={C.papel}
          rotulo="Roadmap de 90 dias"
          texto="Fase 0 · Escreva um modelo único de proposta"
          extra={
            <div style={{ display: "flex", gap: 40, marginTop: 20, fontSize: 30, lineHeight: 1.3 }}>
              <div><strong style={{ color: C.oliva }}>Deu certo se</strong><br />100% no modelo</div>
              <div><strong style={{ color: C.coral }}>Pare se</strong><br />3 semanas, 2 modelos</div>
            </div>
          }
        />
      </div>
    </Pagina>
  );
};

// ——— 6. chamada

const Chamada: React.FC = () => (
  <Pagina fundo={C.preto}>
    <Logo />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Entra>
        <div style={{ color: C.ouro, fontSize: 38, fontWeight: 700, letterSpacing: "0.12em" }}>DIAGNÓSTICO PARA ALUNOS</div>
      </Entra>
      <Entra de={8}>
        <div style={{ color: C.branco, fontSize: 104, fontWeight: 800, lineHeight: 1.05, textTransform: "uppercase", marginTop: 30 }}>
          Onde a IA dá dinheiro na sua agência
        </div>
      </Entra>
      <Entra de={30} style={{ marginTop: 60 }}>
        <div style={{ color: C.branco, fontSize: 46, lineHeight: 1.4, opacity: 0.85 }}>
          Sem cadastro.
          <br />O relatório chega no seu e-mail.
        </div>
      </Entra>
      <Entra de={50} style={{ marginTop: 90 }}>
        <div style={{ display: "inline-block", background: C.ouro, color: C.preto, fontSize: 44, fontWeight: 800, padding: "34px 56px", letterSpacing: "0.06em" }}>
          LINK NA BIO
        </div>
      </Entra>
    </div>
  </Pagina>
);
