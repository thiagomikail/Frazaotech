#!/usr/bin/env node
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const derivar = promisify(scrypt);

/**
 * Gera os tres segredos do .env de uma vez.
 * Uso: npm run gerar:segredos -- "sua senha do painel"
 */
const senha = process.argv[2];

if (!senha) {
  console.error('Uso: npm run gerar:segredos -- "sua senha do painel"');
  process.exit(1);
}

const sal = randomBytes(16).toString("hex");
const hash = (await derivar(senha, sal, 64)).toString("hex");

console.log("\nCole no .env (e nas variaveis de ambiente da Vercel):\n");
console.log(`PAINEL_SENHA_HASH="scrypt$${sal}$${hash}"`);
console.log(`SESSAO_SEGREDO="${randomBytes(32).toString("hex")}"`);
console.log(`CRON_SECRET="${randomBytes(24).toString("hex")}"`);
console.log("\nA senha em si nao fica guardada em lugar nenhum — so este hash.\n");
