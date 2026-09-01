import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CORES, FONTES } from "./marca";

/**
 * Para onde a camera olha.
 *
 * `cx`/`cy` sao o centro do enquadramento em fracao da imagem; `z` e a
 * aproximacao, com 1 = imagem inteira no quadro. Descrever por retangulo
 * parecia mais direto e nao era: como o quadro e 16:9 e o retangulo raramente
 * e, a area visivel acabava bem diferente da pedida.
 */
export type Recorte = { cx: number; cy: number; z: number };

/** A imagem inteira. */
export const TUDO: Recorte = { cx: 0.5, cy: 0.5, z: 1 };

export type Tela = { arquivo: string; largura: number; altura: number };

export const TELAS = {
  painel: { arquivo: "telas/04-painel.png", largura: 2560, altura: 2688 },
  clientes: { arquivo: "telas/05-clientes.png", largura: 2560, altura: 1640 },
  clienteForm: { arquivo: "telas/06-cliente-formulario.png", largura: 2560, altura: 1640 },
  negocios: { arquivo: "telas/07-negocios.png", largura: 2560, altura: 2260 },
  negocioForm: { arquivo: "telas/08-negocio-formulario.png", largura: 2560, altura: 1640 },
  caixa: { arquivo: "telas/09-caixa.png", largura: 2560, altura: 1640 },
  caixaForm: { arquivo: "telas/10-caixa-formulario.png", largura: 2560, altura: 1640 },
  tarefas: { arquivo: "telas/11-tarefas.png", largura: 2560, altura: 1640 },
  consultorVazio: { arquivo: "telas/12-consultor-vazio.png", largura: 2560, altura: 1640 },
  consultor: { arquivo: "telas/13-consultor.png", largura: 2560, altura: 1640 },
  diagnostico: { arquivo: "telas/14-diagnostico.png", largura: 2560, altura: 2016 },
  conta: { arquivo: "telas/15-conta.png", largura: 2560, altura: 2234 },
} satisfies Record<string, Tela>;

const MARGEM = 0.94; // folga para o recorte nao encostar na borda do quadro

/**
 * Enquadra um recorte da captura no quadro do video, indo de `de` ate `para`.
 *
 * A conta e sempre a mesma: escala para o recorte caber, e translada para o
 * centro do recorte cair no centro do quadro. Interpolar o RECORTE (e nao a
 * matriz de transformacao) mantem o movimento legivel — a camera anda de um
 * assunto para outro, em vez de derivar em diagonal.
 */
export const Enquadre: React.FC<{
  tela: Tela;
  de: Recorte;
  para: Recorte;
  progresso: number;
}> = ({ tela, de, para, progresso }) => {
  const { width: quadroL, height: quadroA } = useVideoConfig();
  const p = progresso;

  // A aproximacao anda em escala geometrica: interpolar `z` direto faz o
  // comeco do movimento parecer rapido demais e o fim, arrastado.
  const z = Math.exp(Math.log(de.z) * (1 - p) + Math.log(para.z) * p);
  const cx = de.cx + (para.cx - de.cx) * p;
  const cy = de.cy + (para.cy - de.cy) * p;

  const cabe = Math.min((quadroL * MARGEM) / tela.largura, (quadroA * MARGEM) / tela.altura);
  const escala = cabe * z;

  // Segura o centro para a janela nao sair da imagem quando ja ha aproximacao
  // suficiente para preencher o quadro.
  const meiaJanelaX = quadroL / 2 / escala / tela.largura;
  const meiaJanelaY = quadroA / 2 / escala / tela.altura;
  const prender = (c: number, meia: number) =>
    meia >= 0.5 ? 0.5 : Math.min(Math.max(c, meia), 1 - meia);

  const centroX = prender(cx, meiaJanelaX) * tela.largura;
  const centroY = prender(cy, meiaJanelaY) * tela.altura;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      <div
        style={{
          width: tela.largura,
          height: tela.altura,
          transform: `scale(${escala}) translate(${quadroL / 2 / escala - centroX}px, ${
            quadroA / 2 / escala - centroY
          }px)`,
          transformOrigin: "0 0",
          position: "absolute",
          left: 0,
          top: 0,
          borderRadius: 8 / escala,
          overflow: "hidden",
          boxShadow: `0 ${40 / escala}px ${120 / escala}px rgba(0,0,0,.55)`,
        }}
      >
        <Img src={staticFile(tela.arquivo)} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Uma cena: enquadra um trecho da captura e escreve uma legenda embaixo.
 * `de` e `para` iguais deixam a camera parada.
 */
export const Cena: React.FC<{
  tela: Tela;
  de?: Recorte;
  para: Recorte;
  legenda: string;
  detalhe?: string;
  duracao: number;
  /** Funde na entrada/saida. Falso quando a cena vizinha usa a mesma captura:
   *  dissolver uma imagem sobre ela mesma em outro zoom vira fantasma, nao
   *  transicao. Entre cenas da mesma tela a camera so continua andando. */
  entrada?: boolean;
  saida?: boolean;
}> = ({ tela, de, para, legenda, detalhe, duracao, entrada = true, saida = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const avanco = interpolate(frame, [0, duracao], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 0, 0.15, 1),
  });

  const opacidade = interpolate(
    frame,
    [0, entrada ? 8 : 0, duracao - (saida ? 8 : 0), duracao],
    [entrada ? 0 : 1, 1, 1, saida ? 0 : 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // A legenda sempre troca com fade proprio, mesmo quando a imagem nao funde.
  const legendaSai = interpolate(frame, [duracao - 12, duracao - 4], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subida = spring({ frame: frame - 6, fps, config: { damping: 200 }, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ opacity: opacidade }}>
      <Enquadre tela={tela} de={de ?? para} para={para} progresso={avanco} />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "flex-start",
          padding: 40,
          background:
            "linear-gradient(to top, rgba(20,17,14,.92) 0%, rgba(20,17,14,.72) 14%, rgba(20,17,14,0) 34%)",
          opacity: legendaSai,
        }}
      >
        <div
          style={{
            transform: `translateY(${interpolate(subida, [0, 1], [22, 0])}px)`,
            opacity: subida * legendaSai,
            maxWidth: 900,
          }}
        >
          <div
            style={{
              fontFamily: FONTES.titulo,
              fontWeight: 700,
              fontVariationSettings: '"wdth" 108',
              fontSize: 34,
              lineHeight: 1.2,
              color: CORES.tinta,
              letterSpacing: "-0.01em",
            }}
          >
            {legenda}
          </div>
          {detalhe ? (
            <div
              style={{
                marginTop: 8,
                fontFamily: FONTES.titulo,
                fontWeight: 600,
                fontSize: 21,
                lineHeight: 1.35,
                color: CORES.suave,
              }}
            >
              {detalhe}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Cartao de abertura com o nome do clipe. */
export const Abertura: React.FC<{ titulo: string; subtitulo: string; duracao: number }> = ({
  titulo,
  subtitulo,
  duracao,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 26 });
  const sai = interpolate(frame, [duracao - 10, duracao], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: CORES.fundo,
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "0 80px",
        opacity: sai,
      }}
    >
      <div style={{ opacity: entra, transform: `translateY(${interpolate(entra, [0, 1], [18, 0])}px)` }}>
        <div
          style={{
            fontFamily: FONTES.titulo,
            fontWeight: 700,
            fontSize: 26,
            color: CORES.tinta,
            letterSpacing: "-0.01em",
          }}
        >
          Giro<span style={{ color: CORES.brasa }}>.</span>
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: FONTES.titulo,
            fontWeight: 700,
            fontVariationSettings: '"wdth" 112',
            fontSize: 62,
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            color: CORES.tinta,
            maxWidth: 900,
          }}
        >
          {titulo}
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: FONTES.titulo,
            fontWeight: 600,
            fontSize: 24,
            color: CORES.suave,
            maxWidth: 780,
          }}
        >
          {subtitulo}
        </div>
        <div
          style={{
            marginTop: 30,
            height: 3,
            width: interpolate(entra, [0, 1], [0, 96]),
            backgroundColor: CORES.brasa,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/** Cartao final. */
export const Fecho: React.FC<{ frase: string; duracao: number }> = ({ frase, duracao }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 24 });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: CORES.fundo,
        justifyContent: "center",
        alignItems: "center",
        opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}
    >
      <div style={{ textAlign: "center", opacity: entra, padding: "0 80px" }}>
        <div
          style={{
            fontFamily: FONTES.titulo,
            fontWeight: 700,
            fontVariationSettings: '"wdth" 110',
            fontSize: 44,
            lineHeight: 1.15,
            color: CORES.tinta,
            letterSpacing: "-0.02em",
            maxWidth: 940,
          }}
        >
          {frase}
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: FONTES.titulo,
            fontWeight: 700,
            fontSize: 24,
            color: CORES.tinta,
          }}
        >
          Giro<span style={{ color: CORES.brasa }}>.</span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 34, fontFamily: FONTES.mono, fontSize: 14, color: CORES.suave }}>
        beta · setembro de 2026
      </div>
    </AbsoluteFill>
  );
};

/** Monta o clipe: abertura, cenas em sequencia, fecho. */
export type Passo = Omit<React.ComponentProps<typeof Cena>, "duracao"> & { duracao: number };

export const Clipe: React.FC<{
  titulo: string;
  subtitulo: string;
  passos: Passo[];
  fecho: string;
}> = ({ titulo, subtitulo, passos, fecho }) => {
  const ABERTURA = 62;
  const FECHO = 62;

  let cursor = ABERTURA;

  return (
    <AbsoluteFill style={{ backgroundColor: CORES.fundo }}>
      <Sequence durationInFrames={ABERTURA}>
        <Abertura titulo={titulo} subtitulo={subtitulo} duracao={ABERTURA} />
      </Sequence>

      {passos.map((passo, i) => {
        const mesmaAntes = i > 0 && passos[i - 1].tela === passo.tela;
        const mesmaDepois = i < passos.length - 1 && passos[i + 1].tela === passo.tela;

        const inicio = cursor;
        // Troca de tela: as duas cenas se sobrepoem 8 quadros e fundem.
        // Mesma tela: emendam sem sobra, e a camera segue direto.
        cursor += mesmaDepois ? passo.duracao : passo.duracao - 8;

        return (
          <Sequence key={i} from={inicio} durationInFrames={passo.duracao}>
            <Cena {...passo} entrada={!mesmaAntes} saida={!mesmaDepois} />
          </Sequence>
        );
      })}

      <Sequence from={cursor + 8} durationInFrames={FECHO}>
        <Fecho frase={fecho} duracao={FECHO} />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Quantos frames o clipe inteiro ocupa. Espelha a conta do `Clipe`. */
export function duracaoDoClipe(passos: Passo[]): number {
  let total = 62;
  passos.forEach((p, i) => {
    const mesmaDepois = i < passos.length - 1 && passos[i + 1].tela === p.tela;
    total += mesmaDepois ? p.duracao : p.duracao - 8;
  });
  return total + 8 + 62;
}
