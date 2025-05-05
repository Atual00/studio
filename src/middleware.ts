
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // --- THIS MIDDLEWARE IS CURRENTLY DISABLED ---
  // The redirection logic has been moved to AuthProvider for client-side handling
  // because middleware runs on the edge and doesn't easily share client-side state (like localStorage).
  // Keep this file if you plan to implement server-side auth checks later (e.g., using cookies/sessions).

  /*
  const isAuthenticated = request.cookies.get('auth_token')?.value; // Example: Check for auth cookie
  const { pathname } = request.nextUrl;

  const publicPaths = ['/login']; // Define public paths

  // Redirect to login if not authenticated and trying to access a protected page
  if (!isAuthenticated && !publicPaths.includes(pathname)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if authenticated and trying to access login page
  if (isAuthenticated && pathname === '/login') {
    const dashboardUrl = new URL('/', request.url); // Redirect to dashboard
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next(); // Allow the request to proceed
  */

   return NextResponse.next(); // Currently bypasses auth checks
}

// See "Matching Paths" below to learn more
export const config = {
  // Match all paths except for static files, api routes, and _next internal routes
  // Adjust this matcher if your auth logic changes
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
