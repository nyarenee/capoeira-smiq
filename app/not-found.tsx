import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <nav>
        <Link href="/" className="nav-logo">
          Capoeira International
        </Link>
      </nav>
      <main className="smiq-page">
        <div className="card" id="main-card">
          <div id="success-screen">
            <div className="axe-heading" id="success-heading">
              Page not found
            </div>
            <p className="success-msg" id="success-msg">
              This page doesn&apos;t exist, or the link may be broken. Let&apos;s get you back on
              track.
            </p>
            <div className="btn-row">
              <Link href="/" className="btn btn-primary">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
