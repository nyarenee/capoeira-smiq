"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
            <div className="axe-heading axe-heading--error" id="success-heading">
              Something went wrong
            </div>
            <p className="success-msg" id="success-msg">
              We hit an unexpected error on our end. Please try again — if it keeps happening, come
              back in a little while.
            </p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => reset()}>
                Try again
              </button>
              <Link href="/" className="btn btn-ghost">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
