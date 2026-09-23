import type { Analise } from "./analise-tipo";
import { AREAS, BLOCOS, rotuloDe, type Respostas } from "./perguntas";
import { NOMES_RESTRICAO, type Pontuacao } from "./pontuacao";

/**
 * O relatório como e-mail. É a ÚNICA forma de o aluno ver o resultado — o site
 * não mostra relatório pra ninguém além do admin.
 *
 * HTML de e-mail é de 2005: tabela, estilo inline, 600px, nada de flex nem de
 * classe. Tudo que veio do aluno ou do modelo passa por `esc()` — o texto livre
 * vai parar na caixa de entrada de alguém.
 */

const C = { preto: "#1C1C1E", papel: "#F2F0EC", tinta: "#2C3E50", ouro: "#C8A84E", coral: "#D94F4F", oliva: "#8B9A46", cinza: "#6b7785" };
const FONTE = "Montserrat, Arial, Helvetica, sans-serif";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const p = (t: string, extra = "") => `<p style="margin:0 0 12px;font:15px/1.6 ${FONTE};color:${C.tinta};${extra}">${t}</p>`;
const h2 = (t: string) => `<h2 style="margin:32px 0 14px;font:700 20px/1.3 ${FONTE};color:${C.preto};">${esc(t)}</h2>`;
const rotulo = (t: string, cor: string = C.cinza) =>
  `<div style="font:700 11px/1.4 ${FONTE};letter-spacing:.08em;text-transform:uppercase;color:${cor};margin:10px 0 2px;">${esc(t)}</div>`;
const caixa = (conteudo: string, borda: string, lado: "left" | "top" = "left") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;"><tr><td style="background:#fff;border-${lado}:4px solid ${borda};padding:18px 20px;">${conteudo}</td></tr></table>`;

export function emailRelatorio(d: {
  nome: string | null;
  agencia: string | null;
  analise: Analise;
  pontuacao: Pontuacao;
  respostas: Respostas;
}): { assunto: string; html: string; texto: string } {
  const { analise: a, pontuacao: pt } = d;
  const max = Math.max(...pt.frentes.map((f) => f.valor), 0.01);

  const corpo = [
    h2("Onde a IA adiciona mais valor"),
    caixa(
      `<div style="font:700 18px/1.35 ${FONTE};color:${C.preto};margin-bottom:10px;">${esc(a.ondeMaisValor.area)}</div>` +
        p(esc(a.ondeMaisValor.porque)) +
        rotulo("O que nas suas respostas sustenta isso") +
        `<ul style="margin:6px 0 12px;padding-left:20px;font:15px/1.6 ${FONTE};color:${C.tinta};">${a.ondeMaisValor.evidencias.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` +
        p(`<strong>Ganho esperado:</strong> ${esc(a.ondeMaisValor.ganhoEsperado)}`, "margin:0;"),
      C.ouro,
    ),

    h2("O que NÃO fazer agora"),
    ...a.naoFazerAgora.map((n) =>
      caixa(`<div style="font:700 15px/1.4 ${FONTE};color:${C.preto};margin-bottom:6px;">${esc(n.tema)}</div>` + p(esc(n.porque), "margin:0;"), C.coral, "top"),
    ),

    h2("Verdades incômodas"),
    ...a.verdadesIncomodas.map((v) => caixa(p(esc(v), "margin:0;"), C.preto)),

    h2("Roadmap de 90 dias"),
    ...a.roadmap.map(
      (f) =>
        `<div style="border-bottom:2px solid ${C.preto};padding-bottom:6px;margin:24px 0 8px;font:700 17px/1.3 ${FONTE};color:${C.preto};">${esc(f.nome)} <span style="font-weight:600;font-size:13px;color:${C.cinza};">· ${esc(f.prazo)}</span></div>` +
        p(`<em>${esc(f.objetivo)}</em>`) +
        f.acoes
          .map((ac) =>
            caixa(
              `<div style="font:700 15px/1.4 ${FONTE};color:${C.preto};margin-bottom:6px;">${esc(ac.acao)}</div>` +
                p(esc(ac.como)) +
                rotulo("Ferramenta") + p(esc(ac.ferramenta), "margin:0;") +
                rotulo("Esforço") + p(esc(ac.horasSemana), "margin:0;") +
                rotulo("Deu certo se", C.oliva) + p(esc(ac.sucesso), "margin:0;") +
                rotulo("Pare se", C.coral) + p(esc(ac.parar), "margin:0;"),
              C.papel,
            ),
          )
          .join(""),
    ),

    h2("Comece a medir hoje"),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;font:14px/1.5 ${FONTE};color:${C.tinta};">
      <tr style="background:${C.preto};color:#fff;"><td style="padding:10px;font-weight:700;">Métrica</td><td style="padding:10px;font-weight:700;">Como medir</td><td style="padding:10px;font-weight:700;">Hoje</td></tr>
      ${a.metricas.map((m) => `<tr><td style="padding:10px;border-top:1px solid #e5e2dc;font-weight:700;vertical-align:top;">${esc(m.nome)}</td><td style="padding:10px;border-top:1px solid #e5e2dc;vertical-align:top;">${esc(m.comoMedir)}</td><td style="padding:10px;border-top:1px solid #e5e2dc;vertical-align:top;">${esc(m.hoje)}</td></tr>`).join("")}
    </table>`,

    h2("Riscos deste plano"),
    ...a.riscos.map((r) => caixa(p(`<strong>${esc(r.risco)}</strong>`, "margin:0 0 4px;") + p(`→ ${esc(r.mitigacao)}`, "margin:0;font-size:14px;"), C.papel)),

    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;"><tr><td style="background:${C.preto};padding:24px;">
      <div style="font:400 11px/1.4 ${FONTE};letter-spacing:.3em;text-transform:uppercase;color:${C.ouro};margin-bottom:10px;">Pra levar pra casa</div>
      <div style="font:700 18px/1.4 ${FONTE};color:#fff;">${esc(a.pergunta)}</div>
    </td></tr></table>`,

    h2("Os números por trás"),
    p(`Gargalo que as respostas mostram: <strong>${esc(NOMES_RESTRICAO[pt.restricao])}</strong><br>Horas/semana nas 7 frentes: <strong>${pt.horasTotais.toFixed(0)}h</strong> (teto otimista liberável ~${pt.horasLiberaveisTotais.toFixed(0)}h)<br>Prontidão: <strong>${esc(pt.prontidao.rotulo)}</strong>`),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:8px 0;">
      ${pt.frentes
        .map((f, i) => {
          const w = Math.max(2, Math.round((f.valor / max) * 100));
          return `<tr><td style="padding:8px 16px 2px;font:${i === 0 ? 700 : 400} 13px/1.4 ${FONTE};color:${C.tinta};">${esc(AREAS[f.area].nome)} <span style="color:${C.cinza};font-weight:400;">· ${f.horas}h → ~${f.horasLiberaveis.toFixed(1)}h</span></td></tr>
          <tr><td style="padding:0 16px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="${w}%" style="height:8px;background:${i === 0 ? C.ouro : "#9aa5b1"};font-size:0;line-height:0;">&nbsp;</td><td style="background:#f0eee9;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>`;
        })
        .join("")}
    </table>`,
    ...pt.alertas.map((al) => caixa(p(esc(al.texto), "margin:0;font-size:14px;"), al.nivel === "critico" ? C.coral : C.ouro)),

    h2("Suas respostas"),
    ...BLOCOS.map(
      (b) =>
        rotulo(b.titulo) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;margin:4px 0 16px;font:13px/1.5 ${FONTE};color:${C.tinta};">${b.perguntas
          .map((q) => `<tr><td style="padding:8px 12px;border-top:1px solid #eee;color:${C.cinza};vertical-align:top;width:50%;">${esc(q.titulo)}</td><td style="padding:8px 12px;border-top:1px solid #eee;font-weight:700;vertical-align:top;">${esc(rotuloDe(q, d.respostas[q.id])).replace(/\n/g, "<br>")}</td></tr>`)
          .join("")}</table>`,
    ),
  ].join("\n");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Roadmap de IA</title></head>
<body style="margin:0;padding:0;background:${C.papel};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(a.veredito.slice(0, 140))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.papel};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:${C.preto};padding:28px 24px;">
    <div style="font:400 11px/1.4 ${FONTE};letter-spacing:.3em;text-transform:uppercase;color:${C.ouro};margin-bottom:14px;">Go Agentes · Roadmap de IA</div>
    <div style="font:800 24px/1.2 ${FONTE};text-transform:uppercase;color:#fff;">${esc(d.agencia ?? "Sua agência")}</div>
    ${d.nome ? `<div style="font:400 14px/1.4 ${FONTE};color:#bbb;margin-top:4px;">${esc(d.nome)}</div>` : ""}
    <div style="font:400 17px/1.55 ${FONTE};color:#fff;margin-top:20px;">${esc(a.veredito)}</div>
  </td></tr>
  <tr><td style="padding:4px 4px 24px;">${corpo}</td></tr>
  <tr><td style="padding:16px 4px;font:12px/1.5 ${FONTE};color:${C.cinza};border-top:1px solid #dcd8d0;">
    Análise gerada a partir das suas respostas, com apoio de IA e revisão crítica por regras fixas. É um ponto de partida para decisão, não uma consultoria.
  </td></tr>
</table></td></tr></table></body></html>`;

  const texto = [
    `ROADMAP DE IA — ${d.agencia ?? ""}`,
    "",
    a.veredito,
    "",
    `ONDE A IA ADICIONA MAIS VALOR: ${a.ondeMaisValor.area}`,
    a.ondeMaisValor.porque,
    ...a.ondeMaisValor.evidencias.map((e) => `- ${e}`),
    `Ganho esperado: ${a.ondeMaisValor.ganhoEsperado}`,
    "",
    "O QUE NÃO FAZER AGORA",
    ...a.naoFazerAgora.map((n) => `- ${n.tema}: ${n.porque}`),
    "",
    "VERDADES INCÔMODAS",
    ...a.verdadesIncomodas.map((v) => `- ${v}`),
    "",
    "ROADMAP",
    ...a.roadmap.flatMap((f) => [
      `${f.nome} (${f.prazo}) — ${f.objetivo}`,
      ...f.acoes.map((ac) => `  * ${ac.acao}\n    ${ac.como}\n    Deu certo se: ${ac.sucesso}\n    Pare se: ${ac.parar}`),
    ]),
    "",
    a.pergunta,
  ].join("\n");

  return { assunto: `Seu roadmap de IA — ${d.agencia ?? "sua agência"}`, html, texto };
}
