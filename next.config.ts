import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Backward compat for the pre-rename "smiq" URLs — protects any
  // already-sent confirmation email (/smiq/confirm?token=...) or bookmark.
  // Next preserves query strings on redirect automatically, so ?token=...
  // and ?expired=1 survive without any source/has capture-group setup.
  async redirects() {
    return [
      { source: "/smiq", destination: "/intelligence", permanent: false },
      { source: "/smiq/confirm", destination: "/intelligence/confirm", permanent: false },
      { source: "/smiq/confirmed", destination: "/intelligence/confirmed", permanent: false },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
