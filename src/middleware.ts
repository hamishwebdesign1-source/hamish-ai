import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getExpectedAdminCookieValue } from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const expected = await getExpectedAdminCookieValue();
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (!expected || cookie !== expected) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/internal/:path*"],
};
