import type { Metadata } from "next";
import { Spectral, EB_Garamond, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { LANGUAGES } from "@/lib/reference-data";
import "./globals.css";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Capoeira International — Your Voice Shapes What's Next",
  description:
    "A community research initiative gathering the single biggest challenges of capoeiristas worldwide. One question. Every voice counts.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const dir = LANGUAGES.find((l) => l.code === locale)?.dir ?? "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${spectral.variable} ${ebGaramond.variable} ${jetbrains.variable}`}
    >
      <body>
        <NextIntlClientProvider>
          <div className="glow-top" />
          <div className="glow-bottom" />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
