import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/cart", "/checkout", "/orders", "/messages", "/wishlist", "/settings", "/seller"];
const adminRoutes = ["/admin"];
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("smartshop_access")?.value;
  const refreshToken = request.cookies.get("smartshop_refresh")?.value;
  const hasSession = Boolean(accessToken || refreshToken);

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAdmin = adminRoutes.some((route) => pathname.startsWith(route));
  const isAuth = authRoutes.some((route) => pathname.startsWith(route));

  if ((isProtected || isAdmin) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Do not redirect authenticated users away from auth pages purely based on cookie presence.
  // Email verification enforcement must be done by server-side session resolution (emailVerified) and/or
  // the auth pages themselves, otherwise unverified users get bounced to protected areas.

  const response = NextResponse.next();
  const isDevelopment = process.env.NODE_ENV === "development";
  const imgSrcDirective = isDevelopment
    ? "img-src 'self' data: blob: https: http://localhost:9000 http://127.0.0.1:9000;"
    : "img-src 'self' data: blob: https:;";

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ${imgSrcDirective} font-src 'self' data:; connect-src 'self' https:;`
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
