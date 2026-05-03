import { NextResponse, type NextRequest } from "next/server";

const EMPLOYEE_PORTAL_HOST = "app.pailoshoes.com";
const PUBLIC_HOSTS = new Set(["pailoshoes.com", "www.pailoshoes.com"]);

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (host === EMPLOYEE_PORTAL_HOST && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/portal", request.url));
  }

  if (host && PUBLIC_HOSTS.has(host) && request.nextUrl.pathname === "/portal") {
    return NextResponse.redirect(new URL("https://app.pailoshoes.com"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/portal"],
};