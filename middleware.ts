import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get("session");
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/home/:path*", "/moodboard/:path*", "/projects/:path*"],
};

