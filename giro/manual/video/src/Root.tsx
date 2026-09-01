import React from "react";
import { Composition } from "remotion";
import { Clipe, TELAS, TUDO, duracaoDoClipe, type Passo } from "./pecas";
import "./marca";

const FPS = 30;
const L = 1280;
const A = 720;

/**
 * Os enquadramentos abaixo sao centro (fracao da imagem) mais aproximacao.
 * Regra pratica das capturas de 1280px: z=1 mostra a pagina inteira, z=1,5
 * mostra cerca de 1030px de largura da pagina, z=2 cerca de 775px e z=2,4
 * cerca de 645px. Passar de z=2,5 comeca a cortar texto de cartao.
 */

// --------------------------------------------------------------- visao geral
const TOUR: Passo[] = [
  {
    tela: TELAS.painel,
    de: TUDO,
    para: { cx: 0.5, cy: 0.17, z: 1.35 },
    legenda: "O painel abre com o mês na cara",
    detalhe: "Entrou, saiu, sobrou — e quanto está parado no funil.",
    duracao: 120,
  },
  {
    tela: TELAS.clientes,
    de: TUDO,
    para: { cx: 0.5, cy: 0.45, z: 1.4 },
    legenda: "Clientes, ordenados por quanto já gastaram",
    detalhe: "Quem passou 60 dias sem comprar ganha um aviso vermelho sozinho.",
    duracao: 130,
  },
  {
    tela: TELAS.negocios,
    de: { cx: 0.5, cy: 0.42, z: 1.15 },
    para: { cx: 0.76, cy: 0.38, z: 1.85 },
    legenda: "Cada orçamento na rua é um negócio no funil",
    detalhe: "Proposta parada há duas semanas aparece marcada.",
    duracao: 135,
  },
  {
    tela: TELAS.caixa,
    de: TUDO,
    para: { cx: 0.5, cy: 0.28, z: 1.45 },
    legenda: "O caixa fecha o mês",
    detalhe: "Entradas e saídas por dia, com o saldo de cada dia.",
    duracao: 120,
  },
  {
    tela: TELAS.painel,
    de: { cx: 0.4, cy: 0.37, z: 1.35 },
    para: { cx: 0.31, cy: 0.37, z: 1.7 },
    legenda: "Em cima disso, o consultor",
    detalhe: "Ele lê esses quatro registros e aponta o que merece sua atenção.",
    duracao: 145,
  },
];

// ------------------------------------------------------------ primeiro lance
const LANCAMENTO: Passo[] = [
  {
    tela: TELAS.caixa,
    de: TUDO,
    para: { cx: 0.82, cy: 0.2, z: 2.1 },
    legenda: "Tudo começa no botão Lançar",
    duracao: 105,
  },
  {
    tela: TELAS.caixaForm,
    de: { cx: 0.5, cy: 0.5, z: 1.2 },
    para: { cx: 0.5, cy: 0.37, z: 2.1 },
    legenda: "Entrou ou saiu, e o valor",
    detalhe: 'O valor aceita "1.234,56", "1234,56" ou "R$ 80".',
    duracao: 130,
  },
  {
    tela: TELAS.caixaForm,
    de: { cx: 0.5, cy: 0.37, z: 2.1 },
    para: { cx: 0.5, cy: 0.56, z: 2.2 },
    legenda: "A categoria é o que paga depois",
    detalhe: 'Fugir de "Outros" é o que permite responder para onde o dinheiro vai.',
    duracao: 140,
  },
  {
    tela: TELAS.painel,
    de: TUDO,
    para: { cx: 0.5, cy: 0.17, z: 1.35 },
    legenda: "E o painel já muda",
    detalhe: "Cada lançamento é matéria-prima do diagnóstico da semana.",
    duracao: 120,
  },
];

// ------------------------------------------------------------------ consultor
const CONSULTOR: Passo[] = [
  {
    tela: TELAS.consultorVazio,
    de: TUDO,
    para: { cx: 0.45, cy: 0.39, z: 1.5 },
    legenda: "Pergunte com suas palavras",
    detalhe: "Ele sugere por onde começar quando a conversa está em branco.",
    duracao: 120,
  },
  {
    tela: TELAS.consultor,
    de: TUDO,
    para: { cx: 0.74, cy: 0.23, z: 2.0 },
    legenda: "“Por que sobrou menos este mês?”",
    duracao: 105,
  },
  {
    tela: TELAS.consultor,
    de: { cx: 0.74, cy: 0.23, z: 2.0 },
    para: { cx: 0.3, cy: 0.28, z: 2.1 },
    legenda: "Antes de responder, ele vai ler seus dados",
    detalhe: "Essa linha cinza é a prestação de contas dele.",
    duracao: 130,
  },
  {
    tela: TELAS.consultor,
    de: { cx: 0.3, cy: 0.28, z: 2.1 },
    para: { cx: 0.47, cy: 0.34, z: 1.4 },
    legenda: "A resposta vem com número e com data",
    detalhe: "Todo valor citado saiu do seu cadastro — o modelo não calcula nada.",
    duracao: 150,
  },
];

// ---------------------------------------------------------------- diagnostico
const DIAGNOSTICO: Passo[] = [
  {
    tela: TELAS.diagnostico,
    de: TUDO,
    para: { cx: 0.31, cy: 0.2, z: 1.8 },
    legenda: "Toda segunda-feira, sem você pedir",
    detalhe: "Duas ou três frases sobre como o negócio está.",
    duracao: 125,
  },
  {
    tela: TELAS.diagnostico,
    de: { cx: 0.31, cy: 0.2, z: 1.8 },
    para: { cx: 0.31, cy: 0.39, z: 1.55 },
    legenda: "Três ações para os próximos sete dias",
    detalhe: "Na ordem de fazer, com o esforço estimado ao lado.",
    duracao: 145,
  },
  {
    tela: TELAS.diagnostico,
    de: { cx: 0.31, cy: 0.39, z: 1.55 },
    para: { cx: 0.75, cy: 0.34, z: 1.55 },
    legenda: "Do lado direito, a conta que sustenta o texto",
    detalhe: "Os sinais são calculados pelo Giro, sem IA. Se o texto estranhar, confira aqui.",
    duracao: 155,
  },
  {
    tela: TELAS.diagnostico,
    de: { cx: 0.75, cy: 0.34, z: 1.55 },
    para: { cx: 0.75, cy: 0.63, z: 1.85 },
    legenda: "Alguns sinais falam do seu registro, não do seu negócio",
    detalhe: "Esses vêm primeiro: sem registro, o resto do diagnóstico não se sustenta.",
    duracao: 150,
  },
];

export const Root: React.FC = () => (
  <>
    <Composition
      id="tour"
      component={Clipe}
      durationInFrames={duracaoDoClipe(TOUR)}
      fps={FPS}
      width={L}
      height={A}
      defaultProps={{
        titulo: "O Giro em meio minuto",
        subtitulo: "Quatro registros, e um consultor que lê os quatro.",
        passos: TOUR,
        fecho: "Registrar é de graça. O que se paga é o consultor.",
      }}
    />
    <Composition
      id="primeiro-lancamento"
      component={Clipe}
      durationInFrames={duracaoDoClipe(LANCAMENTO)}
      fps={FPS}
      width={L}
      height={A}
      defaultProps={{
        titulo: "Lançar no caixa",
        subtitulo: "Do botão até o número mudando no painel.",
        passos: LANCAMENTO,
        fecho: "Dez minutos de digitação valem mais que qualquer configuração.",
      }}
    />
    <Composition
      id="consultor"
      component={Clipe}
      durationInFrames={duracaoDoClipe(CONSULTOR)}
      fps={FPS}
      width={L}
      height={A}
      defaultProps={{
        titulo: "Perguntar ao consultor",
        subtitulo: "O que acontece entre a pergunta e a resposta.",
        passos: CONSULTOR,
        fecho: "O Giro calcula. A IA interpreta.",
      }}
    />
    <Composition
      id="diagnostico"
      component={Clipe}
      durationInFrames={duracaoDoClipe(DIAGNOSTICO)}
      fps={FPS}
      width={L}
      height={A}
      defaultProps={{
        titulo: "Ler o diagnóstico",
        subtitulo: "Sinal apurado de um lado, texto do outro.",
        passos: DIAGNOSTICO,
        fecho: "Diagnóstico em cima de dado furado é pior que nenhum.",
      }}
    />
  </>
);
