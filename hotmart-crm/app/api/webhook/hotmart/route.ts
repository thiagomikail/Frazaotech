import { NextResponse, type NextRequest } from "next/server";
import {
  hottokValido,
  registrarBruto,
  marcarProcessado,
  processar,
  type EnvelopeWebhook,
} from "@/lib/ingestao/webhook";

/**
 * Receptor do webhook 2.0.
 *
 * Regra de ouro: responder 200 rapido. A Hotmart reentrega o que nao recebeu
 * 200, e uma fila de reentrega e pior que um erro registrado — por isso o
 * payload cru e gravado primeiro e o processamento acontece depois, com o
 * erro guardado na linha em vez de virar um 500.
 */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const hottok = req.headers.get("x-hotmart-hottok") ?? req.headers.get("X-HOTMART-HOTTOK");

  let envelope: EnvelopeWebhook;
  try {
    envelope = (await req.json()) as EnvelopeWebhook;
  } catch {
    return NextResponse.json({ erro: "corpo invalido" }, { status: 400 });
  }

  // O hottok pode vir no cabecalho (2.0) ou no corpo (formato antigo).
  if (!hottokValido(hottok ?? envelope.hottok)) {
    return NextResponse.json({ erro: "hottok invalido" }, { status: 401 });
  }

  const novo = await registrarBruto(envelope);
  if (!novo) return NextResponse.json({ ok: true, nota: "evento ja processado" });

  const id = envelope.id ?? "";
  try {
    const resultado = await processar(envelope);
    if (id) await marcarProcessado(id);
    return NextResponse.json({ ok: true, resultado });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    if (id) await marcarProcessado(id, mensagem);
    // 200 de proposito: o payload esta salvo e reprocessavel. Devolver 500
    // faria a Hotmart reentregar o mesmo evento que ja esta no banco.
    return NextResponse.json({ ok: false, erro: mensagem });
  }
}
