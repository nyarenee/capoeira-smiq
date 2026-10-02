import type { Metadata } from "next";
import { Raleway, Carlito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { LANGUAGES } from "@/lib/reference-data";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const carlito = Carlito({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-body-raw",
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
    <html lang={locale} dir={dir} className={`${raleway.variable} ${carlito.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
