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

  // Role-based route guards
  try {
    // Decode JWT to get user role (simple base64 decode of payload)
    const payload = token.split('.')[1];
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
    const userRole = decodedPayload.role?.toLowerCase();

    // Protect doctor-only routes
    if (path.startsWith('/dashboard/doctor') && userRole !== 'doctor' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Protect patient-only routes
    if (path.startsWith('/dashboard/patient') && userRole !== 'patient' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Admin can access everything, so no restriction needed
  } catch (error) {
    // If token decode fails, redirect to login
    console.error('Token decode error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Token exists and role checks passed, allow the request
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