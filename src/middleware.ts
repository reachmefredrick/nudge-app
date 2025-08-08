import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // This is a simplified middleware - in a real app, you'd verify the JWT token
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register"];

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // For now, we'll just allow all routes since we're using localStorage
  // In a real app, you'd check for a valid JWT token in cookies or headers
  if (!isPublicRoute && pathname !== "/") {
    // You could redirect to login if no valid token is found
    // return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
