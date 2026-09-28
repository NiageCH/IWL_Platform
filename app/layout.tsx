import type { Metadata } from "next";
import { Montserrat, Roboto_Mono, Zalando_Sans_Expanded } from "next/font/google";
import "./globals.css";

/**
 * La tipografía de titulares de inceptionwomanlab.es.
 *
 * Expandida y pesada, en mayúsculas y muy apretada: es lo que da a la marca
 * su cara, más que el color, que la plataforma ya compartía. Se usa solo en
 * los titulares grandes —el nombre de un proyecto, el título de un informe—
 * porque en un texto largo o en una tabla densa cansa la vista.
 */
const zalando = Zalando_Sans_Expanded({
  variable: "--font-titular",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plataforma IWL",
  description:
    "Business plan vivo, due diligence vivo y seguimiento de la cohorte de Inception Woman Lab.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${zalando.variable} ${montserrat.variable} ${robotoMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
