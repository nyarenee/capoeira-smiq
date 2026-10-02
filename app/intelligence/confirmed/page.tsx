import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import ConfirmedContent from "./ConfirmedContent";
import LangSwitcher from "../../components/LangSwitcher";

export default async function ConfirmedPage() {
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
        <Suspense>
          <ConfirmedContent />
        </Suspense>
      </main>
    </>
  );
}
