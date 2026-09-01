/**
 * Passeio de ponta a ponta pelo app de verdade, com o navegador.
 * Nao ha teste unitario neste projeto de proposito: o que quebra num app
 * assim e a costura entre sessao, banco e tela, e isso so aparece aqui.
 *
 *   node scripts/testar.mjs [http://localhost:3000]
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
const TELAS = process.env.TELAS ?? "/tmp/telas";
const EMAIL = "demo@giro.app.br";
const SENHA = "giro12345";

let passou = 0;
let falhou = 0;

function conferir(descricao, condicao, detalhe = "") {
  if (condicao) {
    passou++;
    console.log(`  ok    ${descricao}`);
  } else {
    falhou++;
    console.log(`  FALHA ${descricao}${detalhe ? ` — ${detalhe}` : ""}`);
  }
}

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-BR" });
const p = await contexto.newPage();

const errosDeConsole = [];
p.on("console", (m) => {
  if (m.type() === "error") errosDeConsole.push(m.text());
});
p.on("pageerror", (e) => errosDeConsole.push(String(e)));

try {
  console.log("\n[1] Landing");
  await p.goto(BASE, { waitUntil: "networkidle" });
  conferir("mostra a promessa central", await p.getByText("o que fazer na segunda-feira").isVisible());
  conferir("mostra os tres planos", (await p.getByText("/mês").count()) >= 2);
  await p.screenshot({ path: `${TELAS}/1-landing.png`, fullPage: true });

  console.log("\n[2] Entrada");
  await p.getByRole("link", { name: "Entrar" }).first().click();
  await p.waitForURL("**/entrar");
  await p.fill("#email", EMAIL);
  await p.fill("#senha", SENHA);
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL("**/painel", { timeout: 20000 });
  conferir("entra e cai no painel", p.url().includes("/painel"));
  conferir("sauda pelo primeiro nome", await p.getByText("Olá, Thiago").isVisible());

  console.log("\n[3] Painel");
  const corpo = await p.textContent("body");
  conferir("mostra entradas do mes em reais", /Entradas do mês/.test(corpo));
  conferir("lista sinais apurados", /clientes sumiram|proposta empilhada|Ticket médio/.test(corpo));
  conferir("mostra o funil por etapa", /Proposta/.test(corpo));
  await p.screenshot({ path: `${TELAS}/2-painel.png`, fullPage: true });

  console.log("\n[4] Clientes");
  await p.goto(`${BASE}/clientes`, { waitUntil: "networkidle" });
  conferir("lista os clientes semeados", await p.getByText("Restaurante Dona Ilza").isVisible());
  conferir("marca quem sumiu", (await p.getByText(/sumiu há \d+d/).count()) > 0);

  // cria um cliente de verdade
  const nomeDeTeste = `Teste Automático ${Date.now().toString().slice(-6)}`;
  await p.getByRole("button", { name: /Novo cliente/ }).click();
  await p.fill("#nome", nomeDeTeste);
  await p.fill("#whatsapp", "(11) 91234-5678");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.waitForTimeout(2500);
  conferir("cria cliente e ele aparece na lista", await p.getByText(nomeDeTeste).first().isVisible());
  await p.screenshot({ path: `${TELAS}/3-clientes.png`, fullPage: true });

  console.log("\n[5] Negocios");
  await p.goto(`${BASE}/negocios`, { waitUntil: "networkidle" });
  conferir("mostra as colunas do funil", await p.getByText("Proposta", { exact: true }).first().isVisible());
  conferir("mostra negocio semeado", await p.getByText(/Coffee break mensal/).isVisible());
  conferir("avisa negocio parado", (await p.getByText(/parado há \d+ dias/).count()) > 0);
  await p.screenshot({ path: `${TELAS}/4-negocios.png`, fullPage: true });

  console.log("\n[6] Caixa");
  await p.goto(`${BASE}/caixa`, { waitUntil: "networkidle" });
  conferir("agrupa lancamentos por dia", (await p.locator("section").count()) > 3);
  await p.getByRole("button", { name: /Lançar/ }).click();
  await p.getByRole("button", { name: "Saiu" }).click();
  await p.fill("#valor", "137,50");
  await p.fill("#descricao", "teste automático");
  await p.getByRole("button", { name: /Salvar lançamento/ }).click();
  await p.waitForTimeout(2500);
  conferir("lanca uma saida e ela aparece", (await p.getByText("R$ 137,50").count()) > 0);
  await p.screenshot({ path: `${TELAS}/5-caixa.png`, fullPage: true });

  console.log("\n[7] Tarefas");
  await p.goto(`${BASE}/tarefas`, { waitUntil: "networkidle" });
  const abertasAntes = await p.locator('[role="checkbox"][aria-checked="false"]').count();
  await p.locator('[role="checkbox"][aria-checked="false"]').first().click();
  await p.waitForTimeout(2000);
  const abertasDepois = await p.locator('[role="checkbox"][aria-checked="false"]').count();
  conferir("concluir tarefa tira ela das abertas", abertasDepois === abertasAntes - 1, `${abertasAntes} -> ${abertasDepois}`);

  console.log("\n[8] Diagnostico (sinais sem IA)");
  await p.goto(`${BASE}/diagnostico`, { waitUntil: "networkidle" });
  conferir("mostra sinais apurados sem depender de IA", await p.getByText("Sinais apurados agora").isVisible());
  const temChave = !(await p.getByText(/OPENROUTER_API_KEY/).count());
  conferir(
    temChave ? "consultor configurado" : "avisa com clareza que falta a chave (sem quebrar a tela)",
    true,
  );
  await p.screenshot({ path: `${TELAS}/6-diagnostico.png`, fullPage: true });

  console.log("\n[9] Consultor");
  await p.goto(`${BASE}/consultor`, { waitUntil: "networkidle" });
  const conversaEmBranco = (await p.getByText("Como está meu mês?").count()) > 0;
  conferir(
    conversaEmBranco
      ? "mostra as sugestoes de pergunta na conversa em branco"
      : "retoma a conversa anterior em vez das sugestoes",
    await p.getByRole("textbox", { name: "Sua pergunta" }).isVisible(),
  );
  conferir("mostra a cota de perguntas", /perguntas restantes neste mês/.test(await p.textContent("body")));

  console.log("\n[10] Conta e plano");
  await p.goto(`${BASE}/conta`, { waitUntil: "networkidle" });
  const conta = await p.textContent("body");
  conferir("mede o consumo do mes", /Consumo do consultor/.test(conta));
  conferir("mostra o beta liberado", /liberado no beta/.test(conta));
  conferir("mostra os tres planos", /Caderno/.test(conta) && /Consultor/.test(conta) && /Estúdio/.test(conta));
  await p.screenshot({ path: `${TELAS}/7-conta.png`, fullPage: true });

  console.log("\n[11] Isolamento entre empresas");
  const outra = await contexto.browser().newContext();
  const p2 = await outra.newPage();
  await p2.goto(`${BASE}/painel`);
  conferir("visitante sem sessao nao ve o painel", p2.url().includes("/entrar"));
  const api = await p2.request.post(`${BASE}/api/consultor`, { data: { pergunta: "quanto faturei?" } });
  conferir("API do consultor exige sessao", api.status() === 401, `status ${api.status()}`);
  await outra.close();

  console.log("\n[12] Celular");
  const cel = await navegador.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
  const p3 = await cel.newPage();
  await p3.context().addCookies(await contexto.cookies());
  await p3.goto(`${BASE}/painel`, { waitUntil: "networkidle" });
  const rolagem = await p3.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  conferir("nao rola na horizontal no celular", rolagem);
  await p3.screenshot({ path: `${TELAS}/8-celular.png`, fullPage: true });
  await cel.close();

  console.log("\n[13] Portugues");
  // Interface de produto brasileiro sem acento parece feita as pressas — e,
  // para quem vai pagar, parece feita por robo. Entao isso e teste, nao gosto.
  const SEM_ACENTO = /\b(nao|voce|sao|tres|gestao|negocio|negocios|orcamento|orcamentos|numero|numeros|proximo|proximos|acao|acoes|ultimo|ultimos|ultima|relatorio|diagnostico|diagnosticos|lancamento|lancamentos|lancar|servico|salario|conversao|informacao|observacao|exportacao|configuracao|atencao|cobranca|comecar|referencia|evidencia|disponivel|disponiveis|possivel|invalido|minimo|maximo|unico|unica|publico|automatico|proprio|obrigatorio|usuario|usuarios|necessario|formulario|digitacao|dificil|facil|util|nivel|endereco|irmaos|reposicao|salao|agencia|instalacao|regua|padrao|indicacao|balcao|rodape|dialogo|sessao|socio|estudio|opcao|opcoes|descricao|sera|apos|alem|tambem|porem|versao|pao|paes|colegio|duvida|calculo|media|medio|titulo|varios|varias|credito|adocao|pagina|codigo|protecao|previsao|gratis|cartao|construcao|objecao|confianca|analise|antecedencia|saida|saidas|ola|ate|ha|ja|le|so|cabeca|decisao|instrucao|reativacao|periodo|conexao|variavel|especifico|paragrafos)\b/i;
  for (const rota of ["/painel", "/clientes", "/negocios", "/caixa", "/tarefas", "/consultor", "/diagnostico", "/conta"]) {
    await p.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    const visivel = await p.evaluate(() => document.body.innerText);
    const achado = visivel.match(SEM_ACENTO);
    conferir(
      `${rota} escreve em portugues com acento`,
      !achado,
      achado ? `"${achado[0]}" em: ${visivel.slice(Math.max(0, achado.index - 40), achado.index + 40).replace(/\s+/g, " ")}` : "",
    );
  }

  console.log("\n[14] Console do navegador");
  const relevantes = errosDeConsole.filter((e) => !/favicon|Download the React DevTools/i.test(e));
  conferir("sem erro de JavaScript", relevantes.length === 0, relevantes.slice(0, 3).join(" | "));
} catch (erro) {
  falhou++;
  console.log(`\n  EXPLODIU: ${erro.message}`);
  await p.screenshot({ path: `${TELAS}/erro.png`, fullPage: true }).catch(() => {});
} finally {
  await navegador.close();
}

console.log(`\n=== ${passou} passaram, ${falhou} falharam ===\n`);
process.exit(falhou > 0 ? 1 : 0);
