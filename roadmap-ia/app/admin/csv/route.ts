import { todos } from "@/lib/diagnosticos";
import { TODAS_PERGUNTAS, rotuloDe } from "@/lib/perguntas";
import { ehAdmin } from "@/lib/sessao";

/** Uma linha por diagnóstico, uma coluna por pergunta — abre direto no Excel. */
export async function GET() {
  if (!(await ehAdmin())) return new Response(null, { status: 404 });

  const lista = await todos(5000);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const cabecalho = ["data", "email", "nome", "agencia", ...TODAS_PERGUNTAS.map((p) => p.id), "gargalo", "frente_top", "ia_onde_mais_valor", "ia_veredito", "enviado_em", "link"];
  const linhas = lista.map((d) => [
    d.criado_em.toISOString(), d.email, d.nome, d.agencia,
    ...TODAS_PERGUNTAS.map((p) => rotuloDe(p, d.respostas[p.id])),
    d.pontuacao.restricao, d.pontuacao.frentes[0]?.area, d.analise?.ondeMaisValor.area, d.analise?.veredito, d.enviado_em?.toISOString() ?? "", `/relatorio/${d.id}`,
  ]);

  // BOM + ponto e vírgula: o Excel em pt-BR abre sem assistente de importação.
  const csv = "﻿" + [cabecalho, ...linhas].map((l) => l.map(esc).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="roadmap-ia-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
