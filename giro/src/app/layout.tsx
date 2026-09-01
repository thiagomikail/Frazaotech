import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Giro — gestão com um consultor de IA junto",
    template: "%s · Giro",
  },
  description:
    "Clientes, funil de vendas e caixa num lugar so — e um consultor de IA que le seus números e diz o próximo passo.",
};

export const viewport: Viewport = {
  themeColor: "#d9531e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
