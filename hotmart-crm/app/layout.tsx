import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Hotmart",
  description: "Painel de analytics e CRM do negocio na Hotmart.",
  // Dado pessoal de comprador nao entra em indice de busca nenhum.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
