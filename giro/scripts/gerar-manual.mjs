/**
 * Monta manual/manual.html embutindo as capturas como data: URI.
 *
 * O manual e publicado como uma pagina unica, sem servidor de imagem, entao
 * cada captura entra no proprio arquivo. O template fica legivel no
 * repositorio; o arquivo gerado, nao — por isso os dois existem.
 *
 *   node scripts/gerar-manual.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";

const template = readFileSync("manual/manual.template.html", "utf8");

const ALTERNATIVOS = {
  "01-landing": "A página inicial do Giro",
  "02-criar-conta": "Formulário de criação de conta com nome, empresa, ramo, e-mail e senha",
  "03-entrar": "Tela de entrada com e-mail e senha",
  "04-painel": "Painel com os números do mês, sinais de atenção, funil, tarefas e últimos lançamentos",
  "05-clientes": "Lista de clientes ordenada por valor gasto, com aviso de quem parou de comprar",
  "06-cliente-formulario": "Formulário de cadastro de cliente",
  "07-negocios": "Funil de vendas em três colunas: Novo, Em contato e Proposta",
  "08-negocio-formulario": "Formulário de negócio com a etapa Perdido selecionada e o campo de motivo",
  "09-caixa": "Caixa com entradas e saídas agrupadas por dia",
  "10-caixa-formulario": "Formulário de novo lançamento de saída",
  "11-tarefas": "Lista de tarefas abertas e concluídas",
  "12-consultor-vazio": "Consultor com sugestões de pergunta",
  "13-consultor": "Consultor respondendo com valores tirados do cadastro",
  "14-diagnostico": "Diagnóstico com resumo, próximos passos, achados e sinais apurados",
  "15-conta": "Tela de conta com medidores de consumo e os três planos",
  "16-celular-painel": "O painel no celular",
  "17-celular-lancar": "O formulário de lançamento no celular",
};

const usados = new Set();
let saida = template.replace(/\{\{IMG:([\w-]+)\}\}/g, (_, nome) => {
  const caminho = `manual/web/${nome}.webp`;
  if (!existsSync(caminho)) {
    throw new Error(`captura faltando: ${caminho} — rode 'node scripts/capturar-telas.mjs' antes`);
  }
  usados.add(nome);
  const dados = readFileSync(caminho).toString("base64");
  const alt = ALTERNATIVOS[nome] ?? nome;
  return `<img src="data:image/webp;base64,${dados}" alt="${alt}" loading="lazy" decoding="async">`;
});

// Videos entram se existirem; o manual funciona sem eles.
const VIDEOS = [
  { arquivo: "manual/video/saida/tour.mp4", titulo: "Visão geral em 30 segundos", legenda: "Os quatro registros e onde cada um vive." },
  { arquivo: "manual/video/saida/primeiro-lancamento.mp4", titulo: "Lançar no caixa", legenda: "Do botão Lançar até o número mudando no painel." },
  { arquivo: "manual/video/saida/consultor.mp4", titulo: "Perguntar ao consultor", legenda: "O que acontece entre a pergunta e a resposta." },
  { arquivo: "manual/video/saida/diagnostico.mp4", titulo: "Ler o diagnóstico", legenda: "Sinal apurado de um lado, texto do outro." },
];

const disponiveis = VIDEOS.filter((v) => existsSync(v.arquivo));
if (disponiveis.length > 0) {
  const blocos = disponiveis
    .map((v) => {
      const dados = readFileSync(v.arquivo).toString("base64");
      return `        <figure style="margin-top:0">
          <video controls preload="metadata" playsinline aria-label="${v.titulo}">
            <source src="data:video/mp4;base64,${dados}" type="video/mp4">
          </video>
          <figcaption><strong>${v.titulo}</strong> — ${v.legenda}</figcaption>
        </figure>`;
    })
    .join("\n");

  const secao = `
    <!-- ============================================================ 14 -->
    <section id="videos">
      <span class="num">14</span>
      <h2>Em vídeo</h2>
      <p>
        Quatro clipes curtos, sem áudio, para quem prefere ver a assistir a ler. Cada um
        cobre um caminho inteiro, do primeiro clique ao resultado na tela.
      </p>
      <div class="videos">
${blocos}
      </div>
    </section>
`;
  saida = saida.replace("  </main>", `${secao}  </main>`);
  saida = saida.replace(
    '<li><a href="#duvidas"><b>13</b> Dúvidas</a></li>',
    '<li><a href="#duvidas"><b>13</b> Dúvidas</a></li>\n      <li><a href="#videos"><b>14</b> Em vídeo</a></li>',
  );
}

writeFileSync("manual/manual.html", saida);

const naoUsados = readdirSync("manual/web")
  .map((f) => f.replace(".webp", ""))
  .filter((n) => !usados.has(n));

const tamanho = Buffer.byteLength(saida) / 1024 / 1024;
console.log(`manual/manual.html — ${tamanho.toFixed(2)} MB`);
console.log(`  ${usados.size} capturas embutidas, ${disponiveis.length} videos`);
if (naoUsados.length) console.log(`  capturas nao usadas: ${naoUsados.join(", ")}`);
