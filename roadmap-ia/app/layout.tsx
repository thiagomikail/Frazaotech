import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Roadmap de IA · Go Agentes",
  description: "Onde a IA adiciona mais valor na sua agência de viagens — e onde ela só dá trabalho.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1c1c1e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
