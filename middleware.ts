import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Login-forced guard. Optimistic, cookie-only check (edge-safe — no DB access).
 * Real session validation happens in server code that reads the session.
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const sessionCookie = getSessionCookie(request);

    // Already authenticated users shouldn't see the auth screens.
    if (sessionCookie && (pathname === "/login" || pathname === "/signup")) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (!sessionCookie) {
        const url = new URL("/login", request.url);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    // Guard everything except auth API, the auth screens, and static assets.
    matcher: [
        "/((?!api/auth|login|signup|_next/static|_next/image|favicon.ico|vector.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
