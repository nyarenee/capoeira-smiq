"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ConfirmedContent() {
  const params = useSearchParams();
  const expired = params.get("expired") === "1";
  const t = useTranslations();

  if (expired) {
    return (
      <div className="card" id="main-card">
        <div id="success-screen">
          <div className="axe-heading" id="success-heading">
            {t("confirmed.expired_heading")}
          </div>
          <p className="success-msg" id="success-msg">
            {t("confirmed.expired_before")}
            <a href="/smiq" style={{ color: "var(--accent)" }}>
              {t("confirmed.expired_link")}
            </a>
            {t("confirmed.expired_after")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" id="main-card">
      <div id="success-screen">
        <div className="axe-heading" id="success-heading">
          {t("confirmed.success_heading")}
        </div>
        <p className="success-msg" id="success-msg">
          {t("confirmed.success_body")}
        </p>
      </div>
    </div>
  );
}
