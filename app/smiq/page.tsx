import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SmiqForm from "./SmiqForm";
import LangSwitcher from "../components/LangSwitcher";

export const metadata: Metadata = {
  title: "Share Your Voice — Capoeira International",
  description: "One question. Two minutes. Help shape the future of the global Capoeira community.",
};

export default async function SmiqPage() {
  const t = await getTranslations();

  return (
    <>
      <nav>
        <Link href="/" className="nav-logo">
          {t("smiq_nav.logo")}
        </Link>
        <LangSwitcher />
      </nav>
      <main className="smiq-page">
        <SmiqForm />
      </main>
    </>
  );
}
