import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  console.log('🔒 Middleware check:', { pathname, hasToken: !!token })

  // Check if user is authenticated
  const isAuthenticated = token ? verifyToken(token) !== null : false
  console.log('👤 Authenticated:', isAuthenticated)

  // Public routes (login, register)
  const isPublicRoute = pathname === '/login' || pathname === '/' || pathname.startsWith('/_next')

  // Protected routes (dashboard, settings)
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/settings')

  // Redirect logic
  if (isAuthenticated && isPublicRoute && pathname !== '/' && !pathname.startsWith('/_next')) {
    // If logged in and trying to access login/register, redirect to dashboard
    console.log('↪️ Redirecting authenticated user to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isAuthenticated && isProtectedRoute) {
    // If not logged in and trying to access protected route, redirect to login
    console.log('↪️ Redirecting unauthenticated user to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Root redirect
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
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
}
