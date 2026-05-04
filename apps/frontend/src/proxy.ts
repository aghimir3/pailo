import { NextResponse, type NextRequest } from "next/server";

const EMPLOYEE_PORTAL_HOST = "app.pailoshoes.com";
const PUBLIC_HOSTS = new Set(["pailoshoes.com", "www.pailoshoes.com"]);

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (host === EMPLOYEE_PORTAL_HOST && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/dashboard", request.url));
  }

  if (host && PUBLIC_HOSTS.has(host) && request.nextUrl.pathname === "/dashboard") {
    return NextResponse.redirect(new URL("https://app.pailoshoes.com"));
  }

  const response = NextResponse.next();

  // Revalidate HTML on every navigation — fast 304 if unchanged, fresh content after deploy
  response.headers.set("Cache-Control", "private, no-cache");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|landing/).*)"],
};