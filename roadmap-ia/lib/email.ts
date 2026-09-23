import "server-only";
import nodemailer from "nodemailer";

/**
 * Envio por SMTP. Padrão: Gmail com senha de app (Conta Google → Segurança →
 * Senhas de app). Sem conta nova, sem serviço novo. O Gmail aguenta ~500
 * envios/dia — folga grande pra uma turma.
 *
 * Trocar por Resend/SendGrid é só mudar SMTP_HOST/PORT/USER/PASS: os dois
 * falam SMTP.
 */

let transporte: nodemailer.Transporter | null = null;

function smtp() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("SMTP_USER/SMTP_PASS não definidos. Veja .env.example.");
  transporte ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user, pass },
  });
  return transporte;
}

export async function enviarEmail(para: string, assunto: string, html: string, texto: string) {
  const de = process.env.EMAIL_DE ?? `Go Agentes · Roadmap de IA <${process.env.SMTP_USER}>`;
  await smtp().sendMail({
    from: de,
    to: para,
    bcc: process.env.EMAIL_COPIA || undefined,
    replyTo: process.env.EMAIL_RESPONDER || undefined,
    subject: assunto,
    html,
    text: texto,
  });
}
