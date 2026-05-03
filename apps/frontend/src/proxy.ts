import { NextResponse, type NextRequest } from "next/server";

const EMPLOYEE_PORTAL_HOST = "app.pailoshoes.com";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (host === EMPLOYEE_PORTAL_HOST && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/portal", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};