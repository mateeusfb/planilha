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
<<<<<<< HEAD
  title: "Finanças Família - Controle de Gastos",
  description: "Controle inteligente de gastos familiares",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Finanças" },
=======
  title: "Folga - Controle Financeiro",
  description: "Controle financeiro, para você ter uma folga",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#2563eb",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Folga" },
>>>>>>> 17dc23cfc80f041f9b495fc03e6542bd9814bb80
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
