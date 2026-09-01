/**
 * Semeia uma empresa de demonstracao com seis meses de historia plausivel.
 *
 * Nao e enfeite: sem dado real o agente nao tem o que ler, e a demonstracao
 * vira uma tela bonita e vazia. Os numeros abaixo foram montados para que os
 * sinais de verdade disparem — cliente que sumiu, proposta empilhada, ticket
 * caindo, categoria "Outros" inchada e o funil sem nenhuma perda marcada.
 *
 * Rode com: npm run db:semear
 */

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import "dotenv/config";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const EMAIL = "demo@giro.app.br";
const SENHA = "giro12345";

// Aleatorio com semente: a demonstracao precisa ser a mesma toda vez.
let semente = 20260901;
function sorte(): number {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
}
function entre(min: number, max: number): number {
  return Math.floor(sorte() * (max - min + 1)) + min;
}
function haDias(dias: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - dias);
  return d;
}

const CLIENTES = [
  { nome: "Restaurante Dona Ilza", origem: "indicação", ativo: true, porte: 3 },
  { nome: "Café da Esquina", origem: "passou na porta", ativo: true, porte: 2 },
  { nome: "Buffet Alvorada", origem: "indicação", ativo: true, porte: 4 },
  { nome: "Mercearia São Bento", origem: "google", ativo: true, porte: 2 },
  { nome: "Hotel Bandeirantes", origem: "instagram", ativo: true, porte: 4 },
  { nome: "Padaria do Zé", origem: "indicação", ativo: true, porte: 1 },
  { nome: "Colégio Monte Alto", origem: "indicação", ativo: false, porte: 4 }, // sumiu
  { nome: "Lanchonete Três Irmãos", origem: "passou na porta", ativo: false, porte: 2 }, // sumiu
  { nome: "Empresa Vale Verde", origem: "google", ativo: false, porte: 3 }, // sumiu
  { nome: "Cantina da Vovó", origem: "instagram", ativo: false, porte: 1 }, // sumiu
  { nome: "Espaço Jardim Eventos", origem: "indicação", ativo: true, porte: 3 },
  { nome: "Bar do Meio", origem: "passou na porta", ativo: true, porte: 1 },
];

async function main() {
  console.log("Limpando a empresa de demonstracao anterior...");
  const antigo = await db.usuario.findUnique({ where: { email: EMAIL } });
  if (antigo) {
    // Cascade em Empresa derruba tudo o que pendura nela.
    await db.empresa.delete({ where: { id: antigo.empresaId } });
  }

  console.log("Criando empresa e usuário...");
  const usuario = await db.usuario.create({
    data: {
      nome: "Thiago Frazão",
      email: EMAIL,
      senhaHash: await bcrypt.hash(SENHA, 10),
      papel: "DONO",
      empresa: {
        create: {
          nome: "Panificadora São Jorge",
          segmento: "padaria e fornecimento para restaurantes",
          criadaEm: haDias(210),
        },
      },
    },
    include: { empresa: true },
  });
  const empresaId = usuario.empresaId;

  console.log("Criando clientes...");
  const criados = [];
  for (const c of CLIENTES) {
    // Dois clientes ficam sem contato de proposito: o sinal "clientes sem
    // WhatsApp nem e-mail" precisa existir para a demonstracao mostrar que o
    // consultor tambem cobra a qualidade do registro.
    const semContato = c.nome === "Bar do Meio" || c.nome === "Cantina da Vovó";
    criados.push(
      await db.cliente.create({
        data: {
          empresaId,
          nome: c.nome,
          whatsapp: semContato ? null : `(11) 9${entre(1000, 9999)}-${entre(1000, 9999)}`,
          email: semContato ? null : `contato@${c.nome.toLowerCase().replace(/[^a-z]/g, "")}.com.br`,
          origem: c.origem,
          criadoEm: haDias(entre(60, 200)),
        },
      }),
    );
  }

  console.log("Criando lançamentos de caixa (6 meses)...");
  const lancamentos: {
    empresaId: string;
    tipo: "ENTRADA" | "SAIDA";
    valorCentavos: number;
    categoria: string;
    descricao: string | null;
    data: Date;
    clienteId: string | null;
  }[] = [];

  for (let dia = 178; dia >= 0; dia--) {
    const data = haDias(dia);
    if (data.getDay() === 0) continue; // domingo fechado

    // Entradas: 2 a 5 por dia. O ticket encolhe no periodo recente — e o que
    // faz o sinal "ticket médio caiu" aparecer com evidencia de verdade.
    const encolhimento = dia < 90 ? 0.78 : 1;
    // Os quatro inativos saem do sorteio nos ultimos 70 dias — e assim que
    // eles "somem" sem deixar os dias recentes vazios.
    const elegiveis = dia < 70 ? CLIENTES.filter((c) => c.ativo) : CLIENTES;

    for (let i = 0, n = entre(2, 5); i < n; i++) {
      const c = elegiveis[entre(0, elegiveis.length - 1)];
      const cliente = criados[CLIENTES.indexOf(c)];
      const base = c.porte * 18000;
      lancamentos.push({
        empresaId,
        tipo: "ENTRADA",
        valorCentavos: Math.round((base + entre(-6000, 9000)) * encolhimento),
        categoria: sorte() > 0.25 ? "Venda" : "Serviço",
        descricao: null,
        data,
        clienteId: cliente.id,
      });
    }

    // Saidas: fornecedor quase diario, fixas no comeco do mes.
    if (sorte() > 0.35) {
      lancamentos.push({
        empresaId,
        tipo: "SAIDA",
        // O ultimo mes leva um estouro de fornecedor: e a historia que o
        // consultor precisa achar sozinho.
        valorCentavos: dia < 28 ? entre(28000, 62000) : entre(18000, 41000),
        categoria: "Fornecedor",
        descricao: "farinha, fermento, embalagem",
        data,
        clienteId: null,
      });
    }
    if (data.getDate() === 5) {
      lancamentos.push({ empresaId, tipo: "SAIDA", valorCentavos: 480000, categoria: "Aluguel", descricao: null, data, clienteId: null });
      lancamentos.push({ empresaId, tipo: "SAIDA", valorCentavos: 1120000, categoria: "Salário", descricao: "3 funcionários", data, clienteId: null });
      lancamentos.push({ empresaId, tipo: "SAIDA", valorCentavos: entre(60000, 95000), categoria: "Imposto", descricao: null, data, clienteId: null });
    }
    // Uma fatia grande vai para "Outros": o sinal de categoria precisa existir.
    if (sorte() > 0.55) {
      lancamentos.push({
        empresaId,
        tipo: "SAIDA",
        valorCentavos: entre(3000, 17000),
        categoria: "Outros",
        descricao: null,
        data,
        clienteId: null,
      });
    }
  }

  await db.lancamento.createMany({ data: lancamentos });
  console.log(`  ${lancamentos.length} lançamentos.`);

  console.log("Criando negócios...");
  const negocios = [
    { titulo: "Fornecimento semanal de pães - 40 unidades/dia", valor: 480000, etapa: "PROPOSTA", cliente: 4, dias: 22 },
    { titulo: "Bolos para formatura de dezembro", valor: 320000, etapa: "PROPOSTA", cliente: 6, dias: 31 },
    { titulo: "Coffee break mensal - contrato anual", valor: 960000, etapa: "PROPOSTA", cliente: 10, dias: 18 },
    { titulo: "Salgados para evento corporativo", valor: 145000, etapa: "PROPOSTA", cliente: 8, dias: 41 },
    { titulo: "Reposição de sobremesas", valor: 88000, etapa: "CONTATO", cliente: 0, dias: 6 },
    { titulo: "Cesta de natal para funcionários", valor: 260000, etapa: "CONTATO", cliente: 8, dias: 9 },
    { titulo: "Teste de croissant congelado", valor: 55000, etapa: "NOVO", cliente: 1, dias: 2 },
    { titulo: "Pão de forma sem glúten - linha nova", valor: 175000, etapa: "NOVO", cliente: 3, dias: 4 },
    { titulo: "Fornecimento de brioche", valor: 210000, etapa: "GANHO", cliente: 2, dias: 48 },
    { titulo: "Kit café da manha - 60 unidades", valor: 132000, etapa: "GANHO", cliente: 4, dias: 66 },
    { titulo: "Encomenda de tortas", valor: 74000, etapa: "GANHO", cliente: 0, dias: 84 },
  ];

  for (const n of negocios) {
    const fechado = n.etapa === "GANHO" || n.etapa === "PERDIDO";
    await db.negocio.create({
      data: {
        empresaId,
        clienteId: criados[n.cliente].id,
        titulo: n.titulo,
        valorCentavos: n.valor,
        etapa: n.etapa as "NOVO",
        criadoEm: haDias(n.dias + 5),
        atualizadoEm: haDias(n.dias),
        fechadoEm: fechado ? haDias(n.dias) : null,
      },
    });
  }
  // Tres negocios sem valor preenchido: mais um sinal de qualidade de registro.
  for (const titulo of ["Orçamento pedido por telefone", "Pedido do salão da esquina", "Consulta sobre bolo de casamento"]) {
    await db.negocio.create({
      data: { empresaId, titulo, valorCentavos: 0, etapa: "NOVO", criadoEm: haDias(entre(3, 12)) },
    });
  }

  console.log("Criando tarefas...");
  await db.tarefa.createMany({
    data: [
      { empresaId, titulo: "Cobrar resposta do Hotel Bandeirantes", prazo: haDias(4), origem: "MANUAL" },
      { empresaId, titulo: "Renegociar preço da farinha com o fornecedor", prazo: haDias(-3), origem: "MANUAL" },
      { empresaId, titulo: "Conferir o estoque de embalagem", prazo: haDias(-9), origem: "MANUAL" },
      { empresaId, titulo: "Fechar o mês com a contadora", prazo: haDias(-1), origem: "MANUAL" },
      { empresaId, titulo: "Levar amostra no Café da Esquina", prazo: haDias(2), feita: true, feitaEm: haDias(2), origem: "MANUAL" },
    ],
  });

  console.log("Registrando telemetria de uso...");
  await db.evento.createMany({
    data: Array.from({ length: 40 }, (_, i) => ({
      empresaId,
      usuarioId: usuario.id,
      tipo: ["sessao.aberta", "lancamento.criado", "cliente.criado", "negocio.movido"][i % 4],
      criadoEm: haDias(entre(1, 60)),
    })),
  });

  console.log("\nPronto.");
  console.log(`  entrar com: ${EMAIL}`);
  console.log(`  senha:      ${SENHA}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
