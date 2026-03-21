import type { Metadata, Viewport } from "next";
import { Montserrat, Roboto } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["500", "600", "700", "800", "900"] });
const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto", weight: ["300", "400", "500", "700"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  title: "Finanças Família - Controle de Gastos",
  description: "Controle inteligente de gastos familiares",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Finanças" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${montserrat.variable} ${roboto.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
