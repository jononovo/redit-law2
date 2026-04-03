import { NextRequest, NextResponse } from "next/server";

const DEFAULT_TENANT = "creditclaw";

const TENANT_DOMAINS: [string, string[]][] = [
  ["creditclaw", ["creditclaw.com"]],
  ["shopy", ["shopy.sh"]],
];

function resolveTenantId(hostname: string): string {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");

  for (const [tenantId, domains] of TENANT_DOMAINS) {
    for (const domain of domains) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
      if (
        normalizedHost === normalizedDomain ||
        normalizedHost.endsWith("." + normalizedDomain)
      ) {
        return tenantId;
      }
    }
  }

  return DEFAULT_TENANT;
}

export function middleware(request: NextRequest) {
  const hostname =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  const urlTenantParam = request.nextUrl.searchParams.get("tenant");
  const cookieTenant = request.cookies.get("tenant-id")?.value;

  const tenantId =
    urlTenantParam ||
    process.env.TENANT_OVERRIDE ||
    cookieTenant ||
    resolveTenantId(hostname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenantId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.cookies.set("tenant-id", tenantId, {
    path: "/",
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
