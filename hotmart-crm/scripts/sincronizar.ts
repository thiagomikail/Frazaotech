import "dotenv/config";
import { sincronizacaoIncremental } from "../lib/ingestao/sincronizar";

/** O mesmo que o cron roda, para disparar na mao. */
sincronizacaoIncremental()
  .then((r) => {
    console.log(
      `vendas: ${r.vendas.transacoes} · assinaturas: ${r.assinaturas.total} ` +
        `(${r.assinaturas.vivas} vivas) · club: ${r.club.alunos}`,
    );
  })
  .catch((erro) => {
    console.error("❌", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
