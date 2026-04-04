"use client";

import Script from "next/script";
import { useTenant } from "./tenant-context";

export function TenantAnalytics() {
  const tenant = useTenant();

  if (!tenant.tracking?.gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${tenant.tracking.gaId}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${tenant.tracking.gaId}');
        `}
      </Script>
    </>
  );
}
