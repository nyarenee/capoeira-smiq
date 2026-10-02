import { getTranslations } from "next-intl/server";
import LangSwitcher from "./components/LangSwitcher";

export default async function Home() {
  const t = await getTranslations();
  const em = (chunks: React.ReactNode) => <em>{chunks}</em>;

  return (
    <div className="page">
      {/* Nav */}
      <nav>
        <a href="#" className="nav-logo">
          {t("nav.logo")}
        </a>
        <div className="nav-end">
          <a href="/smiq" className="nav-cta">
            {t("nav.cta")}
          </a>
          <LangSwitcher />
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-center">
          <div className="hero-eyebrow">{t("hero.eyebrow")}</div>
          <h1>
            <span>{t("hero.h1_line1")}</span>
            <br />
            <em>{t("hero.h1_line2")}</em>
            <br />
            <span>{t("hero.h1_line3")}</span>
          </h1>
          <p className="hero-sub">{t("hero.body1")}</p>
          <p className="hero-sub">{t("hero.body2")}</p>
          <a href="/smiq" className="hero-cta">
            <span>{t("hero.cta")}</span>
            <span className="arrow">→</span>
          </a>
          <p className="hero-note">{t("hero.note")}</p>
        </div>
        <div className="scroll-hint">{t("hero.scroll")}</div>
      </section>

      <div className="divider" />

      {/* Who We Are */}
      <section className="section">
        <span className="section-eyebrow">{t("who_we_are.eyebrow")}</span>
        <h2>{t.rich("who_we_are.h2", { em })}</h2>
        <p>{t("who_we_are.body1")}</p>
        <p>
          <span>{t("who_we_are.body2_plain")}</span> <strong>{t("who_we_are.body2_strong")}</strong>{" "}
          <span>{t("who_we_are.body2_tail")}</span>
        </p>

        <div className="pillars">
          <div className="pillar">
            <span className="pillar-icon">🌍</span>
            <span className="pillar-title">{t("pillars.global_reach_title")}</span>
            <p className="pillar-text">{t("pillars.global_reach_text")}</p>
          </div>
          <div className="pillar">
            <span className="pillar-icon">🤝</span>
            <span className="pillar-title">{t("pillars.no_agenda_title")}</span>
            <p className="pillar-text">{t("pillars.no_agenda_text")}</p>
          </div>
          <div className="pillar">
            <span className="pillar-icon">🥋</span>
            <span className="pillar-title">{t("pillars.all_levels_title")}</span>
            <p className="pillar-text">{t("pillars.all_levels_text")}</p>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Who This Is For */}
      <section className="segments-section">
        <div className="segments-inner">
          <span className="section-eyebrow">{t("who_this_is_for.eyebrow")}</span>
          <h2>{t.rich("who_this_is_for.h2", { em })}</h2>
          <p className="lead">{t("who_this_is_for.body1")}</p>
          <p className="lead">{t("who_this_is_for.body2")}</p>

          <div className="seg-list">
            <div className="seg-item">
              <span className="icon">🌱</span>
              <span className="name">{t("landing_segments.newbie_name")}</span>
              <span className="desc">{t("landing_segments.newbie_desc")}</span>
            </div>
            <div className="seg-item">
              <span className="icon">🎵</span>
              <span className="name">{t("landing_segments.student_name")}</span>
              <span className="desc">{t("landing_segments.student_desc")}</span>
            </div>
            <div className="seg-item">
              <span className="icon">🌀</span>
              <span className="name">{t("landing_segments.pro_name")}</span>
              <span className="desc">{t("landing_segments.pro_desc")}</span>
            </div>
            <div className="seg-item">
              <span className="icon">🪘</span>
              <span className="name">{t("landing_segments.expert_name")}</span>
              <span className="desc">{t("landing_segments.expert_desc")}</span>
            </div>
            <div className="seg-item">
              <span className="icon">🌙</span>
              <span className="name">{t("landing_segments.left_name")}</span>
              <span className="desc">{t("landing_segments.left_desc")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why We're Asking */}
      <section className="why-section">
        <span
          className="section-eyebrow"
          style={{ display: "block", textAlign: "center", marginBottom: "20px" }}
        >
          {t("why_asking.eyebrow")}
        </span>
        <h2>{t.rich("why_asking.h2", { em })}</h2>
        <p>{t("why_asking.body1")}</p>
        <p>
          <strong>{t("why_asking.body2_strong")}</strong> <span>{t("why_asking.body2_rest")}</span>
        </p>

        <ul className="promise-list">
          <li>{t("why_asking.promise1")}</li>
          <li>{t("why_asking.promise2")}</li>
          <li>{t("why_asking.promise3")}</li>
        </ul>
      </section>

      <div className="divider" />

      {/* Final CTA */}
      <section className="final-cta">
        <h2>
          <span>{t("final_cta.h2_line1")}</span>
          <br />
          <em>{t("final_cta.h2_line2")}</em>
        </h2>
        <p>{t("final_cta.body")}</p>
        <a href="/smiq" className="hero-cta">
          <span>{t("final_cta.cta")}</span>
          <span className="arrow">→</span>
        </a>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-logo">{t("footer.logo")}</div>
        <div className="footer-note">{t("footer.tagline")}</div>
      </footer>
    </div>
  );
}
const x = 1;
