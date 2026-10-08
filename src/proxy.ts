import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: send visitors without a session cookie to the login page.
 * The session itself is verified in the admin layout and in every Server Action (requireAdmin()).
 *
 * This deliberately does NOT call Auth.js here: its wrapper re-issues the session cookie on every
 * request, which could race with sign-out and keep a user logged in.
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSession) return NextResponse.redirect(new URL("/admin/login", req.nextUrl.origin));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
