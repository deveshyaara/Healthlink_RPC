import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /dashboard, /login)
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/'];
  const isPublicPath = publicPaths.includes(path);

  // If accessing a public path, allow the request
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For protected paths, check if user is authenticated
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    // Redirect to login if no token
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Token exists, allow the request
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