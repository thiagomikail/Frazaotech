/**
 * Espelho do OpenRouter: fala o mesmo protocolo (/chat/completions), mas
 * responde localmente e de graca.
 *
 * Existe por dois motivos. O primeiro e poder exercitar o laco do agente —
 * pede ferramenta, recebe resultado, responde — sem rede e sem custo. O
 * segundo e mais importante: ele PROVA que o consultor nao inventa numero,
 * porque este espelho nao sabe nada sobre a empresa. Tudo que ele devolve
 * saiu do resultado das ferramentas, que vieram do banco.
 *
 *   node scripts/espelho-ia.mjs 4545
 */
import { createServer } from "node:http";

const porta = Number(process.argv[2] ?? 4545);

createServer((req, res) => {
  let corpo = "";
  req.on("data", (p) => (corpo += p));
  req.on("end", () => {
    const pedido = JSON.parse(corpo || "{}");
    const mensagens = pedido.messages ?? [];
    const jaChamouFerramenta = mensagens.some((m) => m.role === "tool");

    let escolha;

    if (pedido.response_format?.type === "json_schema") {
      // Diagnostico: o retrato veio no prompt; devolvemos a forma esperada.
      const retrato = JSON.parse(
        (mensagens.at(-1)?.content ?? "").match(/\{[\s\S]*\}/)?.[0] ?? "{}",
      );
      const sinais = retrato.sinais ?? [];
      escolha = {
        message: {
          content: JSON.stringify({
            resumo: `Espelho local lendo ${sinais.length} sinais de ${retrato.empresa?.nome ?? "?"}.`,
            achados: sinais.slice(0, 3).map((s) => ({
              titulo: s.titulo,
              gravidade: s.gravidade,
              evidencia: s.evidencia,
            })),
            proximosPassos: sinais.slice(0, 3).map((s) => ({
              titulo: `Resolver: ${s.titulo}`,
              porque: s.evidencia,
              esforco: "1 hora",
            })),
          }),
        },
      };
    } else if (!jaChamouFerramenta && pedido.tools?.length) {
      // Primeira volta: pede o retrato, como o modelo de verdade faria.
      escolha = {
        message: {
          content: null,
          tool_calls: [
            {
              id: "chamada_1",
              type: "function",
              function: { name: "retrato_do_negocio", arguments: "{}" },
            },
          ],
        },
      };
    } else {
      // Segunda volta: responde citando SO o que veio da ferramenta.
      const doBanco = JSON.parse(mensagens.filter((m) => m.role === "tool").at(-1)?.content ?? "{}");
      const brl = (c) =>
        ((c ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      escolha = {
        message: {
          content:
            `Entraram ${brl(doBanco.caixa?.entradasMes)} e saíram ${brl(doBanco.caixa?.saidasMes)} neste mês, ` +
            `deixando ${brl(doBanco.caixa?.saldoMes)}. Há ${doBanco.sinais?.length ?? 0} sinais abertos; ` +
            `o primeiro é "${doBanco.sinais?.[0]?.titulo ?? "nenhum"}".\n\n` +
            `Esta semana: ${doBanco.clientes?.parados?.[0]?.nome ?? "ninguém"} não compra há ` +
            `${doBanco.clientes?.parados?.[0]?.diasSemComprar ?? 0} dias — mande uma mensagem hoje.`,
        },
      };
    }

    const resposta = {
      choices: [escolha],
      usage: { prompt_tokens: 900, completion_tokens: 180 },
      model: "espelho/local",
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(resposta));
  });
}).listen(porta, () => console.log(`espelho de IA na porta ${porta}`));
