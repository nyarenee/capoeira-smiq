"use client";

import { useCallback, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { submitResponse } from "./actions";
import TurnstileWidget, { type TurnstileWidgetHandle } from "./TurnstileWidget";

// ── Segment data — codes + icons; copy comes from messages/*.json ─────────────

const SEGMENTS = [
  { key: "curious", icon: "🌱" },
  { key: "student", icon: "🎵" },
  { key: "practitioner", icon: "🌀" },
  { key: "teacher", icon: "🪘" },
  { key: "lapsed", icon: "🌙" },
] as const;

// ── Teacher detail options ────────────────────────────────────────────────────

const TEACHING_ROLES = [
  { value: "classes", tkey: "role_classes" },
  { value: "own-school", tkey: "role_own" },
  { value: "admin", tkey: "role_admin" },
  { value: "online", tkey: "role_online" },
];

const GRADUATION_LEVELS = [
  { value: "monitor", tkey: "grad_monitor", hasSub: false },
  { value: "professor", tkey: "grad_professor", hasSub: false },
  { value: "contra-mestre", tkey: "grad_contra", hasSub: false },
  { value: "mestre", tkey: "grad_mestre", hasSub: true },
  { value: "grao-mestre", tkey: "grad_grao", hasSub: true },
  { value: "ungraded", tkey: "grad_ungraded", hasSub: true },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3 | "pending";

type FormState = {
  step: Step;
  segment: string | null;
  smiqAnswer: string;
  teachingRole: string | null;
  graduationLevel: string | null;
  name: string;
  email: string;
  pendingEmail: string;
  turnstileToken: string | null;
};

// ── Step dots ─────────────────────────────────────────────────────────────────

function StepDots({ step, isTeacher }: { step: Step; isTeacher: boolean }) {
  const currentIndex = typeof step === "number" ? step : 0;

  function dotClass(i: number) {
    if (i === currentIndex) return "dot dot-active";
    if (i < currentIndex) return "dot dot-completed";
    return "dot dot-inactive";
  }

  return (
    <div className="step-dots" id="step-dots">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          id={i === 2 ? "teacher-dot" : undefined}
          className={dotClass(i)}
          data-dot={i}
          style={i === 2 && !isTeacher ? { display: "none" } : undefined}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SmiqForm() {
  const t = useTranslations();
  const locale = useLocale();
  const [state, setState] = useState<FormState>({
    step: 0,
    segment: null,
    smiqAnswer: "",
    teachingRole: null,
    graduationLevel: null,
    name: "",
    email: "",
    pendingEmail: "",
    turnstileToken: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const handleTurnstileToken = useCallback((token: string | null) => {
    setState((prev) => ({ ...prev, turnstileToken: token }));
  }, []);

  const isTeacher = state.segment === "teacher";
  const rawSegment = SEGMENTS.find((s) => s.key === state.segment) ?? null;

  function setStep(step: Step) {
    setState((prev) => ({ ...prev, step }));
    setError(null);
  }

  function goNext() {
    const next = (state.step as number) + 1;
    setStep((next === 2 && !isTeacher ? 3 : next) as Step);
  }

  function goBack() {
    const prev = (state.step as number) - 1;
    setStep((prev === 2 && !isTeacher ? 1 : prev) as Step);
  }

  function selectSegment(key: string) {
    setState((prev) => ({ ...prev, segment: key, step: 1 }));
    setError(null);
  }

  async function handleSubmit() {
    if (!state.segment || !rawSegment) return;

    const trimmedName = state.name.trim();
    const trimmedEmail = state.email.trim();

    if (!trimmedName || !trimmedEmail) {
      setError("Please enter your name and email address.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await submitResponse({
      segment: state.segment,
      smiqAnswer: state.smiqAnswer,
      teachingRole: isTeacher ? state.teachingRole : null,
      graduationLevel: isTeacher ? state.graduationLevel : null,
      name: trimmedName,
      email: trimmedEmail,
      lang: locale,
      turnstileToken: state.turnstileToken ?? "",
    });

    if (result.ok) {
      setState((prev) => ({ ...prev, pendingEmail: result.pendingEmail }));
      setStep("pending");
    } else {
      setError(result.error);
      // The token is either already consumed by the failed verify call or
      // now stale — reset so the user can get a fresh one without reloading.
      turnstileRef.current?.reset();
      setState((prev) => ({ ...prev, turnstileToken: null }));
    }
    setSubmitting(false);
  }

  // ── Check inbox screen ─────────────────────────────────────────────────────

  if (state.step === "pending") {
    return (
      <div className="card" id="main-card">
        <div id="success-screen">
          <div className="axe-heading" id="success-heading">
            {t("form_pending.heading")}
          </div>
          <p className="success-msg" id="success-msg">
            {t("form_pending.body_before")}
            <strong>{state.pendingEmail}</strong>
            {t("form_pending.body_after")}
          </p>
          <div className="segment-badge" id="success-badge">
            <span>{rawSegment?.icon}</span>
            <span>{rawSegment ? t(`form_segments.${rawSegment.key}_label`) : ""}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" id="main-card">
      <StepDots step={state.step} isTeacher={isTeacher} />

      {/* ── STEP 0 ── Segment picker ──────────────────────────────────────── */}
      {state.step === 0 && (
        <div key="step-0" className="step" id="step-0">
          <span className="eyebrow">{t("form_step0.eyebrow")}</span>
          <h1>{t("form_step0.h1")}</h1>
          <p className="subtitle">{t("form_step0.subtitle")}</p>

          <div className="segment-grid" id="segment-grid">
            {SEGMENTS.map((seg) => (
              <button
                key={seg.key}
                className={`segment-card${seg.key === "lapsed" ? " segment-card--lapsed" : ""}${state.segment === seg.key ? " selected" : ""}`}
                data-segment={seg.key}
                onClick={() => selectSegment(seg.key)}
                type="button"
              >
                <span className="seg-icon">{seg.icon}</span>
                <span className="seg-name">{t(`form_segments.${seg.key}_label`)}</span>
                <span className="seg-desc">{t(`form_segments.${seg.key}_desc`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 1 ── SMIQ open text ──────────────────────────────────────── */}
      {state.step === 1 && rawSegment && (
        <div key="step-1" className="step" id="step-1">
          <span className="eyebrow" id="smiq-eyebrow">{t("form_step1.eyebrow")}</span>
          <p className="smiq-label" id="smiq-question">
            {t(`form_segments.${rawSegment.key}_question`)}
          </p>
          <textarea
            id="smiq-answer"
            rows={5}
            minLength={10}
            placeholder={t(`form_segments.${rawSegment.key}_placeholder`)}
            value={state.smiqAnswer}
            onChange={(e) =>
              setState((prev) => ({ ...prev, smiqAnswer: e.target.value }))
            }
            autoFocus
          />
          <p className="char-hint">{t("form_step1.hint")}</p>
          <div className="btn-row">
            <button
              className="btn btn-ghost"
              id="back-from-smiq"
              onClick={goBack}
              type="button"
            >
              {t("common.back")}
            </button>
            <button
              className="btn btn-primary"
              id="next-from-smiq"
              onClick={goNext}
              disabled={state.smiqAnswer.trim().length < 10}
              type="button"
            >
              {t("common.continue")}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── Teacher detail ──────────────────────────────────────── */}
      {state.step === 2 && (
        <div key="step-2" className="step" id="step-2">
          <span className="eyebrow">{t("form_step2.eyebrow")}</span>
          <h2>{t("form_step2.h2")}</h2>
          <p className="subtitle">{t("form_step2.subtitle")}</p>

          <div className="detail-section">
            <span className="detail-label">{t("form_step2.teaching_label")}</span>
            <div className="role-grid" id="role-grid">
              {TEACHING_ROLES.map((opt) => (
                <button
                  key={opt.value}
                  className={`choice-card${state.teachingRole === opt.value ? " selected" : ""}`}
                  data-role={opt.value}
                  type="button"
                  onClick={() =>
                    setState((prev) => ({ ...prev, teachingRole: opt.value }))
                  }
                >
                  <span className="choice-name">{t(`form_step2.${opt.tkey}_label`)}</span>
                  <span className="choice-sub">{t(`form_step2.${opt.tkey}_sub`)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <span className="detail-label">{t("form_step2.graduation_label")}</span>
            <div className="grad-grid" id="grad-grid">
              {GRADUATION_LEVELS.map((opt) => (
                <button
                  key={opt.value}
                  className={`choice-card${state.graduationLevel === opt.value ? " selected" : ""}`}
                  data-grad={opt.value}
                  type="button"
                  onClick={() =>
                    setState((prev) => ({ ...prev, graduationLevel: opt.value }))
                  }
                >
                  <span className="choice-name">{t(`form_step2.${opt.tkey}_label`)}</span>
                  {opt.hasSub && (
                    <span className="choice-sub">{t(`form_step2.${opt.tkey}_sub`)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="btn-row">
            <button
              className="btn btn-ghost"
              id="back-from-teacher"
              onClick={goBack}
              type="button"
            >
              {t("common.back")}
            </button>
            <button
              className="btn btn-primary"
              id="next-from-teacher"
              onClick={goNext}
              disabled={!state.teachingRole || !state.graduationLevel}
              type="button"
            >
              {t("common.continue")}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── Email capture ───────────────────────────────────────── */}
      {state.step === 3 && (
        <div key="step-3" className="step" id="step-3">
          <span className="eyebrow">{t("form_step3.eyebrow")}</span>
          <h1>{t("form_step3.h1")}</h1>
          <p className="subtitle">{t("form_step3.subtitle")}</p>
          <hr className="rule" />

          <div className="input-group">
            <label className="field-label" htmlFor="name-input">
              {t("form_step3.name_label")}
            </label>
            <input
              type="text"
              id="name-input"
              placeholder={t("form_step3.name_placeholder")}
              value={state.name}
              onChange={(e) =>
                setState((prev) => ({ ...prev, name: e.target.value }))
              }
              autoFocus
              autoComplete="given-name"
            />
          </div>

          <div className="input-group">
            <label className="field-label" htmlFor="email-input">
              {t("form_step3.email_label")}
            </label>
            <input
              type="email"
              id="email-input"
              placeholder={t("form_step3.email_placeholder")}
              value={state.email}
              onChange={(e) =>
                setState((prev) => ({ ...prev, email: e.target.value }))
              }
              autoComplete="email"
            />
          </div>

          <TurnstileWidget ref={turnstileRef} onToken={handleTurnstileToken} />

          <div className="btn-row">
            <button
              className="btn btn-ghost"
              id="back-from-email"
              onClick={goBack}
              type="button"
            >
              {t("common.back")}
            </button>
            <button
              className={`btn btn-primary${submitting ? " loading" : ""}`}
              id="submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !state.name.trim() || !state.email.trim() || !state.turnstileToken}
              type="button"
            >
              <span className="btn-text">{t("common.submit")}</span>
              <span className="spinner" />
            </button>
          </div>
          {error && (
            <div className="error-msg" id="submit-error">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
