"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Script from "next/script";

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type TurnstileOptions = {
  sitekey: string;
  action: string;
  theme: "light" | "dark" | "auto";
  appearance: "always" | "execute" | "interaction-only";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  { onToken: (token: string | null) => void }
>(function TurnstileWidget({ onToken }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current) {
        window.turnstile?.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    function renderWidget() {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        action: "submit_smiq",
        theme: "light",
        appearance: "interaction-only",
        callback: (token) => onToken(token),
        "expired-callback": () => {
          onToken(null);
          if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
        },
        "error-callback": () => {
          onToken(null);
        },
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      window.onTurnstileLoad = renderWidget;
    }

    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onToken]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit"
        strategy="afterInteractive"
      />
      <div ref={containerRef} />
    </>
  );
});

export default TurnstileWidget;
