"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { LANGUAGES } from "@/lib/reference-data";
import { setLocale } from "./locale-actions";

type LangCode = (typeof LANGUAGES)[number]["code"];

// ── Flags ──────────────────────────────────────────────────────────────────
// Decorative only — not part of the shared locale registry in lib/reference-data.ts.
const FLAGS: Record<LangCode, string> = {
  en: "🇬🇧",
  pt: "🇧🇷",
  es: "🇪🇸",
  fr: "🇫🇷",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function LangSwitcher() {
  const current = useLocale() as LangCode;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function select(code: LangCode) {
    setOpen(false);
    if (code === current) return;
    startTransition(async () => {
      await setLocale(code);
      router.refresh();
    });
  }

  const active = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  return (
    <div className={`lang-switcher${open ? " lang-switcher--open" : ""}`} ref={wrapRef}>
      {/* ── Trigger ── */}
      <button
        type="button"
        className="lang-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        disabled={isPending}
      >
        <span className="lang-icon" aria-hidden="true">
          {FLAGS[active.code]}
        </span>
        <span className="lang-label">{active.label}</span>
        <span className="lang-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {/* ── Dropdown (always rendered, shown via CSS transition) ── */}
      <ul className="lang-dropdown" role="listbox" aria-label="Language">
        {LANGUAGES.map((lang) => {
          const isActive = lang.code === current;
          return (
            <li
              key={lang.code}
              role="option"
              aria-selected={isActive}
              className={`lang-option${isActive ? " lang-option--active" : ""}`}
              onClick={() => select(lang.code)}
            >
              <span aria-hidden="true">{FLAGS[lang.code]}</span>
              <span className="lang-option-code">{lang.code.toUpperCase()}</span>
              <span className="lang-option-name">{lang.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
