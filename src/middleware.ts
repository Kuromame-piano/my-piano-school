import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth";

export async function middleware(request: NextRequest) {
    const session = request.cookies.get("session")?.value;

    // Public paths that don't require authentication
    const publicPaths = ["/login", "/manifest.json", "/icons", "/robots.txt", "/sitemap.xml"];
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path)) ||
        request.nextUrl.pathname.startsWith("/_next") ||
        request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|ico|svg)$/);

    if (isPublicPath) {
        return NextResponse.next();
    }

    // Check if session exists and is valid
    if (!session) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
        const payload = await decrypt(session);
        if (!payload) {
            // Invalid session
            const response = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.delete("session");
            return response;
        }
    } catch (error) {
        // Session verification failed
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("session");
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
